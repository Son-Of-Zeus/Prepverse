# PrepVerse - Technical Specification

## Version 1.0 | MVP Specification

---

## 1. Executive Summary

**PrepVerse** is an adaptive learning platform for CBSE 10th and 12th students, combining focus tools, gamified learning, and peer collaboration. This document defines the complete technical specification for the MVP.

### Scope
- **Target**: CBSE Class 10 & 12 students
- **Subjects**: Mathematics, Science (Physics, Chemistry, Biology)
- **Platforms**: Android (Native Kotlin), Web (React PWA)
- **Core Features**: Onboarding, Practice, Focus Mode, Progress Dashboard, Peer Collaboration

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                    │
├──────────────────────────┬──────────────────────────────────────────┤
│     Android App          │           Web App (PWA)                   │
│  (Kotlin + Compose)      │      (React + TypeScript)                │
│                          │                                           │
│  ┌─────────────────┐     │     ┌─────────────────┐                  │
│  │   Room DB       │     │     │   IndexedDB     │                  │
│  │   (Offline)     │     │     │   (Dexie.js)    │                  │
│  └─────────────────┘     │     └─────────────────┘                  │
│           │              │              │                            │
│  ┌─────────────────┐     │     ┌─────────────────┐                  │
│  │   WorkManager   │     │     │  Service Worker │                  │
│  │   (Sync)        │     │     │  (Sync)         │                  │
│  └─────────────────┘     │     └─────────────────┘                  │
└──────────┬───────────────┴──────────────┬───────────────────────────┘
           │                              │
           │         HTTPS/WSS           │
           └──────────────┬───────────────┘
                          │
           ┌──────────────▼──────────────┐
           │         Auth0               │
           │    (Authentication)         │
           │    - Google OAuth only      │
           └──────────────┬──────────────┘
                          │ JWT
           ┌──────────────▼──────────────┐
           │     FastAPI Backend          │
           │     (Python 3.11+)           │
           │                              │
           │  ┌────────────────────────┐  │
           │  │   API Routes (v1)      │  │
           │  │   - /auth              │  │
           │  │   - /onboarding        │  │
           │  │   - /questions         │  │
           │  │   - /progress          │  │
           │  │   - /focus             │  │
           │  │   - /peer              │  │
           │  └────────────────────────┘  │
           │                              │
           │  ┌────────────────────────┐  │
           │  │   Services Layer       │  │
           │  └──────────┬─────────────┘  │
           └─────────────┼────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼────────┐ ┌─────▼─────┐ ┌────────▼────────┐
│   Supabase     │ │  Gemini   │ │   Supabase      │
│   PostgreSQL   │ │  Flash 3  │ │   Realtime      │
│   (Primary DB) │ │  (AI)     │ │   (WebSocket)   │
└────────────────┘ └───────────┘ └─────────────────┘
```

---

## 3. Authentication Specification

### 3.1 Auth0 Configuration

**Provider**: Auth0 with Google Social Connection ONLY

#### Auth0 Application Settings
```
Application Type: Regular Web Application (for server-side OAuth)
                  Native (for Android)
Allowed Callback URLs:
  - Web: http://localhost:8000/api/v1/auth/callback (backend handles OAuth)
  - Android: prepverse://callback
Allowed Logout URLs:
  - Web: http://localhost:5173, https://prepverse.app
  - Android: prepverse://logout
Allowed Web Origins:
  - http://localhost:5173, https://prepverse.app
```

Note: Web uses server-side OAuth flow where the backend handles token exchange and sets HTTP-only cookies.

#### Auth0 API Settings
```
API Identifier: https://api.prepverse.app
Signing Algorithm: RS256
RBAC: Enabled
Permissions:
  - read:profile
  - write:profile
  - read:progress
  - write:progress
  - read:questions
  - join:peer_sessions
