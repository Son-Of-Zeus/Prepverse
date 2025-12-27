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

### Authentication (Server-Side OAuth - All Platforms)
| File | Purpose |
|------|---------|
| `backend/app/core/security.py` | Cookie + session token Bearer validation |
| `backend/app/core/oauth.py` | Authlib OAuth client for Auth0 |
| `backend/app/core/session.py` | Session token creation/validation |
| `backend/app/api/v1/auth.py` | Auth endpoints (login?platform=, callback, logout, me) |
| `web/src/hooks/useAuth.ts` | Auth hook (redirect-based, uses cookies) |
| `app/.../data/remote/AuthManager.kt` | Chrome Custom Tabs OAuth, TokenStorage |
| `app/.../data/local/TokenStorage.kt` | Encrypted token persistence |
| `app/.../AuthCallbackActivity.kt` | Deep link handler for prepverse://auth/callback |

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
| Web auth | `web/src/hooks/useAuth.ts`, `web/src/api/client.ts` |
| Backend auth | `backend/app/core/security.py`, `backend/app/api/v1/auth.py` |
| Android auth | `app/.../data/remote/AuthManager.kt`, `app/.../di/AuthModule.kt` |
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
| `AuthCallbackActivity.kt` | Deep link handler for OAuth callback |

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
| `dashboard/DashboardViewModel.kt` | Fetches progress data from API (streak, XP, suggested topics) |

### Data Layer (`data/`)
| File | Purpose |
|------|---------|
| `local/TokenStorage.kt` | Encrypted token storage (EncryptedSharedPreferences) |
| `local/FocusModePreferences.kt` | DataStore preferences for focus mode settings |
| `remote/AuthManager.kt` | Server-side OAuth via Chrome Custom Tabs |
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
| `FocusSession.kt` | FocusSession, FocusState, FocusModeSettings models |

### Services (`services/`)
| File | Purpose |
|------|---------|
| `FocusAccessibilityService.kt` | Monitors foreground app, detects violations when user leaves app |
| `FocusModeService.kt` | Foreground service managing focus timer, DND, and session state |

### Focus Mode Screens (`ui/screens/focus/`)
| File | Purpose |
|------|---------|
| `FocusModeScreen.kt` | Main focus mode UI with timer, settings, controls |
| `FocusModeViewModel.kt` | Focus mode state management |
| `FocusDialogs.kt` | Warning, settings, violation, break, and completion dialogs |

### Onboarding Updates (`ui/screens/onboarding/`)
| File | Purpose |
|------|---------|
| `QuizFocusProtection.kt` | Focus protection wrapper for onboarding quiz (3 violations = termination) |

### Permission Screen (`ui/screens/permission/`)
| File | Purpose |
|------|---------|
| `PermissionScreen.kt` | Mandatory permission screen shown on app start (Accessibility, DND, Notifications) |

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

### 2024-12-25 - Android Server-Side OAuth Migration
- **Goal**: Migrate Android from client-side Auth0 SDK to server-side OAuth (matching web)
- **Auth Flow Now Unified**:
  - Android opens Chrome Custom Tabs → Backend `/auth/login?platform=android`
  - Backend redirects to Auth0 Universal Login (hosted by Auth0)
  - Auth0 redirects back to Backend `/auth/callback`
  - Backend creates session token and redirects to `prepverse://auth/callback?token=xxx`
  - Android receives deep link, stores token securely

- **Backend Changes**:
  - `config.py`: Added `ANDROID_CALLBACK_URL = "prepverse://auth/callback"`
  - `auth.py`: Added `platform` param to `/auth/login`, platform-aware callback response
  - `security.py`: `get_current_user_flexible()` now verifies session tokens as Bearer (not just Auth0 JWT)

- **Android Changes**:
  - Removed Auth0 SDK dependency
  - Added `androidx.browser:browser:1.8.0` (Chrome Custom Tabs)
  - Added `androidx.security:security-crypto:1.1.0-alpha06` (EncryptedSharedPreferences)
  - New files:
    - `data/local/TokenStorage.kt` - Encrypted token storage
    - `AuthCallbackActivity.kt` - Deep link handler for `prepverse://auth/callback`
  - Rewrote `AuthManager.kt` - Uses Chrome Custom Tabs + TokenStorage
  - Updated `LoginViewModel.kt` - Observes AuthManager.authState
  - Updated `AndroidManifest.xml` - New intent filter for deep link

