# PrepVerse - Memory File

> **IMPORTANT**: Always search this file FIRST before doing any file/pattern search in the codebase.

## Project Overview
**PrepVerse** - Smart Examverse for 10th & 12th CBSE Students
- **Platforms**: Android (Native Kotlin) + Web (React + Vite)
- **Backend**: FastAPI (Python) + Supabase (PostgreSQL)
- **Auth**: Auth0 (Google Sign-in only)
- **AI**: Google Gemini Flash 3

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Android | Kotlin, Jetpack Compose, Hilt, Room, DataStore |
| Web | Vite, React 18, TypeScript, TailwindCSS, Zustand |
| Backend | FastAPI, Pydantic, SQLAlchemy, Alembic |
| Database | Supabase (PostgreSQL), Room (Android local), IndexedDB (Web local) |
| Auth | Auth0 (Google OAuth only) |
| AI | Google Gemini Flash 3 API |
| Real-time | Supabase Realtime, WebRTC (peer video/audio) |
| Offline Sync | Room + WorkManager (Android), IndexedDB + Service Worker (Web) |

---

## Directory Structure

### Android (`/app`)
```
app/
├── src/main/
│   ├── java/com/prepverse/prepverse/
│   │   ├── PrepVerseApp.kt              # Application class with Hilt
│   │   ├── MainActivity.kt              # Single Activity host
│   │   ├── di/                          # Dependency injection modules
│   │   │   ├── AppModule.kt
│   │   │   ├── NetworkModule.kt
│   │   │   ├── DatabaseModule.kt
│   │   │   └── AuthModule.kt
│   │   ├── data/
│   │   │   ├── local/
│   │   │   │   ├── db/
│   │   │   │   │   ├── PrepVerseDatabase.kt
│   │   │   │   │   ├── dao/              # Room DAOs
│   │   │   │   │   └── entities/         # Room entities
│   │   │   │   └── datastore/
│   │   │   │       └── UserPreferences.kt
│   │   │   ├── remote/
│   │   │   │   ├── api/
│   │   │   │   │   ├── PrepVerseApi.kt   # Retrofit interface
│   │   │   │   │   └── dto/              # Data transfer objects
│   │   │   │   └── AuthManager.kt        # Auth0 wrapper
│   │   │   └── repository/
│   │   │       ├── AuthRepository.kt
│   │   │       ├── QuestionRepository.kt
│   │   │       ├── ProgressRepository.kt
│   │   │       ├── OnboardingRepository.kt
│   │   │       └── PeerRepository.kt
│   │   ├── domain/
│   │   │   ├── model/                    # Domain models
│   │   │   │   ├── User.kt
│   │   │   │   ├── Question.kt
│   │   │   │   ├── Progress.kt
│   │   │   │   ├── OnboardingAnswer.kt
│   │   │   │   └── PeerSession.kt
│   │   │   └── usecase/                  # Business logic
│   │   │       ├── auth/
│   │   │       ├── onboarding/
│   │   │       ├── practice/
│   │   │       ├── focus/
│   │   │       └── peer/
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   │   ├── Color.kt
│   │   │   │   ├── Type.kt
│   │   │   │   └── Theme.kt
│   │   │   ├── navigation/
│   │   │   │   ├── NavGraph.kt
│   │   │   │   └── Routes.kt
│   │   │   ├── components/               # Reusable composables
│   │   │   │   ├── PrepButton.kt
│   │   │   │   ├── QuestionCard.kt
│   │   │   │   ├── ProgressChart.kt
│   │   │   │   └── Timer.kt
│   │   │   └── screens/
│   │   │       ├── auth/
│   │   │       │   ├── LoginScreen.kt
│   │   │       │   └── LoginViewModel.kt
│   │   │       ├── onboarding/
│   │   │       │   ├── OnboardingScreen.kt
│   │   │       │   └── OnboardingViewModel.kt
│   │   │       ├── dashboard/
│   │   │       │   ├── DashboardScreen.kt
│   │   │       │   └── DashboardViewModel.kt
│   │   │       ├── practice/
│   │   │       │   ├── PracticeScreen.kt
│   │   │       │   ├── QuizScreen.kt
│   │   │       │   └── PracticeViewModel.kt
│   │   │       ├── focus/
│   │   │       │   ├── FocusModeScreen.kt
│   │   │       │   └── FocusViewModel.kt
│   │   │       ├── progress/
│   │   │       │   ├── ProgressScreen.kt
│   │   │       │   └── ProgressViewModel.kt
│   │   │       └── peer/
│   │   │           ├── PeerLobbyScreen.kt
│   │   │           ├── StudyRoomScreen.kt
│   │   │           ├── BattleScreen.kt
│   │   │           └── PeerViewModel.kt
│   │   ├── sync/
│   │   │   ├── SyncWorker.kt             # WorkManager for offline sync
│   │   │   └── ConflictResolver.kt
│   │   └── util/
│   │       ├── Constants.kt
│   │       ├── Extensions.kt
│   │       └── NetworkMonitor.kt
│   └── res/
│       ├── values/
│       └── ...
├── build.gradle.kts
└── proguard-rules.pro
```