```

### 3.2 Auth Flow

#### Web (Server-Side OAuth with Cookies)
```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │   Web   │     │ Backend │     │  Auth0  │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │  Click Login  │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ GET /auth/login               │
     │               │──────────────>│               │
     │               │               │               │
     │               │               │ Redirect to   │
     │               │               │ Auth0/Google  │
     │               │               │──────────────>│
     │               │               │               │
     │      Google OAuth Consent     │               │
     │<──────────────────────────────────────────────│
     │               │               │               │
     │  Grant Access │               │               │
     │──────────────────────────────────────────────>│
     │               │               │               │
     │               │               │ Callback with │
     │               │               │ auth code     │
     │               │               │<──────────────│
     │               │               │               │
     │               │               │ Exchange code │
     │               │               │ for tokens    │
     │               │               │──────────────>│
     │               │               │               │
     │               │               │<──────────────│
     │               │               │ Tokens        │
     │               │               │               │
     │               │ Set HTTP-only │               │
     │               │ session cookie│               │
     │               │<──────────────│               │
     │               │               │               │
     │  Redirect to  │               │               │
     │  dashboard    │               │               │
     │<──────────────│               │               │
     │               │               │               │
     │               │ API requests  │               │
     │               │ (cookie auto- │               │
     │               │ included)     │               │
     │               │──────────────>│               │
```

#### Android (Client-Side OAuth with Bearer Tokens)
```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  User   │     │ Android │     │  Auth0  │     │ Backend │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     │  Click Login  │               │               │
     │──────────────>│               │               │
     │               │               │               │
     │               │ Auth0 SDK     │               │
     │               │ login()       │               │
     │               │──────────────>│               │
     │               │               │               │
     │    Google OAuth Consent       │               │
     │<──────────────────────────────│               │
     │               │               │               │
     │  Grant Access │               │               │
     │──────────────────────────────>│               │
     │               │               │               │
     │               │ Access Token  │               │
     │               │<──────────────│               │
     │               │               │               │
     │               │ API requests  │               │
     │               │ with Bearer   │               │
     │               │ token         │               │
     │               │───────────────────────────────>│
     │               │               │               │
     │               │               │ Validate JWT  │
     │               │               │ with JWKS     │
     │               │               │               │
     │               │ Response      │               │
     │               │<──────────────────────────────│
```

### 3.3 Backend Authentication (Dual Auth)

The backend supports both authentication methods:
1. **HTTP-only cookies** for web clients
2. **Bearer JWT tokens** for mobile clients

```python
# backend/app/core/security.py
from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from typing import Optional

security = HTTPBearer(auto_error=False)

async def get_current_user_flexible(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    prepverse_session: Optional[str] = Cookie(default=None),
) -> dict:
    """
    Unified authentication that accepts either:
    1. HTTP-only session cookie (web frontend)
    2. Bearer JWT token (mobile apps)

    Tries cookie first, then falls back to Bearer token.
    """
    # Try cookie-based auth first (web)
    session_cookie = prepverse_session or request.cookies.get("prepverse_session")
    if session_cookie:
        user_data = verify_session_token(session_cookie)
        if user_data:
            return user_data

    # Try Bearer token auth (mobile)
    if credentials and credentials.credentials:
        payload = validate_jwt_token(credentials.credentials)
        if payload:
            return {
                "user_id": payload.get("sub"),
                "email": payload.get("email"),
                "auth_method": "bearer"
            }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated"
    )
```

See `backend/app/core/security.py` for full implementation.

---

## 4. Onboarding Specification

### 4.1 Overview

After successful login, new users must complete onboarding:
- **10 questions** randomly selected from a **pool of 100**
- Questions assess current knowledge level across topics
- Results used to create initial learning profile

### 4.2 Onboarding Questions Schema

```json
// backend/app/curriculum/onboarding_questions.json
{
  "version": "1.0",
  "total_questions": 100,
  "questions": [
    {
      "id": "onb_001",
      "class": 10,
      "subject": "mathematics",
      "topic": "algebra",
      "subtopic": "quadratic_equations",
      "difficulty": "easy",
      "question_type": "mcq",
      "question": "What is the degree of the polynomial x² + 3x + 2?",
      "options": ["1", "2", "3", "0"],
      "correct_answer": "2",
      "explanation": "The degree is the highest power of x, which is 2.",
      "time_estimate_seconds": 30,
      "concept_tags": ["polynomial", "degree"]
    },
    {
      "id": "onb_002",
      "class": 10,
      "subject": "science",
      "topic": "physics",
      "subtopic": "electricity",
      "difficulty": "medium",
      "question_type": "mcq",
      "question": "What is the SI unit of electric current?",
      "options": ["Volt", "Ampere", "Ohm", "Watt"],
      "correct_answer": "Ampere",
      "explanation": "Electric current is measured in Amperes (A).",
      "time_estimate_seconds": 20,
      "concept_tags": ["electricity", "units"]
    }
    // ... 98 more questions
  ]
}
```

### 4.3 Onboarding Question Distribution

| Class | Subject | Count |
|-------|---------|-------|
| 10 | Mathematics | 25 |
| 10 | Science (Physics) | 10 |
| 10 | Science (Chemistry) | 10 |
| 10 | Science (Biology) | 5 |
| 12 | Mathematics | 25 |
| 12 | Science (Physics) | 10 |
| 12 | Science (Chemistry) | 10 |
| 12 | Science (Biology) | 5 |
| **Total** | | **100** |

### 4.4 Selection Algorithm

```python
# backend/app/services/onboarding_service.py

