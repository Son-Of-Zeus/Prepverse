-- PrepVerse Database Schema for Supabase (PostgreSQL)
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  class_level INTEGER NOT NULL DEFAULT 10 CHECK (class_level IN (10, 12)),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index on auth0_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth0_id ON users(auth0_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Onboarding results table
CREATE TABLE IF NOT EXISTS onboarding_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  weak_topics TEXT[],
  strong_topics TEXT[],
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding_results(user_id);

-- User attempts table (tracks all question attempts)
CREATE TABLE IF NOT EXISTS user_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  selected_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  subject TEXT,
  topic TEXT,
  attempt_type TEXT DEFAULT 'practice' CHECK (attempt_type IN ('onboarding', 'practice', 'test')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON user_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_created_at ON user_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_attempts_topic ON user_attempts(topic);

-- Study sessions table (optional - for tracking study sessions)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  topic TEXT,
  duration_minutes INTEGER,
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON study_sessions(started_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid()::text = auth0_id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid()::text = auth0_id);

CREATE POLICY "Users can insert their own data"
  ON users FOR INSERT
  WITH CHECK (auth.uid()::text = auth0_id);

-- Policies for onboarding_results
CREATE POLICY "Users can view their onboarding results"
  ON onboarding_results FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "Users can insert their onboarding results"
  ON onboarding_results FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Policies for user_attempts
CREATE POLICY "Users can view their attempts"
  ON user_attempts FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "Users can insert their attempts"
  ON user_attempts FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Policies for study_sessions
CREATE POLICY "Users can view their sessions"
  ON study_sessions FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "Users can insert their sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

CREATE POLICY "Users can update their sessions"
  ON study_sessions FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth0_id = auth.uid()::text));

-- Sample view for user statistics
CREATE OR REPLACE VIEW user_statistics AS
SELECT
  u.id,
  u.email,
  u.class_level,
  u.onboarding_completed,
  COUNT(DISTINCT ua.id) as total_attempts,
  COUNT(DISTINCT ua.id) FILTER (WHERE ua.is_correct = true) as correct_attempts,
  ROUND(
    (COUNT(DISTINCT ua.id) FILTER (WHERE ua.is_correct = true)::NUMERIC /
    NULLIF(COUNT(DISTINCT ua.id), 0) * 100),
    2
  ) as accuracy_percentage,
  COUNT(DISTINCT ss.id) as total_sessions,
  SUM(ss.duration_minutes) as total_study_minutes
FROM users u
LEFT JOIN user_attempts ua ON u.id = ua.user_id
LEFT JOIN study_sessions ss ON u.id = ss.user_id
GROUP BY u.id, u.email, u.class_level, u.onboarding_completed;

-- Grant permissions on the view
GRANT SELECT ON user_statistics TO authenticated;

COMMENT ON TABLE users IS 'Stores user profile information';
COMMENT ON TABLE onboarding_results IS 'Stores onboarding assessment results';
COMMENT ON TABLE user_attempts IS 'Tracks all question attempts by users';
COMMENT ON TABLE study_sessions IS 'Tracks study session data';