### Web (`/web`)
```
web/
├── public/
│   ├── sw.js                            # Service worker for offline
│   └── manifest.json                    # PWA manifest
├── src/
│   ├── main.tsx                         # Entry point
│   ├── App.tsx                          # Root component with router
│   ├── vite-env.d.ts
│   ├── api/
│   │   ├── client.ts                    # Axios instance
│   │   ├── auth.ts                      # Auth0 API calls
│   │   ├── questions.ts
│   │   ├── progress.ts
│   │   ├── onboarding.ts
│   │   └── peer.ts
│   ├── components/
│   │   ├── ui/                          # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── ProgressChart.tsx
│   │   ├── Timer.tsx
│   │   ├── Whiteboard.tsx
│   │   └── VideoChat.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOnboarding.ts
│   │   ├── useQuestions.ts
│   │   ├── useProgress.ts
│   │   ├── useFocus.ts
│   │   ├── usePeer.ts
│   │   └── useOffline.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Practice.tsx
│   │   ├── Quiz.tsx
│   │   ├── FocusMode.tsx
│   │   ├── Progress.tsx
│   │   ├── PeerLobby.tsx
│   │   ├── StudyRoom.tsx
│   │   └── Battle.tsx
│   ├── store/
│   │   ├── authStore.ts                 # Zustand store for auth
│   │   ├── questionStore.ts
│   │   ├── progressStore.ts
│   │   └── peerStore.ts
│   ├── lib/
│   │   ├── auth0.ts                     # Auth0 config
│   │   ├── supabase.ts                  # Supabase realtime client
│   │   ├── webrtc.ts                    # WebRTC helpers
│   │   ├── offlineDb.ts                 # IndexedDB wrapper (Dexie)
│   │   └── sync.ts                      # Offline sync logic
│   ├── types/
│   │   ├── user.ts
│   │   ├── question.ts
│   │   ├── progress.ts
│   │   └── peer.ts
│   └── styles/
│       └── globals.css                  # Tailwind imports
├── index.html
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Backend (`/backend`)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app entry
│   ├── config.py                        # Settings & env vars
│   ├── dependencies.py                  # Dependency injection
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py                # Main API router
│   │   │   ├── auth.py                  # Auth endpoints
│   │   │   ├── onboarding.py            # Onboarding endpoints
│   │   │   ├── questions.py             # Question CRUD & generation
│   │   │   ├── practice.py              # Practice session endpoints
│   │   │   ├── progress.py              # Progress & analytics
│   │   │   ├── focus.py                 # Focus mode endpoints
│   │   │   └── peer.py                  # Peer mentoring endpoints
│   │   └── deps.py                      # Route dependencies
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py                  # Auth0 JWT validation
│   │   ├── gemini.py                    # Gemini Flash 3 client
│   │   └── exceptions.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py                      # SQLAlchemy models
│   │   ├── question.py
│   │   ├── onboarding.py
│   │   ├── progress.py
│   │   ├── focus_session.py
│   │   └── peer_session.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py                      # Pydantic schemas
│   │   ├── question.py
│   │   ├── onboarding.py
│   │   ├── progress.py
│   │   └── peer.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── onboarding_service.py
│   │   ├── question_service.py          # Question generation logic
│   │   ├── practice_service.py
│   │   ├── progress_service.py          # Analytics calculations
│   │   ├── focus_service.py
│   │   └── peer_service.py
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py                      # SQLAlchemy base
│   │   ├── session.py                   # DB session
│   │   └── init_db.py                   # Initial data seeding
│   └── curriculum/
│       ├── __init__.py
│       ├── cbse_10_math.json            # CBSE Class 10 Math topics
│       ├── cbse_10_science.json         # CBSE Class 10 Science topics
│       ├── cbse_12_math.json            # CBSE Class 12 Math topics
│       ├── cbse_12_science.json         # CBSE Class 12 Science topics
│       └── onboarding_questions.json    # 100 onboarding questions
├── alembic/
│   ├── versions/
│   └── env.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── api/
├── alembic.ini
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## Key Files Quick Reference

### Authentication (Server-Side OAuth)
| File | Purpose |
|------|---------|
| `backend/app/core/security.py` | Cookie + JWT validation |
| `backend/app/core/oauth.py` | Authlib OAuth client for Auth0 |
| `backend/app/core/session.py` | Session cookie utilities |
| `backend/app/api/v1/auth.py` | Auth endpoints (login, callback, logout, me) |
| `web/src/hooks/useAuth.ts` | Auth hook (redirect-based, no SDK) |
| `app/.../data/remote/AuthManager.kt` | Auth0 Android SDK wrapper |

### Onboarding (10 questions from 100)
| File | Purpose |
|------|---------|
| `backend/app/curriculum/onboarding_questions.json` | Pool of 100 questions |
| `backend/app/services/onboarding_service.py` | Random selection logic |
| `backend/app/api/v1/onboarding.py` | Onboarding API |
| `web/src/pages/Onboarding.tsx` | Web onboarding UI |
| `app/.../ui/screens/onboarding/OnboardingScreen.kt` | Android onboarding UI |

### Question Generation (Gemini)
| File | Purpose |
|------|---------|
| `backend/app/core/gemini.py` | Gemini Flash 3 client |
| `backend/app/services/question_service.py` | Question generation logic |

### Offline Sync
| File | Purpose |
|------|---------|
| `app/.../sync/SyncWorker.kt` | Android WorkManager sync |
| `web/src/lib/offlineDb.ts` | IndexedDB (Dexie) wrapper |
| `web/src/lib/sync.ts` | Web sync logic |

### Peer Collaboration
| File | Purpose |
|------|---------|
| `backend/app/api/v1/peer.py` | Peer session management |
| `web/src/lib/webrtc.ts` | WebRTC for video/audio |
| `web/src/components/Whiteboard.tsx` | Shared whiteboard |
| `web/src/components/VideoChat.tsx` | Video chat component |

---

## Database Schema (Supabase/PostgreSQL)

### Tables
- `users` - User profiles (synced from Auth0)
- `onboarding_responses` - User's onboarding answers
- `user_profiles` - Extended profile (class, subjects, goals)
- `questions` - Question bank
- `question_attempts` - User's question attempts
- `progress_snapshots` - Periodic progress snapshots
- `concept_scores` - Per-concept scores
- `focus_sessions` - Pomodoro sessions
- `peer_sessions` - Study room/battle sessions
- `peer_messages` - Chat messages
- `shared_notes` - Community notes

---

## API Endpoints Overview

### Auth (`/api/v1/auth`) - Server-Side OAuth
- `GET /login` - Redirect to Auth0/Google OAuth
- `GET /callback` - OAuth callback, set session cookie
- `POST /logout` - Clear session cookie
- `GET /me` - Get current user (cookie auth)

### Onboarding (`/api/v1/onboarding`)
- `GET /questions` - Get 10 random questions from 100
- `POST /submit` - Submit onboarding answers
- `GET /status` - Check if onboarding completed

### Questions (`/api/v1/questions`)
- `GET /topics` - Get curriculum topics
- `POST /generate` - Generate questions (Gemini)
- `GET /bank` - Get from question bank
- `POST /attempt` - Submit answer

### Progress (`/api/v1/progress`)
- `GET /dashboard` - Get dashboard data
- `GET /concepts` - Get concept-wise breakdown
- `GET /trends` - Get progress trends

### Focus (`/api/v1/focus`)
- `POST /start` - Start focus session
- `POST /end` - End focus session
- `GET /history` - Get session history

### Peer (`/api/v1/peer`)
- `GET /rooms` - List available rooms
- `POST /rooms` - Create room
- `POST /rooms/{id}/join` - Join room
- `GET /battles` - List battles
- `POST /battles` - Create battle

---

## Environment Variables

### Backend (`.env`)
```
SUPABASE_URL=
SUPABASE_KEY=
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=
SESSION_SECRET_KEY=
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=
```

### Web (`.env`)
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Android (`local.properties` or BuildConfig)
```
AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_SCHEME=prepverse
API_BASE_URL=
```

---

## Feature Flags & Constants

Located in:
- Android: `app/.../util/Constants.kt`
- Web: `web/src/lib/constants.ts`
- Backend: `backend/app/config.py`

Key constants:
- `ONBOARDING_QUESTION_COUNT = 10`
- `ONBOARDING_QUESTION_POOL = 100`
- `POMODORO_WORK_MINUTES = 25`
- `POMODORO_BREAK_MINUTES = 5`
- `MAX_DAILY_XP = 500`
- `BATTLE_QUESTION_COUNT = 10`
- `BATTLE_TIME_SECONDS = 300`

---

## Search Shortcuts

Instead of searching, check these files directly:

| Looking for... | Check this file |
|----------------|-----------------|
| Auth0 setup | `web/src/lib/auth0.ts`, `app/.../di/AuthModule.kt` |
| API client | `web/src/api/client.ts`, `app/.../data/remote/api/PrepVerseApi.kt` |
| Navigation | `web/src/App.tsx`, `app/.../ui/navigation/NavGraph.kt` |
| Theme/Colors | `web/tailwind.config.js`, `app/.../ui/theme/Theme.kt` |
| DB schema | `backend/app/models/` |
| Curriculum data | `backend/app/curriculum/` |
| Offline sync | `app/.../sync/`, `web/src/lib/sync.ts` |

---

## Development Commands

```bash
# Backend (using uv)
cd backend && uv run uvicorn app.main:app --reload