def select_onboarding_questions(user_class: int) -> list[dict]:
    """
    Select 10 questions for onboarding based on user's class.

    Distribution for selected 10:
    - 4 from user's class Math
    - 3 from user's class Physics
    - 2 from user's class Chemistry
    - 1 from user's class Biology

    Difficulty distribution:
    - 4 Easy
    - 4 Medium
    - 2 Hard
    """
    questions = load_onboarding_questions()

    # Filter by class
    class_questions = [q for q in questions if q["class"] == user_class]

    selected = []

    # Select by subject
    subjects = {
        "mathematics": 4,
        "physics": 3,
        "chemistry": 2,
        "biology": 1
    }

    for subject, count in subjects.items():
        pool = [q for q in class_questions
                if q["subject"] == subject or q["topic"] == subject]
        selected.extend(random.sample(pool, min(count, len(pool))))

    # Ensure difficulty distribution
    # Shuffle to randomize order
    random.shuffle(selected)

    return selected[:10]
```

### 4.5 Onboarding API Endpoints

```
GET  /api/v1/onboarding/status
Response: { "completed": false, "class": null }

POST /api/v1/onboarding/start
Body: { "class": 10 }  // or 12
Response: {
  "session_id": "uuid",
  "questions": [...],  // 10 questions
  "total_time_seconds": 600
}

POST /api/v1/onboarding/submit
Body: {
  "session_id": "uuid",
  "answers": [
    { "question_id": "onb_001", "answer": "2", "time_taken_seconds": 25 },
    ...
  ]
}
Response: {
  "score": 7,
  "total": 10,
  "profile": {
    "strengths": ["algebra", "electricity"],
    "weaknesses": ["geometry", "chemistry"],
    "recommended_topics": [...]
  }
}

GET  /api/v1/onboarding/status (after completion)
Response: { "completed": true, "class": 10, "profile": {...} }
```

### 4.6 Onboarding UI Flow

```
┌─────────────────────────────────────┐
│         Welcome to PrepVerse!       │
│                                     │
│  Let's personalize your learning    │
│  experience with a quick assessment │
│                                     │
│  ┌─────────────────────────────────┐│
│  │  Select Your Class:             ││
│  │                                 ││
│  │   [ Class 10 ]    [ Class 12 ]  ││
│  └─────────────────────────────────┘│
│                                     │
│         [ Start Assessment ]        │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Question 1 of 10          ⏱ 9:45   │
│                                     │
│  Mathematics > Algebra              │
│                                     │
│  What is the degree of the          │
│  polynomial x² + 3x + 2?            │
│                                     │
│  ○ 1                                │
│  ○ 2                                │
│  ○ 3                                │
│  ○ 0                                │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━ 10%         │
│                                     │
│            [ Next → ]               │
└─────────────────────────────────────┘
                  │
                  ▼ (after 10 questions)
┌─────────────────────────────────────┐
│         Assessment Complete!        │
│                                     │
│         Score: 7/10                 │
│                                     │
│  ╭─────────────────────────────────╮│
│  │  Your Strengths:                ││
│  │  • Algebra                      ││
│  │  • Electricity                  ││
│  ╰─────────────────────────────────╯│
│                                     │
│  ╭─────────────────────────────────╮│
│  │  Areas to Improve:              ││
│  │  • Geometry                     ││
│  │  • Chemical Reactions           ││
│  ╰─────────────────────────────────╯│
│                                     │
│      [ Go to Dashboard → ]          │
└─────────────────────────────────────┘
```

---

## 5. Database Schema

### 5.1 Core Tables

```sql
-- Users (synced from Auth0)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth0_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture_url TEXT,
    class INTEGER CHECK (class IN (10, 12)),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding Responses
