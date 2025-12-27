-- PrepVerse Practice Mode Database Schema Extension
-- Run this AFTER database_schema.sql in Supabase SQL Editor

-- ============================================================================
-- QUESTIONS TABLE: Cache generated questions for reuse
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT UNIQUE,  -- For idempotent generation (hash of question content)
  question TEXT NOT NULL,
  options JSONB NOT NULL,  -- Array of 4 options
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  class_level INTEGER NOT NULL CHECK (class_level IN (10, 12)),
  question_type TEXT DEFAULT 'mcq',
  time_estimate_seconds INTEGER DEFAULT 60,
  concept_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  source TEXT DEFAULT 'gemini',  -- 'gemini', 'manual', 'curriculum'
  times_used INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON questions(subject, topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_class_level ON questions(class_level);
CREATE INDEX IF NOT EXISTS idx_questions_concept_tags ON questions USING GIN(concept_tags);

-- ============================================================================
-- PRACTICE SESSIONS: Track practice session metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT,  -- NULL means mixed topics
  difficulty TEXT,  -- NULL means adaptive difficulty
  class_level INTEGER NOT NULL CHECK (class_level IN (10, 12)),
  question_count INTEGER NOT NULL DEFAULT 10,
  time_limit_seconds INTEGER,  -- NULL means no time limit
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Summary stats (populated when session ends)
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  total_time_seconds INTEGER,
  avg_time_per_question NUMERIC,
  score_percentage NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_subject ON practice_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_started_at ON practice_sessions(started_at);

-- ============================================================================
-- PRACTICE SESSION QUESTIONS: Questions assigned to a session
-- ============================================================================
CREATE TABLE IF NOT EXISTS practice_session_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL,  -- Order in which question appears
  difficulty TEXT NOT NULL,  -- Difficulty at time of selection (for adaptive tracking)

  -- Answer tracking
  user_answer TEXT,
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  answered_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(session_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_psq_session_id ON practice_session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_psq_question_id ON practice_session_questions(question_id);

-- ============================================================================
-- CONCEPT SCORES: Per-concept mastery tracking for adaptive difficulty
-- ============================================================================
CREATE TABLE IF NOT EXISTS concept_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT DEFAULT '',
  concept_tag TEXT DEFAULT '',  -- Specific concept within topic

  -- Mastery metrics
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  mastery_score NUMERIC DEFAULT 0.0,  -- 0-100 score
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,

  -- Difficulty tracking
  easy_attempts INTEGER DEFAULT 0,
  easy_correct INTEGER DEFAULT 0,
  medium_attempts INTEGER DEFAULT 0,
  medium_correct INTEGER DEFAULT 0,
  hard_attempts INTEGER DEFAULT 0,
  hard_correct INTEGER DEFAULT 0,

  -- Recommended difficulty (computed)
  recommended_difficulty TEXT DEFAULT 'easy' CHECK (recommended_difficulty IN ('easy', 'medium', 'hard')),

  -- Time tracking
  avg_time_seconds NUMERIC,
  last_practiced_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Use a unique index instead of UNIQUE constraint for columns with defaults
CREATE UNIQUE INDEX IF NOT EXISTS idx_concept_scores_unique
  ON concept_scores(user_id, subject, topic, subtopic, concept_tag);

CREATE INDEX IF NOT EXISTS idx_concept_scores_user_id ON concept_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_scores_subject_topic ON concept_scores(subject, topic);
CREATE INDEX IF NOT EXISTS idx_concept_scores_mastery ON concept_scores(mastery_score);

-- ============================================================================
-- CURRICULUM TOPICS: Available topics for practice
-- ============================================================================
CREATE TABLE IF NOT EXISTS curriculum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_level INTEGER NOT NULL CHECK (class_level IN (10, 12)),
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopics TEXT[] DEFAULT ARRAY[]::TEXT[],
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,  -- Icon name for UI
  question_count INTEGER DEFAULT 0,  -- Cached count of available questions
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(class_level, subject, topic)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_class_subject ON curriculum_topics(class_level, subject);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Questions table: Read for authenticated, write for service role
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read questions
CREATE POLICY "questions_select_authenticated"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access (for backend to insert/update)
CREATE POLICY "questions_all_service"
  ON questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Practice sessions: Users can only access their own
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "practice_sessions_select_own"
  ON practice_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "practice_sessions_insert_own"
  ON practice_sessions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "practice_sessions_update_own"
  ON practice_sessions FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Service role full access for backend
CREATE POLICY "practice_sessions_all_service"
  ON practice_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Practice session questions: Users can only access their own
ALTER TABLE practice_session_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psq_select_own"
  ON practice_session_questions FOR SELECT
  USING (session_id IN (
    SELECT id FROM practice_sessions
    WHERE user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text)
  ));

CREATE POLICY "psq_insert_own"
  ON practice_session_questions FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM practice_sessions
    WHERE user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text)
  ));

