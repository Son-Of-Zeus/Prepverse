# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PrepVerse** is an adaptive learning platform for CBSE 10th and 12th students. It's a multi-platform application with three main components:

| Component | Technology | Location |
|-----------|------------|----------|
| Android App | Kotlin, Jetpack Compose, Hilt | `/app` |
| Web App (PWA) | React 18, TypeScript, Vite, TailwindCSS | `/web` |
| Backend API | FastAPI, Python 3.11+, Supabase | `/backend` |

## Development Commands

### Backend (FastAPI)
```bash
cd backend
uv sync                                    # Install dependencies
uv run uvicorn app.main:app --reload       # Start dev server (port 8000)
./run.sh                                   # Alternative: run script

# Testing
uv run pytest                              # Run all tests
uv run pytest tests/api/test_auth.py      # Single test file
uv run ruff check .                        # Lint
```

### Web (React + Vite)
```bash
cd web
npm install                                # Install dependencies
npm run dev                                # Start dev server (port 5173)
npm run build                              # Production build (runs tsc first)
npm run lint                               # ESLint check
```

### Android (Gradle)
```bash
./gradlew assembleDebug                    # Debug APK
./gradlew assembleRelease                  # Release APK
./gradlew test                             # Unit tests
./gradlew connectedAndroidTest             # Instrumentation tests
```

## Architecture

### Authentication Flow
All platforms use **Auth0 with Google OAuth only**.

**Web (Server-Side OAuth with Cookies):**
- Frontend redirects to backend `/api/v1/auth/login`
- Backend handles OAuth flow with Auth0 using Authlib
- On success, backend sets HTTP-only session cookie
- All API requests include cookie automatically (`withCredentials: true`)
- No client-side token management needed
- See: `backend/app/core/oauth.py`, `backend/app/api/v1/auth.py`

**Android (Client-Side OAuth with Bearer Tokens):**
- Uses Auth0 Android SDK for authentication
- JWT access tokens sent via `Authorization: Bearer` header
- See: `app/.../data/remote/AuthManager.kt`

**Backend (Dual Auth Support):**
- Supports both HTTP-only cookies (web) and Bearer tokens (mobile)
- `get_current_user_flexible()` tries cookie first, then Bearer token
- JWT validation via Auth0 JWKS endpoint
- See: `backend/app/core/security.py`

### Backend Structure
```
backend/app/
├── api/v1/           # Route handlers (auth, onboarding, questions, etc.)
├── core/             # Security (JWT), Gemini AI client
├── services/         # Business logic
├── schemas/          # Pydantic request/response models
├── curriculum/       # Static JSON data (100 onboarding questions)
└── db/               # Supabase client initialization
```

### Android Structure (Clean Architecture)
```
app/src/main/java/com/prepverse/prepverse/
├── di/               # Hilt dependency injection modules
├── data/             # Repository implementations, Room DB, Retrofit API
├── domain/           # Models and use cases
├── ui/               # Compose screens and ViewModels
└── sync/             # WorkManager offline sync
```

### Web Structure
```
web/src/
├── api/              # Axios client with auth interceptor
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks (useAuth, useOnboarding, etc.)
├── pages/            # Route pages
├── store/            # Zustand state management
└── lib/              # Auth0, Supabase, WebRTC helpers
```

## Key Integration Points

### Onboarding Flow
- 10 questions randomly selected from 100-question pool in `backend/app/curriculum/onboarding_questions.json`
- Selection logic: `backend/app/services/onboarding_service.py`
- Distribution: 4 Math, 3 Physics, 2 Chemistry, 1 Biology

### AI Question Generation
- Uses Google Gemini Flash 3 API
- Client: `backend/app/core/gemini.py`
- Questions dynamically generated based on CBSE curriculum, user class (10/12), and mastery level

### Offline Sync
- Android: Room DB + WorkManager → `app/.../sync/SyncWorker.kt`
- Web: IndexedDB (Dexie.js) + Service Worker → `web/src/lib/offlineDb.ts`