CREATE TABLE onboarding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    question_id VARCHAR(50) NOT NULL,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Learning Profile (generated from onboarding)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    strengths JSONB DEFAULT '[]',
    weaknesses JSONB DEFAULT '[]',
    preferred_subjects JSONB DEFAULT '[]',
    daily_goal_minutes INTEGER DEFAULT 30,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions Bank
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) UNIQUE,
    class INTEGER NOT NULL CHECK (class IN (10, 12)),
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    subtopic VARCHAR(100),
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_type VARCHAR(20) DEFAULT 'mcq',
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    concept_tags JSONB DEFAULT '[]',
    source VARCHAR(50) DEFAULT 'generated', -- 'manual', 'generated', 'imported'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question Attempts
CREATE TABLE question_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    session_type VARCHAR(30) NOT NULL, -- 'practice', 'quiz', 'battle', 'exam'
    session_id UUID,
    answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept Scores (per user per concept)
CREATE TABLE concept_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    subtopic VARCHAR(100),
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2) DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    mastery_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'learning', 'proficient', 'mastered'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subject, topic, subtopic)
);

-- Focus Sessions (Pomodoro)
CREATE TABLE focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(50),
    topic VARCHAR(100),
    planned_duration_minutes INTEGER NOT NULL,
    actual_duration_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'interrupted'
    interruptions INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Peer Sessions
CREATE TABLE peer_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_type VARCHAR(20) NOT NULL, -- 'study_room', 'battle'
    created_by UUID REFERENCES users(id),
    subject VARCHAR(50),
    topic VARCHAR(100),
    max_participants INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'active', 'completed'
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- Peer Session Participants
CREATE TABLE peer_session_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES peer_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'participant', -- 'host', 'participant'
    score INTEGER DEFAULT 0, -- for battles
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(session_id, user_id)
);

-- Gamification: XP and Streaks
CREATE TABLE user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    badges JSONB DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Progress (for streaks and daily stats)
CREATE TABLE daily_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    focus_minutes INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, date)
);
```

### 5.2 Indexes

```sql
CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_question_attempts_user_id ON question_attempts(user_id);
CREATE INDEX idx_question_attempts_created_at ON question_attempts(created_at);
CREATE INDEX idx_concept_scores_user_id ON concept_scores(user_id);
CREATE INDEX idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, date);
CREATE INDEX idx_questions_class_subject ON questions(class, subject);
CREATE INDEX idx_questions_topic ON questions(topic);
```

---

## 6. Question Generation (Gemini Flash 3)

### 6.1 Generation Strategy

Questions are generated dynamically using Gemini Flash 3 based on:
- User's class (10 or 12)
- Subject and topic
- Target difficulty
- User's current mastery level

### 6.2 Gemini Client

```python
# backend/app/core/gemini.py
import google.generativeai as genai
from typing import List
import json

class GeminiClient:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def generate_questions(
        self,
        class_level: int,
        subject: str,
        topic: str,
        subtopic: str | None,
        difficulty: str,
        count: int = 5,
        exclude_ids: List[str] = []
    ) -> List[dict]:

        prompt = f"""Generate {count} multiple choice questions for CBSE Class {class_level} {subject}.

Topic: {topic}
{f'Subtopic: {subtopic}' if subtopic else ''}
Difficulty: {difficulty}

Requirements:
1. Questions must be curriculum-aligned to CBSE
2. Each question must have exactly 4 options
3. Only one correct answer per question
4. Include a brief explanation for the correct answer
5. Questions should test conceptual understanding, not just memorization

Return as JSON array with this structure:
[
  {{
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option B",
    "explanation": "Brief explanation of why this is correct",
    "concept_tags": ["tag1", "tag2"]
  }}
]

Only return valid JSON, no other text."""

        response = await self.model.generate_content_async(prompt)

        # Parse response
        try:
            questions = json.loads(response.text)
            return questions
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\[[\s\S]*\]', response.text)
            if json_match:
                return json.loads(json_match.group())
            raise ValueError("Failed to parse Gemini response as JSON")
```

### 6.3 Adaptive Difficulty

```python
# backend/app/services/question_service.py

def determine_next_difficulty(
    user_id: str,
    topic: str,
    recent_performance: List[dict]
) -> str:
    """
    Determine next question difficulty based on recent performance.

    Rules:
    - If last 3 questions correct: increase difficulty
    - If last 3 questions wrong: decrease difficulty
    - Otherwise: maintain current difficulty
    """
    if len(recent_performance) < 3:
        return "medium"

    last_3 = recent_performance[-3:]
    correct_count = sum(1 for q in last_3 if q["is_correct"])

    current_difficulty = recent_performance[-1].get("difficulty", "medium")

    if correct_count >= 3:
        return increase_difficulty(current_difficulty)
    elif correct_count == 0:
        return decrease_difficulty(current_difficulty)

    return current_difficulty