CREATE POLICY "psq_update_own"
  ON practice_session_questions FOR UPDATE
  USING (session_id IN (
    SELECT id FROM practice_sessions
    WHERE user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text)
  ));

-- Service role full access for backend
CREATE POLICY "psq_all_service"
  ON practice_session_questions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Concept scores: Users can only access their own
ALTER TABLE concept_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "concept_scores_select_own"
  ON concept_scores FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "concept_scores_insert_own"
  ON concept_scores FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "concept_scores_update_own"
  ON concept_scores FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Service role full access for backend
CREATE POLICY "concept_scores_all_service"
  ON concept_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Curriculum topics: Read-only for authenticated users
ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "curriculum_topics_select_authenticated"
  ON curriculum_topics FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access for backend/admin
CREATE POLICY "curriculum_topics_all_service"
  ON curriculum_topics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_concept_scores_updated_at ON concept_scores;
CREATE TRIGGER update_concept_scores_updated_at
  BEFORE UPDATE ON concept_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate recommended difficulty based on mastery
CREATE OR REPLACE FUNCTION calculate_recommended_difficulty(
  p_mastery_score NUMERIC,
  p_easy_correct NUMERIC,
  p_easy_total NUMERIC,
  p_medium_correct NUMERIC,
  p_medium_total NUMERIC
) RETURNS TEXT AS $$
BEGIN
  -- If mastery < 40% or easy accuracy < 60%, recommend easy
  IF p_mastery_score < 40 OR (p_easy_total > 0 AND (p_easy_correct / p_easy_total) < 0.6) THEN
    RETURN 'easy';
  -- If mastery >= 70% and medium accuracy >= 70%, recommend hard
  ELSIF p_mastery_score >= 70 AND (p_medium_total > 2 AND (p_medium_correct / p_medium_total) >= 0.7) THEN
    RETURN 'hard';
  -- Otherwise recommend medium
  ELSE
    RETURN 'medium';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update mastery score after an attempt
CREATE OR REPLACE FUNCTION update_mastery_score() RETURNS TRIGGER AS $$
DECLARE
  accuracy NUMERIC;
  streak_bonus NUMERIC;