# Backend (using run script)
cd backend && ./run.sh

# Web
cd web && npm run dev

# Android
./gradlew assembleDebug
```

---

## Web UI Components (Created)

### Core UI Components (`web/src/components/ui/`)
| File | Purpose |
|------|---------|
| `CosmicBackground.tsx` | Animated starfield background with floating orbs |
| `PrepVerseLogo.tsx` | Geometric logo with pulsing glow animation |
| `GoogleSignInButton.tsx` | Magnetic hover button for Google sign-in |

### Onboarding Components (`web/src/components/onboarding/`)
| File | Purpose |
|------|---------|
| `WelcomeScreen.tsx` | Initial welcome with class selection |
| `ClassSelector.tsx` | Dramatic card-based class (10/12) selection |
| `QuestionCard.tsx` | MCQ question display with A/B/C/D options |
| `AssessmentTimer.tsx` | Circular countdown timer with warning states |
| `ProgressIndicator.tsx` | Segmented progress bar for question tracking |
| `ResultsScreen.tsx` | Score reveal with subject breakdown |

### Pages (`web/src/pages/`)
| File | Purpose |
|------|---------|
| `Login.tsx` | Login screen with cosmic theme |
| `Onboarding.tsx` | Full onboarding flow orchestrator |

### Design System
- **Fonts**: Fraunces (display), Space Grotesk (body), JetBrains Mono (mono)
- **Primary**: `#E53935` (PrepVerse Red)
- **Background**: `#0A0A0C` (void), `#121218` (deep), `#1A1A24` (surface)
- **Accents**: Cyan `#00FFD1`, Purple `#B388FF`, Gold `#FFD54F`, Blue `#536DFE`

