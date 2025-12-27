# PrepVerse Backend API

FastAPI backend for PrepVerse - CBSE exam preparation platform with AI-powered question generation.

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Supabase** - PostgreSQL database and authentication
- **Auth0** - JWT token validation
- **Google Gemini Flash 3** - AI-powered question generation
- **Pydantic** - Data validation and settings management

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── router.py          # Main API router
│   │       ├── auth.py            # Authentication endpoints
│   │       ├── onboarding.py      # Onboarding assessment
│   │       └── questions.py       # Question generation
│   ├── core/
│   │   ├── security.py            # Auth0 JWT validation
│   │   └── gemini.py              # Gemini AI client
│   ├── db/
│   │   └── session.py             # Supabase client
│   ├── schemas/
│   │   ├── user.py                # User models
│   │   ├── question.py            # Question models
│   │   └── onboarding.py          # Onboarding models
│   ├── services/
│   │   └── onboarding_service.py  # Onboarding logic
│   ├── curriculum/
│   │   └── onboarding_questions.json  # 100 onboarding questions
│   ├── config.py                  # Settings and configuration
│   └── main.py                    # FastAPI app entry point
├── pyproject.toml                 # Python dependencies (uv)
├── requirements.txt               # Legacy pip dependencies
└── .env.example                   # Environment variables template
```

## Setup

### Using uv (Recommended)

1. **Install uv** (if not already installed):
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. **Install dependencies:**
```bash
cd backend
uv sync
```

### Using pip (Alternative)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

3. **Required environment variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/service key
- `AUTH0_DOMAIN` - Your Auth0 tenant domain
- `AUTH0_AUDIENCE` - Your Auth0 API identifier
- `GEMINI_API_KEY` - Your Google Gemini API key

4. **Run the development server:**

Using run script (recommended):
```bash
chmod +x run.sh
./run.sh
```

Using uv directly:
```bash
uv run uvicorn app.main:app --reload
```

Using pip/venv:
```bash
source venv/bin/activate
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `GET /api/v1/auth/me` - Get current user profile

### Onboarding Assessment
- `GET /api/v1/onboarding/questions` - Get 10 random questions based on user's class
- `POST /api/v1/onboarding/submit` - Submit answers and get evaluation
- `GET /api/v1/onboarding/status` - Get onboarding completion status

### Question Generation (AI)
- `POST /api/v1/questions/generate` - Generate questions using Gemini AI
- `POST /api/v1/questions/generate/study-plan` - Generate personalized study plan

## Database Schema (Supabase)

You'll need to create these tables in Supabase:

### users
```sql
create table users (
  id uuid primary key default uuid_generate_v4(),
  auth0_id text unique not null,
  email text not null,
  full_name text,
  class_level int not null default 10,
  onboarding_completed boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone
);
```

### onboarding_results
```sql
create table onboarding_results (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  score numeric not null,
  total_questions int not null,
  correct_answers int not null,
  weak_topics text[],
  strong_topics text[],
  completed_at timestamp with time zone default now()
);
```

### user_attempts
```sql
create table user_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  question_id text not null,
  selected_answer text,
  is_correct boolean not null,
  subject text,
  topic text,
  attempt_type text default 'practice',
  created_at timestamp with time zone default now()
);
```

## Features

1. **Auth0 JWT Validation** - Secure authentication using Auth0 tokens
2. **Onboarding Assessment** - 10 random questions from 100-question pool
3. **AI Question Generation** - Dynamic question generation using Gemini
4. **Performance Tracking** - Track user answers and identify weak topics
5. **Personalized Recommendations** - AI-powered study plan generation

## Development

- Python 3.11+
- FastAPI auto-generates interactive API docs
- Use `DEBUG=True` in .env for detailed error messages
- All endpoints require authentication except root and health check

## License

MIT
