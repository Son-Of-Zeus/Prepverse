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

### Authentication
| File | Purpose |
|------|---------|
| `backend/app/core/security.py` | Auth0 JWT validation |
| `backend/app/api/v1/auth.py` | Auth endpoints |
| `web/src/lib/auth0.ts` | Auth0 React SDK config |
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

### Auth (`/api/v1/auth`)
- `POST /callback` - Auth0 callback, create/update user
- `GET /me` - Get current user

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
SUPABASE_SERVICE_KEY=
AUTH0_DOMAIN=
AUTH0_API_AUDIENCE=
AUTH0_CLIENT_ID=
GEMINI_API_KEY=
```

### Web (`.env`)
```
VITE_API_URL=
VITE_AUTH0_DOMAIN=
VITE_AUTH0_CLIENT_ID=
VITE_AUTH0_AUDIENCE=
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

### Auth0 Integration Files (`web/src/`)
| File | Purpose |
|------|---------|
| `lib/auth0.ts` | Auth0Provider configuration (domain, clientId, audience, Google OAuth) |
| `hooks/useAuth.ts` | Custom auth hook (loginWithGoogle, logout, getAccessToken) |
| `api/client.ts` | Axios instance with Bearer token interceptor |
| `api/onboarding.ts` | Onboarding API functions (getStatus, getQuestions, submit) |
| `pages/Callback.tsx` | Auth0 callback handler with loading/error states |

### Web Root Files (Auth0)
| File | Purpose |
|------|---------|
| `.env.example` | Environment template for Auth0 config |
| `AUTH0_SETUP.md` | Comprehensive Auth0 setup guide |
| `INSTALLATION.md` | Quick installation guide |
| `QUICKSTART.md` | 5-minute quick start guide |
| `AUTH0_INTEGRATION_SUMMARY.md` | Complete implementation summary |
| `SETUP_CHECKLIST.md` | Setup verification checklist |

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

### Domain Models (`domain/model/`)
| File | Purpose |
|------|---------|
| `User.kt` | User and UserProfile models |
| `Question.kt` | OnboardingQuestion, Question, QuestionAttempt, Subject, Difficulty models |

### DI (`di/`)
| File | Purpose |
|------|---------|
| `AppModule.kt` | Hilt module providing AuthManager |

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
| `security.py` | Auth0 JWT validation using JWKS |
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

---

*Last Updated: 2024-12-24*