### Auth Integration Files (`web/src/`)
| File | Purpose |
|------|---------|
| `hooks/useAuth.ts` | Custom auth hook (loginWithGoogle redirects to backend) |
| `api/client.ts` | Axios instance with withCredentials for cookies |
| `api/onboarding.ts` | Onboarding API functions (getStatus, getQuestions, submit) |

---

## Android Files (Created)

### Core Application
| File | Purpose |
|------|---------|
| `PrepVerseApp.kt` | Hilt Application class |
| `MainActivity.kt` | Single Activity host with Compose |

### Theme (`ui/theme/`)
| File | Purpose |
|------|---------|
| `Color.kt` | Color definitions (PrepVerse palette) |
| `Type.kt` | Typography definitions |
| `Theme.kt` | Material3 theme configuration |

### Navigation (`ui/navigation/`)
| File | Purpose |
|------|---------|
| `Routes.kt` | Navigation route definitions |
| `NavGraph.kt` | Navigation graph with composable destinations |

### Screens (`ui/screens/`)
| File | Purpose |
|------|---------|
| `auth/LoginScreen.kt` | Cosmic-themed login with Google sign-in |
| `auth/LoginViewModel.kt` | Login state management |
| `onboarding/OnboardingScreen.kt` | 4-step onboarding flow (Welcome, Class Selection, Assessment, Results) |
| `onboarding/OnboardingViewModel.kt` | Onboarding state and logic |
| `dashboard/DashboardScreen.kt` | Main dashboard with streak, actions, topics |