def increase_difficulty(current: str) -> str:
    mapping = {"easy": "medium", "medium": "hard", "hard": "hard"}
    return mapping[current]

def decrease_difficulty(current: str) -> str:
    mapping = {"easy": "easy", "medium": "easy", "hard": "medium"}
    return mapping[current]
```

---

## 7. Offline Sync Specification

### 7.1 Sync Strategy

**Conflict Resolution**: Last-Write-Wins with Server Priority for conflicts

**Sync Entities**:
| Entity | Sync Direction | Priority |
|--------|----------------|----------|
| User Profile | Bidirectional | Server |
| Question Attempts | Client → Server | Client |
| Focus Sessions | Client → Server | Client |
| Progress Data | Server → Client | Server |
| Question Bank | Server → Client | Server |

### 7.2 Android Offline (Room + WorkManager)

```kotlin
// app/.../sync/SyncWorker.kt
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val syncRepository: SyncRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            // 1. Push local changes
            syncRepository.pushPendingAttempts()
            syncRepository.pushPendingFocusSessions()

            // 2. Pull server updates
            syncRepository.pullQuestionBank()
            syncRepository.pullProgressData()

            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
}

// Schedule sync
fun schedulePeriodic Sync(context: Context) {
    val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
        15, TimeUnit.MINUTES
    )
        .setConstraints(constraints)
        .setBackoffCriteria(
            BackoffPolicy.EXPONENTIAL,
            1, TimeUnit.MINUTES
        )
        .build()

    WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(
            "prepverse_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
}
```

### 7.3 Web Offline (IndexedDB + Service Worker)

```typescript
// web/src/lib/offlineDb.ts
import Dexie, { Table } from 'dexie';

interface PendingAttempt {
  id?: number;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeTaken: number;
  timestamp: number;
  synced: boolean;
}

interface CachedQuestion {
  id: string;
  data: Question;
  cachedAt: number;
}

class PrepVerseDB extends Dexie {
  pendingAttempts!: Table<PendingAttempt>;
  cachedQuestions!: Table<CachedQuestion>;

  constructor() {
    super('prepverse');
    this.version(1).stores({
      pendingAttempts: '++id, synced, timestamp',
      cachedQuestions: 'id, cachedAt'
    });
  }
}

export const db = new PrepVerseDB();

// Sync function
export async function syncPendingData() {
  const pending = await db.pendingAttempts
    .where('synced')
    .equals(false)
    .toArray();

  if (pending.length === 0) return;

  try {
    await api.post('/questions/attempts/batch', {
      attempts: pending.map(p => ({
        questionId: p.questionId,
        answer: p.answer,
        isCorrect: p.isCorrect,
        timeTaken: p.timeTaken,
        timestamp: p.timestamp
      }))
    });

    // Mark as synced
    await db.pendingAttempts
      .where('id')
      .anyOf(pending.map(p => p.id!))
      .modify({ synced: true });
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
```

---

## 8. Real-time & Peer Collaboration

### 8.1 Supabase Realtime Channels

```typescript
// web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Join a study room channel
export function joinStudyRoom(roomId: string, userId: string) {
  const channel = supabase.channel(`room:${roomId}`);

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      // Update participants list
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      // Handle user join
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      // Handle user leave
    })
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      // Handle chat message
    })
    .on('broadcast', { event: 'whiteboard' }, ({ payload }) => {
      // Handle whiteboard update
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: oderId,
          online_at: new Date().toISOString()
        });
      }
    });

  return channel;
}
```

### 8.2 WebRTC for Video/Audio

```typescript
// web/src/lib/webrtc.ts
export class PeerConnection {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;