BEGIN
  -- Calculate overall accuracy
  IF NEW.total_attempts > 0 THEN
    accuracy := (NEW.correct_attempts::NUMERIC / NEW.total_attempts) * 100;
  ELSE
    accuracy := 0;
  END IF;

  -- Streak bonus (max 10 points)
  streak_bonus := LEAST(NEW.current_streak * 2, 10);

  -- Weighted mastery score (accuracy + streak bonus, capped at 100)
  NEW.mastery_score := LEAST(accuracy + streak_bonus, 100);

  -- Update recommended difficulty
  NEW.recommended_difficulty := calculate_recommended_difficulty(
    NEW.mastery_score,
    NEW.easy_correct,
    NEW.easy_attempts,
    NEW.medium_correct,
    NEW.medium_attempts
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mastery ON concept_scores;
CREATE TRIGGER trigger_update_mastery
  BEFORE UPDATE ON concept_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_mastery_score();

-- ============================================================================
-- INITIAL CURRICULUM DATA
-- ============================================================================

-- Class 10 Mathematics Topics
INSERT INTO curriculum_topics (class_level, subject, topic, display_name, description, subtopics, display_order) VALUES
(10, 'mathematics', 'algebra', 'Algebra', 'Polynomials, quadratic equations, arithmetic progressions',
 ARRAY['polynomials', 'quadratic_equations', 'arithmetic_progression', 'linear_equations'], 1),
(10, 'mathematics', 'geometry', 'Geometry', 'Triangles, circles, coordinate geometry',
 ARRAY['triangles', 'circles', 'coordinate_geometry', 'constructions'], 2),
(10, 'mathematics', 'trigonometry', 'Trigonometry', 'Trigonometric ratios, identities, applications',
 ARRAY['trigonometric_ratios', 'trigonometric_identities', 'heights_and_distances'], 3),
(10, 'mathematics', 'statistics', 'Statistics & Probability', 'Mean, median, mode, probability',
 ARRAY['statistics', 'probability'], 4),
(10, 'mathematics', 'mensuration', 'Mensuration', 'Areas and volumes of solids',
 ARRAY['surface_areas', 'volumes'], 5)
ON CONFLICT (class_level, subject, topic) DO NOTHING;

-- Class 10 Science Topics
INSERT INTO curriculum_topics (class_level, subject, topic, display_name, description, subtopics, display_order) VALUES
(10, 'physics', 'light', 'Light - Reflection & Refraction', 'Mirrors, lenses, human eye',
 ARRAY['reflection', 'refraction', 'mirrors', 'lenses', 'human_eye'], 1),
(10, 'physics', 'electricity', 'Electricity', 'Current, resistance, circuits, power',
 ARRAY['ohms_law', 'circuits', 'power', 'heating_effect'], 2),
(10, 'physics', 'magnetic_effects', 'Magnetic Effects of Current', 'Electromagnets, motors, generators',
 ARRAY['magnetic_field', 'electromagnet', 'motor', 'generator'], 3),
(10, 'chemistry', 'chemical_reactions', 'Chemical Reactions', 'Types of reactions, balancing equations',
 ARRAY['types_of_reactions', 'balancing', 'redox'], 1),
(10, 'chemistry', 'acids_bases', 'Acids, Bases & Salts', 'pH, indicators, neutralization',
 ARRAY['acids', 'bases', 'salts', 'ph', 'indicators'], 2),
(10, 'chemistry', 'metals_nonmetals', 'Metals & Non-metals', 'Properties, reactivity series, extraction',
 ARRAY['properties', 'reactivity_series', 'extraction'], 3),
(10, 'chemistry', 'carbon_compounds', 'Carbon Compounds', 'Organic chemistry basics, polymers',
 ARRAY['hydrocarbons', 'functional_groups', 'polymers'], 4),
(10, 'biology', 'life_processes', 'Life Processes', 'Nutrition, respiration, transportation, excretion',
 ARRAY['nutrition', 'respiration', 'transportation', 'excretion'], 1),
(10, 'biology', 'reproduction', 'Reproduction', 'Asexual and sexual reproduction',
 ARRAY['asexual', 'sexual', 'human_reproduction'], 2),
(10, 'biology', 'heredity', 'Heredity & Evolution', 'Genetics, evolution, speciation',
 ARRAY['genetics', 'evolution', 'speciation'], 3)
ON CONFLICT (class_level, subject, topic) DO NOTHING;

-- Class 12 Mathematics Topics
INSERT INTO curriculum_topics (class_level, subject, topic, display_name, description, subtopics, display_order) VALUES
(12, 'mathematics', 'relations_functions', 'Relations & Functions', 'Types of functions, composition, inverse',
 ARRAY['types_of_relations', 'types_of_functions', 'composition', 'inverse'], 1),
(12, 'mathematics', 'calculus', 'Calculus', 'Limits, derivatives, integrals, applications',
 ARRAY['limits', 'derivatives', 'integrals', 'applications'], 2),
(12, 'mathematics', 'vectors_3d', 'Vectors & 3D Geometry', 'Vector operations, lines, planes',
 ARRAY['vectors', 'lines_in_space', 'planes'], 3),
(12, 'mathematics', 'linear_programming', 'Linear Programming', 'Optimization problems',
 ARRAY['graphical_method', 'simplex'], 4),
(12, 'mathematics', 'probability_distributions', 'Probability Distributions', 'Random variables, binomial, conditional',
 ARRAY['random_variables', 'binomial_distribution', 'conditional_probability'], 5)
ON CONFLICT (class_level, subject, topic) DO NOTHING;

-- Class 12 Physics Topics
INSERT INTO curriculum_topics (class_level, subject, topic, display_name, description, subtopics, display_order) VALUES
(12, 'physics', 'electrostatics', 'Electrostatics', 'Electric charges, fields, potential',
 ARRAY['coulombs_law', 'electric_field', 'potential', 'capacitance'], 1),
(12, 'physics', 'current_electricity', 'Current Electricity', 'Ohms law, circuits, Kirchhoffs laws',
 ARRAY['ohms_law', 'kirchhoffs_laws', 'potentiometer', 'meter_bridge'], 2),
(12, 'physics', 'magnetism', 'Magnetism & Matter', 'Magnetic fields, materials, Earth magnetism',
 ARRAY['magnetic_field', 'magnetic_materials', 'earth_magnetism'], 3),
(12, 'physics', 'em_induction', 'Electromagnetic Induction', 'Faradays laws, AC, transformers',
 ARRAY['faradays_laws', 'lenz_law', 'ac_circuits', 'transformers'], 4),
(12, 'physics', 'optics', 'Optics', 'Wave optics, interference, diffraction',
 ARRAY['wave_optics', 'interference', 'diffraction', 'polarization'], 5),
(12, 'physics', 'modern_physics', 'Modern Physics', 'Dual nature, atoms, nuclei, semiconductors',
 ARRAY['photoelectric_effect', 'atoms', 'nuclei', 'semiconductors'], 6)
ON CONFLICT (class_level, subject, topic) DO NOTHING;

-- Class 12 Chemistry Topics
INSERT INTO curriculum_topics (class_level, subject, topic, display_name, description, subtopics, display_order) VALUES
(12, 'chemistry', 'solid_state', 'Solid State', 'Crystal structure, defects, properties',
 ARRAY['crystal_structure', 'defects', 'electrical_properties'], 1),
(12, 'chemistry', 'solutions', 'Solutions', 'Concentration, colligative properties',
 ARRAY['concentration', 'colligative_properties', 'abnormal_molar_mass'], 2),
(12, 'chemistry', 'electrochemistry', 'Electrochemistry', 'Electrochemical cells, conductance',
 ARRAY['electrochemical_cells', 'nernst_equation', 'conductance', 'corrosion'], 3),
(12, 'chemistry', 'chemical_kinetics', 'Chemical Kinetics', 'Rate laws, order of reaction',
 ARRAY['rate_law', 'order_of_reaction', 'temperature_dependence'], 4),
(12, 'chemistry', 'organic_chemistry', 'Organic Chemistry', 'Reactions, mechanisms, named reactions',
 ARRAY['haloalkanes', 'alcohols', 'aldehydes_ketones', 'amines'], 5)
ON CONFLICT (class_level, subject, topic) DO NOTHING;

-- Class 12 Biology Topics
INSERT INTO curriculum_topics (class_level, subject, topic, display_name, description, subtopics, display_order) VALUES
(12, 'biology', 'reproduction', 'Reproduction', 'Sexual reproduction in plants and humans',
 ARRAY['plants', 'humans', 'reproductive_health'], 1),
(12, 'biology', 'genetics', 'Genetics & Evolution', 'Inheritance, molecular basis, evolution',
 ARRAY['mendelian_genetics', 'molecular_basis', 'evolution'], 2),
(12, 'biology', 'human_health', 'Human Health & Disease', 'Immunity, diseases, drugs',
 ARRAY['immunity', 'diseases', 'drugs_and_alcohol'], 3),
(12, 'biology', 'biotechnology', 'Biotechnology', 'Principles, applications, GMOs',
 ARRAY['principles', 'applications', 'gmos', 'ethical_issues'], 4),
(12, 'biology', 'ecology', 'Ecology & Environment', 'Ecosystems, biodiversity, conservation',
 ARRAY['ecosystems', 'biodiversity', 'environmental_issues'], 5)
ON CONFLICT (class_level, subject, topic) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE questions IS 'Cached questions from Gemini and curriculum';
COMMENT ON TABLE practice_sessions IS 'User practice session metadata';
COMMENT ON TABLE practice_session_questions IS 'Questions in each practice session with answers';
COMMENT ON TABLE concept_scores IS 'Per-concept mastery tracking for adaptive difficulty';
COMMENT ON TABLE curriculum_topics IS 'Available topics for practice by class and subject';