- **Removed**:
  - Auth0 SDK dependency (`com.auth0.android:auth0`)
  - Auth0 BuildConfig fields and manifest placeholders
  - Auth0 RedirectActivity from manifest
  - Old AuthResult, ProfileResult, LogoutResult sealed classes

---

### 2024-12-26 - Focus Mode Implementation
- **Android Focus Mode**: Complete implementation of focus mode with app blocking
  - New files created:
    - `services/FocusAccessibilityService.kt` - AccessibilityService for app switch detection
    - `services/FocusModeService.kt` - Foreground service for timer and DND
    - `data/local/FocusModePreferences.kt` - DataStore for focus settings
    - `domain/model/FocusSession.kt` - Focus session and settings models
    - `ui/screens/focus/FocusModeScreen.kt` - Main focus mode UI
    - `ui/screens/focus/FocusModeViewModel.kt` - Focus state management
    - `ui/screens/focus/FocusDialogs.kt` - All focus-related dialogs
    - `ui/screens/onboarding/QuizFocusProtection.kt` - Quiz focus protection
    - `res/xml/focus_accessibility_config.xml` - Accessibility service config

  - **Features**:
    - Configurable pomodoro timer (5-120 min focus, 1-30 min break)
    - App blocking via AccessibilityService (detects app switches)
    - Do Not Disturb mode integration
    - Violation tracking (3 violations = session terminated)
    - Pre-session warning dialog
    - Break timer with skip option
    - Session completion statistics

  - **Quiz Protection**:
    - Onboarding quiz now wrapped with QuizFocusProtection
    - Shows warning dialog before quiz
    - 3 violations terminate quiz and redirect to dashboard
    - Violations displayed in quiz header

  - **Permissions Added** (AndroidManifest.xml):
    - `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`
    - `POST_NOTIFICATIONS`, `ACCESS_NOTIFICATION_POLICY`
    - `SYSTEM_ALERT_WINDOW`, `PACKAGE_USAGE_STATS`

  - **String Resources**: Added 50+ strings for focus mode UI

  - **Mandatory Permission Screen**: Added PermissionScreen that blocks app until permissions granted
    - Created `ui/screens/permission/PermissionScreen.kt`
    - Added `Routes.Permissions` as new start destination
    - Updated NavGraph to start with permission check
    - Requires: Accessibility Service, DND Access, Notifications (Android 13+)
    - Auto-navigates to Login after all permissions granted
    - Re-checks permissions when user returns from Settings

### 2024-12-27 - Practice Mode Implementation
- **Backend Practice APIs**: Full practice session management with adaptive difficulty
  - New files:
    - `backend/practice_schema.sql` - Database tables for questions, sessions, concept scores
    - `backend/app/schemas/practice.py` - Pydantic schemas for practice endpoints
    - `backend/app/services/practice_service.py` - Practice service with concept-based adaptive difficulty
    - `backend/app/api/v1/practice.py` - Practice API endpoints
  - Updated `backend/app/api/v1/router.py` - Added practice router

  - **Database Tables Added**:
    - `questions` - Cached questions from Gemini (reusable)
    - `practice_sessions` - Session metadata and results
    - `practice_session_questions` - Questions assigned to sessions with answers
    - `concept_scores` - Per-topic mastery tracking for adaptive difficulty
    - `curriculum_topics` - Available topics for practice (pre-seeded)

  - **API Endpoints** (`/api/v1/practice`):
    - `GET /topics` - Get available curriculum topics
    - `POST /session/start` - Start a practice session
    - `GET /session/{id}/next` - Get next question
    - `POST /session/{id}/submit` - Submit answer with feedback
    - `POST /session/{id}/end` - End session, get summary
    - `GET /session/{id}/review` - Get full session review
    - `GET /history` - Paginated session history
    - `GET /progress/concepts` - Concept mastery scores
    - `GET /progress/summary` - Overall progress summary

  - **Adaptive Difficulty Algorithm**:
    - Tracks per-concept mastery score (0-100)
    - Adjusts question difficulty based on accuracy
    - <40% mastery → mostly easy questions
    - 40-70% mastery → mix of easy/medium
    - >70% mastery → more hard questions