  constructor(
    private onRemoteStream: (stream: MediaStream) => void,
    private onIceCandidate: (candidate: RTCIceCandidate) => void
  ) {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        // Add TURN server for production
      ]
    });

    this.pc.ontrack = (event) => {
      this.onRemoteStream(event.streams[0]);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate(event.candidate);
      }
    };
  }

  async startLocalStream(video: boolean = true, audio: boolean = true) {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video,
      audio
    });

    this.localStream.getTracks().forEach(track => {
      this.pc.addTrack(track, this.localStream!);
    });

    return this.localStream;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(answer);
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(candidate);
  }

  close() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.pc.close();
  }
}
```

---

## 9. Gamification System

### 9.1 XP System

| Action | XP Earned |
|--------|-----------|
| Complete onboarding | 100 |
| Answer question correctly | 10 |
| Answer question incorrectly | 2 |
| Complete practice session (10+ questions) | 50 |
| Complete focus session (25 min) | 30 |
| Win a battle | 75 |
| Maintain daily streak | 25 per day |
| First of the day | 10 bonus |

### 9.2 Level System

| Level | XP Required | Title |
|-------|-------------|-------|
| 1 | 0 | Beginner |
| 2 | 100 | Learner |
| 3 | 300 | Student |
| 4 | 600 | Scholar |
| 5 | 1000 | Expert |
| 6 | 1500 | Master |
| 7 | 2500 | Grandmaster |
| 8 | 4000 | Legend |
| 9 | 6000 | Champion |
| 10 | 10000 | PrepVerse Pro |

### 9.3 Badges

```json
{
  "badges": [
    {
      "id": "first_login",
      "name": "Welcome!",
      "description": "Completed your first login",
      "icon": "door-open"
    },
    {
      "id": "streak_7",
      "name": "Week Warrior",
      "description": "7-day study streak",
      "icon": "fire"
    },
    {
      "id": "streak_30",
      "name": "Monthly Master",
      "description": "30-day study streak",
      "icon": "flame"
    },
    {
      "id": "100_questions",
      "name": "Century",
      "description": "Answered 100 questions",
      "icon": "target"
    },
    {
      "id": "perfect_quiz",
      "name": "Perfectionist",
      "description": "Score 100% on a quiz",
      "icon": "star"
    },
    {
      "id": "battle_winner",
      "name": "Victor",
      "description": "Win your first battle",
      "icon": "trophy"
    },
    {
      "id": "focus_master",
      "name": "Focused",
      "description": "Complete 10 focus sessions",
      "icon": "clock"
    }
  ]
}
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Core Infrastructure)
1. Set up Android project with Jetpack Compose
2. Set up Web project with Vite + React
3. Set up FastAPI backend with Supabase
4. Implement Auth0 integration (all platforms)
5. Create database schema

### Phase 2: Onboarding & User Profile
1. Create 100 onboarding questions
2. Implement onboarding flow (Android + Web)
3. User profile creation from onboarding results
4. Dashboard skeleton

### Phase 3: Practice & Questions
1. Gemini integration for question generation
2. Practice mode implementation
3. Quiz mode implementation
4. Question attempt tracking

### Phase 4: Progress & Analytics
1. Progress calculation service
2. Concept-wise breakdown
3. Progress dashboard UI
4. Trends and charts

### Phase 5: Focus Mode
1. Pomodoro timer implementation
2. Focus session tracking
3. Statistics and history

### Phase 6: Offline & Sync
1. Room database setup (Android)
2. IndexedDB setup (Web)
3. Sync workers implementation
4. Conflict resolution

### Phase 7: Peer Collaboration
1. Study room creation and joining
2. Real-time presence
3. Text chat
4. Shared whiteboard
5. Battle mode

### Phase 8: Video/Audio (Optional)
1. WebRTC integration
2. Video/audio call UI
3. TURN server setup

### Phase 9: Gamification
1. XP system implementation
2. Levels and badges
3. Leaderboards
4. Streaks

### Phase 10: Polish & Launch
1. UI/UX refinements
2. Performance optimization
3. Testing
4. Documentation
5. Deployment

---

## 11. API Reference Summary

See `Memory.md` for detailed endpoint list.

Base URL: `https://api.prepverse.app/api/v1`

| Module | Endpoints |
|--------|-----------|
| Auth | `/auth/callback`, `/auth/me` |
| Onboarding | `/onboarding/status`, `/onboarding/start`, `/onboarding/submit` |
| Questions | `/questions/topics`, `/questions/generate`, `/questions/attempt` |
| Progress | `/progress/dashboard`, `/progress/concepts`, `/progress/trends` |
| Focus | `/focus/start`, `/focus/end`, `/focus/history` |
| Peer | `/peer/rooms`, `/peer/rooms/{id}/join`, `/peer/battles` |

---

*Document Version: 1.1*
*Last Updated: 2025-12-25*