### Data Layer (`data/`)
| File | Purpose |
|------|---------|
| `remote/AuthManager.kt` | Auth0 SDK wrapper with Google OAuth |
| `remote/api/PrepVerseApi.kt` | Retrofit API interface for backend calls |
| `remote/api/dto/UserDtos.kt` | User profile DTOs |
| `remote/api/dto/QuestionDtos.kt` | Question-related DTOs |
| `remote/api/dto/OnboardingDtos.kt` | Onboarding submission/response DTOs |
| `repository/AuthRepository.kt` | Auth API calls with error handling |
| `repository/OnboardingRepository.kt` | Onboarding API calls |
| `repository/QuestionRepository.kt` | Question generation API calls |

### Domain Models (`domain/model/`)
| File | Purpose |
|------|---------|
| `User.kt` | User and UserProfile models |
| `Question.kt` | OnboardingQuestion, Question, QuestionAttempt, Subject, Difficulty models |

### DI (`di/`)
| File | Purpose |
|------|---------|
| `AppModule.kt` | Hilt module providing AuthManager |
| `NetworkModule.kt` | Retrofit, OkHttp, Moshi configuration with auth interceptor |

---

## Backend Files (Created)

### Core Application (`backend/app/`)
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app entry point with CORS, routers |
| `config.py` | Settings using pydantic-settings (env vars) |
| `__init__.py` | Package initialization |

### Core Modules (`backend/app/core/`)
| File | Purpose |
|------|---------|
| `security.py` | Flexible auth (cookie for web, Bearer token for mobile) |
| `oauth.py` | Authlib OAuth client for Auth0 |
| `session.py` | Session token creation/validation |
| `gemini.py` | Google Gemini Flash 3 client for question generation |
| `__init__.py` | Package initialization |

### Database (`backend/app/db/`)
| File | Purpose |
|------|---------|
| `session.py` | Supabase client initialization |
| `__init__.py` | Package initialization |

### API Routes (`backend/app/api/v1/`)
| File | Purpose |
|------|---------|
| `router.py` | Main API router aggregating all endpoints |
| `auth.py` | Auth endpoints (/me, /callback) |
| `onboarding.py` | Onboarding endpoints (GET /questions, POST /submit, GET /status) |
| `questions.py` | Question generation and retrieval endpoints |
| `__init__.py` | Package initialization |

### Schemas (`backend/app/schemas/`)
| File | Purpose |
|------|---------|
| `user.py` | User-related Pydantic schemas |
| `question.py` | Question-related Pydantic schemas |
| `onboarding.py` | Onboarding request/response schemas |
| `__init__.py` | Package initialization |

### Services (`backend/app/services/`)
| File | Purpose |
|------|---------|
| `onboarding_service.py` | Random 10-question selection from 100-question pool |
| `__init__.py` | Package initialization |

### Curriculum Data (`backend/app/curriculum/`)
| File | Purpose |
|------|---------|
| `onboarding_questions.json` | 100 onboarding questions for CBSE 10 & 12 |

### Backend Root Files
| File | Purpose |
|------|---------|
| `pyproject.toml` | Python project config & dependencies (uv) |
| `requirements.txt` | Legacy pip dependencies |
| `.python-version` | Python version for uv (3.11) |
| `.env.example` | Environment variable template |
| `.gitignore` | Git ignore patterns |
| `run.sh` | Development server startup script |
| `database_schema.sql` | Complete Supabase schema with RLS policies |
| `README.md` | Project overview and setup |
| `QUICKSTART.md` | 5-minute setup guide |
| `API_EXAMPLES.md` | API endpoint examples with curl |
| `DEPLOYMENT.md` | Production deployment guide |
| `PROJECT_SUMMARY.md` | Complete project implementation summary |

---

## Configuration Files

### Android
- `app/build.gradle.kts` - Jetpack Compose, Hilt, Room, Retrofit, Auth0 dependencies
- `gradle/libs.versions.toml` - Version catalog
- `AndroidManifest.xml` - Auth0 redirect activity configured

### Web
- `package.json` - Vite, React, TypeScript, TailwindCSS
- `tailwind.config.js` - Custom theme with PrepVerse colors
- `vite.config.ts` - Vite configuration

---

---

## Recent Updates & Fixes

### 2024-12-24 Session 2
- **Web Auth0 Integration**: Complete Auth0 + Google OAuth integration
  - Added Auth0Provider wrapper in `main.tsx`
  - Created `useAuth` hook for authentication
  - Created API client with automatic Bearer token injection
  - Created Callback page for Auth0 redirect handling
  - Updated `Login.tsx` with actual Google sign-in
  - Added onboarding API functions