- **Android Practice Mode**: Complete UI implementation
  - New files:
    - `data/remote/api/dto/PracticeDtos.kt` - Practice DTOs
    - `data/repository/PracticeRepository.kt` - Practice API calls
    - `ui/screens/practice/PracticeViewModel.kt` - Topic selection state
    - `ui/screens/practice/PracticeScreen.kt` - Topic selector UI
    - `ui/screens/practice/QuizViewModel.kt` - Quiz session state with timer
    - `ui/screens/practice/QuizScreen.kt` - Quiz UI with answer feedback
    - `ui/screens/practice/ResultsViewModel.kt` - Results state
    - `ui/screens/practice/ResultsScreen.kt` - Score summary and question review

  - Updated files:
    - `data/remote/api/PrepVerseApi.kt` - Added 10 practice endpoints
    - `ui/navigation/Routes.kt` - Added Quiz and Results routes with sessionId
    - `ui/navigation/NavGraph.kt` - Wired Practice → Quiz → Results navigation

  - **Features**:
    - Subject/topic selection with filtering
    - Difficulty selection (Easy/Medium/Hard/Adaptive)
    - Configurable question count (5-30)
    - Optional time limit (5/10/15/20 min)
    - Per-question timer tracking
    - Answer submission with instant feedback
    - Explanation shown after each answer
    - Session summary with score breakdown
    - Full question review with correct answers
    - Difficulty breakdown in results
    - Weak/strong topic identification

---

## Important Patterns & Gotchas

### Backend User ID Resolution

**CRITICAL**: When accessing the database user ID in API endpoints, ALWAYS use `get_db_user_id()`:

```python
from app.core.security import get_current_user_flexible, get_db_user_id

@router.get("/example")
async def example_endpoint(
    current_user: dict = Depends(get_current_user_flexible),
    db=Depends(get_db),
):
    user_id = await get_db_user_id(current_user, db)  # ✅ CORRECT
```

**DO NOT** use these patterns (they break for legacy JWT auth):
```python
# ❌ WRONG - 'id' key doesn't exist
user_id = current_user.get("db_id") or current_user.get("id")

# ❌ WRONG - returns Auth0 ID, not database UUID
user_id = current_user.get("user_id")
```

**Why this matters**: The `current_user` dict has different fields depending on auth method:
- Session auth (cookie/bearer_session): Has `db_id` (database UUID)
- Legacy JWT auth (bearer_jwt): Only has `user_id` (Auth0 ID like `google-oauth2|...`)

The `get_db_user_id()` function in `backend/app/core/security.py` handles both cases by looking up the database UUID from Auth0 ID when needed.

---

### 2024-12-27 - School Selection Feature

Added CBSE school selection for study battles and matchmaking.

**Data Source**: [deedy/cbse_schools_data](https://github.com/deedy/cbse_schools_data) (CC-BY-SA 4.0)
- 20,367 CBSE affiliated schools
- Includes affiliation code, name, state, district, contact info

**New Files Created**:

| File | Purpose |
|------|---------|
| `backend/schools_schema.sql` | Schools table + school_id on users |
| `backend/scripts/import_schools.py` | Script to import schools.csv into Supabase |
| `backend/app/schemas/school.py` | School Pydantic schemas |
| `backend/app/api/v1/schools.py` | School API endpoints with web frontend instructions |
| `app/.../data/remote/api/dto/SchoolDtos.kt` | Android school DTOs |
| `app/.../data/repository/SchoolRepository.kt` | Android school API calls |

**Updated Files**:

| File | Changes |
|------|---------|
| `backend/app/api/v1/router.py` | Added schools router |
| `app/.../data/remote/api/PrepVerseApi.kt` | Added school endpoints |
| `app/.../domain/model/User.kt` | Added School model, schoolId to User |
| `app/.../ui/screens/onboarding/OnboardingViewModel.kt` | Added school search & selection |
| `app/.../ui/screens/onboarding/OnboardingScreen.kt` | Added SchoolSelectionStep UI |
| `app/.../ui/navigation/NavGraph.kt` | Added school callbacks |

**API Endpoints** (`/api/v1/schools`):
- `GET /search?q=&state=&limit=` - Search schools by name/code
- `GET /states` - List states with school counts
- `GET /{school_id}` - Get school details
- `POST /set` - Set user's school
- `GET /user/current` - Get current user's school

**Onboarding Flow Change**:
Welcome → Class Selection → **School Selection (new)** → Assessment → Results

---

*Last Updated: 2024-12-27*