### Real-time Features
- Supabase Realtime for presence and messaging → `web/src/lib/supabase.ts`
- WebRTC for video/audio in peer sessions → `web/src/lib/webrtc.ts`

## Environment Variables

### Backend (`backend/.env`)
```
SUPABASE_URL, SUPABASE_KEY, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_AUDIENCE, SESSION_SECRET_KEY, FRONTEND_URL, GEMINI_API_KEY
```

### Web (`web/.env`)
```
VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```
Note: Web uses server-side OAuth, so Auth0 credentials are only needed in backend.

### Android
Auth0 config in `app/build.gradle.kts` (manifestPlaceholders and BuildConfig fields)

## Database

PostgreSQL via Supabase. Core tables: `users`, `onboarding_responses`, `user_profiles`, `questions`, `question_attempts`, `concept_scores`, `focus_sessions`, `peer_sessions`.

Schema with Row Level Security: `backend/database_schema.sql`

## API Endpoints

Base: `/api/v1`

| Module | Key Endpoints |
|--------|---------------|
| Auth | `/auth/login` (redirect to OAuth), `/auth/callback`, `/auth/logout`, `/auth/me` |
| Onboarding | `/onboarding/questions`, `/onboarding/submit`, `/onboarding/status` |
| Questions | `/questions/generate`, `/questions/topics` |
| Progress | `/progress/dashboard`, `/progress/concepts` |
| Focus | `/focus/start`, `/focus/end` |
| Peer | `/peer/rooms`, `/peer/battles` |

API docs available at `http://localhost:8000/docs` when backend is running.

## Important Files Reference

| Purpose | File(s) |
|---------|---------|
| Memory file (search first) | `Memory.md` |
| Full technical spec | `SPEC.md` |
| Backend OAuth client | `backend/app/core/oauth.py` |
| Backend session handling | `backend/app/core/session.py` |
| Backend dual-auth security | `backend/app/core/security.py` |
| Backend auth endpoints | `backend/app/api/v1/auth.py` |
| Gemini AI client | `backend/app/core/gemini.py` |
| Onboarding questions pool | `backend/app/curriculum/onboarding_questions.json` |
| Web auth hook | `web/src/hooks/useAuth.ts` |
| Web API client | `web/src/api/client.ts` |
| Android auth manager | `app/.../data/remote/AuthManager.kt` |
| Android navigation | `app/.../ui/navigation/NavGraph.kt` |
| Android theme | `app/.../ui/theme/Theme.kt` |

## Rules

### Memory
- **Always check `Memory.md` first** before searching files - it contains a complete file reference and recent updates
- Check `SPEC.md` for detailed technical specifications and implementation details
- When creating new files or folders, update `Memory.md` with a brief description of the file's purpose

### Code Style
**Backend (Python/FastAPI):**
- Use Pydantic models for request/response schemas
- Follow existing patterns in `backend/app/schemas/` and `backend/app/services/`
- Async functions for route handlers
- **CRITICAL**: Use `get_db_user_id(current_user, db)` from `app.core.security` for database user ID - never use `current_user.get("db_id")` or `current_user.get("id")` directly (breaks legacy JWT auth)

**Web (React/TypeScript):**
- Functional components only, no class components
- Use custom hooks for shared logic (see `web/src/hooks/`)
- TailwindCSS for styling, follow design system in `web/tailwind.config.js`

**Android (Kotlin/Compose):**
- Composable functions for UI, ViewModels for state
- Follow Hilt DI patterns in `app/.../di/`
- Use existing theme from `app/.../ui/theme/`

### Commits
When file changes are complete:
```bash
git add . && git commit -m "STEP #N - <short description>"
```
Only commit if files were created or edited during the turn.

### Context
- Target users: CBSE Class 10 & 12 students
- Subjects: Mathematics, Physics, Chemistry, Biology
- Auth: Google OAuth via Auth0 only (no email/password)
- AI: Gemini Flash 3 for question generation