- **FastAPI Backend**: Complete backend structure created
  - Auth0 JWT validation using JWKS
  - Gemini Flash 3 client for AI
  - Supabase client for database
  - Onboarding service (10 random from 100 questions)
  - Complete API endpoints for auth, onboarding, questions
  - Database schema with Row Level Security
- **Android Build Fix**: Fixed `Type.kt` by removing unused imports
  - Removed `import com.prepverse.prepverse.R`
  - Removed `import androidx.compose.ui.text.font.Font`
  - (File uses FontFamily.Default/Monospace instead of custom fonts)
- **Backend Package Manager**: Switched from pip to uv
  - Created `pyproject.toml` with all dependencies
  - Updated `run.sh` to use uv sync/run
  - Added `.python-version` file (3.11)
  - Updated documentation (README.md, QUICKSTART.md)

### 2024-12-25 - Server-Side OAuth Migration
- **Backend OAuth**: Migrated from client-side Auth0 SDK to server-side OAuth
  - Added `authlib`, `itsdangerous`, `httpx` dependencies
  - Created `backend/app/core/oauth.py` - Authlib OAuth client for Auth0
  - Created `backend/app/core/session.py` - Session cookie utilities
  - Rewrote `backend/app/api/v1/auth.py` with new endpoints:
    - `GET /login` - Redirects to Auth0/Google
    - `GET /callback` - Exchanges code, sets HTTP-only cookie
    - `POST /logout` - Clears session cookie
    - `GET /me` - Returns user profile (cookie auth)
  - Updated `backend/app/core/security.py` with `get_current_user_from_cookie()`
  - Added `SessionMiddleware` in `main.py`
  - New config: `AUTH0_CLIENT_SECRET`, `SESSION_SECRET_KEY`, `FRONTEND_URL`

- **Web Frontend Simplified**: Removed Auth0 React SDK
  - Removed `@auth0/auth0-react` dependency
  - Deleted `web/src/lib/auth0.ts` and `web/src/pages/Callback.tsx`
  - Rewrote `web/src/hooks/useAuth.ts` - now redirects to backend
  - Updated `web/src/api/client.ts` - uses `withCredentials: true`
  - Simplified `main.tsx` and `App.tsx` (no Auth0Provider)

- **Auth Flow Change**:
  - Old: Frontend → Auth0 SDK → Get JWT → Send Bearer token
  - New: Frontend → Backend `/auth/login` → Auth0 → Backend `/auth/callback` → Set cookie

### 2024-12-25 - Android-Backend API Integration
- **Backend Dual Auth**: Added `get_current_user_flexible()` in `security.py`
  - Supports both HTTP-only cookie (web) and Bearer token (mobile)
  - Updated `/auth/me` endpoint to use flexible auth
  - Mobile apps use JWT from Auth0 SDK directly

- **Android Network Layer**: Complete Retrofit + OkHttp setup
  - Created `NetworkModule.kt` with:
    - Auth interceptor (adds Bearer token from Auth0)
    - Logging interceptor for debugging
    - Moshi JSON converter
  - Created `PrepVerseApi.kt` Retrofit interface:
    - `GET /api/v1/auth/me` - Get user profile
    - `GET /api/v1/onboarding/questions` - Get onboarding questions
    - `POST /api/v1/onboarding/submit` - Submit onboarding answers
    - `GET /api/v1/onboarding/status` - Check onboarding status
    - `POST /api/v1/questions/generate` - Generate AI questions
  - Created DTOs in `data/remote/api/dto/`:
    - `UserDtos.kt` - UserProfileResponse
    - `QuestionDtos.kt` - QuestionResponse, GenerateQuestionsRequest/Response
    - `OnboardingDtos.kt` - OnboardingSubmission, OnboardingResponse, OnboardingStatusResponse

- **Android Repositories**: Error-handling API wrappers
  - `AuthRepository.kt` - User profile fetching
  - `OnboardingRepository.kt` - Questions and submission
  - `QuestionRepository.kt` - AI question generation

- **ViewModel Updates**: Real API integration
  - `LoginViewModel.kt` - Fetches user profile from backend after Auth0 login
  - `OnboardingViewModel.kt` - Fetches real questions, submits to backend

- **Dev Config**: API base URL set to `http://10.0.2.2:8000` for Android emulator
  - Uses `10.0.2.2` which maps to host localhost from emulator

---

*Last Updated: 2024-12-25*
