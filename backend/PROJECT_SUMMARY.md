# PrepVerse Backend - Project Summary

## Overview

Complete FastAPI backend for PrepVerse - an AI-powered CBSE exam preparation platform with onboarding assessment and dynamic question generation.

## Tech Stack

- **FastAPI 0.109.0** - Modern async Python web framework
- **Supabase** - PostgreSQL database with built-in auth
- **Auth0** - JWT token validation and user management
- **Google Gemini Flash 3** - AI-powered question generation
- **Pydantic 2.5.3** - Data validation and settings
- **Python-Jose** - JWT validation
- **Uvicorn** - ASGI server

## Complete File Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app entry, CORS, routes
│   ├── config.py                        # Settings from .env
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py                # Main API router
│   │       ├── auth.py                  # GET /auth/me
│   │       ├── onboarding.py            # Onboarding assessment endpoints
│   │       └── questions.py             # AI question generation
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── security.py                  # Auth0 JWT validation
│   │   └── gemini.py                    # Gemini AI client
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   └── session.py                   # Supabase client setup
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py                      # User Pydantic models
│   │   ├── question.py                  # Question models
│   │   └── onboarding.py                # Onboarding models
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── onboarding_service.py        # Question selection logic
│   │
│   ├── models/
│   │   └── __init__.py                  # Database models (if needed)
│   │
│   └── curriculum/
│       └── onboarding_questions.json    # 100 CBSE questions
│
├── requirements.txt                      # Python dependencies
├── .env.example                          # Environment template
├── .gitignore                            # Git ignore rules
├── run.sh                                # Development run script
├── database_schema.sql                   # Supabase schema
├── README.md                             # Main documentation
├── QUICKSTART.md                         # Quick setup guide
├── API_EXAMPLES.md                       # API endpoint examples
├── DEPLOYMENT.md                         # Deployment guide
└── PROJECT_SUMMARY.md                    # This file
```

## Key Features Implemented

### 1. Authentication & Authorization
- **Auth0 JWT Validation**: Secure token verification using python-jose
- **User Management**: Auto-create users on first login
- **Protected Routes**: All endpoints require valid JWT except health check

### 2. Onboarding Assessment
- **100 Question Pool**: Pre-loaded questions for Class 10 & 12
- **Random Selection**: 10 random questions per assessment
- **Smart Evaluation**: Identifies weak/strong topics
- **Performance Tracking**: Stores results in Supabase

### 3. AI Question Generation
- **Gemini Integration**: Dynamic question creation
- **Customizable**: Subject, topic, difficulty, count
- **Study Plans**: AI-generated personalized study schedules
- **Context-Aware**: Uses CBSE curriculum context

### 4. Database Integration
- **Supabase Client**: Async PostgreSQL operations
- **Row-Level Security**: User data isolation
- **Performance Tracking**: Store all user attempts
- **Statistics**: Track accuracy, topics, progress

## API Endpoints

### Public Endpoints
```
GET  /                     - Root endpoint
GET  /health               - Health check
GET  /docs                 - Swagger UI documentation
GET  /redoc                - ReDoc documentation
```

### Authenticated Endpoints

#### Authentication
```
GET  /api/v1/auth/me       - Get current user profile
```

#### Onboarding
```
GET  /api/v1/onboarding/questions    - Get 10 random questions
POST /api/v1/onboarding/submit       - Submit answers & evaluate
GET  /api/v1/onboarding/status       - Get completion status
```

#### Question Generation
```
POST /api/v1/questions/generate            - Generate questions with AI
POST /api/v1/questions/generate/study-plan - Generate study plan
```

## Database Schema

### Tables Created

1. **users**
   - id (UUID, PK)
   - auth0_id (unique)
   - email
   - full_name
   - class_level (10 or 12)
   - onboarding_completed
   - created_at, updated_at

2. **onboarding_results**
   - id (UUID, PK)
   - user_id (FK → users)
   - score
   - total_questions
   - correct_answers
   - weak_topics (array)
   - strong_topics (array)
   - completed_at

3. **user_attempts**
   - id (UUID, PK)
   - user_id (FK → users)
   - question_id
   - selected_answer
   - is_correct
   - subject, topic
   - attempt_type (onboarding/practice/test)
   - created_at

4. **study_sessions** (optional)
   - id (UUID, PK)
   - user_id (FK → users)
   - subject, topic
   - duration_minutes
   - questions_attempted
   - questions_correct
   - started_at, ended_at

## Environment Variables Required

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-or-service-key

# Auth0
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier

# Google Gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash

# Optional
DEBUG=False
```

## Dependencies Overview

### Core Framework
- `fastapi==0.109.0` - Web framework
- `uvicorn[standard]==0.27.0` - ASGI server
- `pydantic==2.5.3` - Data validation
- `pydantic-settings==2.1.0` - Settings management

### Authentication
- `python-jose[cryptography]==3.3.0` - JWT handling
- `python-multipart==0.0.6` - Form data

### Database & AI
- `supabase==2.3.1` - Supabase client
- `google-generativeai==0.3.2` - Gemini API

### Utils
- `requests==2.31.0` - HTTP requests
- `python-dotenv==1.0.0` - Environment management

## Quick Start Commands

### 1. Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
```

### 2. Database Setup
```bash
# Copy database_schema.sql to Supabase SQL Editor
# Run the SQL to create tables
```

### 3. Run Development Server
```bash
# Using run script
chmod +x run.sh
./run.sh

# Or manually
uvicorn app.main:app --reload
```

### 4. Test API
```bash
# Visit http://localhost:8000/docs
# Test /health endpoint
curl http://localhost:8000/health
```

## How It Works

### Onboarding Flow
1. User logs in via Auth0 (frontend)
2. Frontend calls `/api/v1/auth/me` with JWT
3. Backend validates token, creates/fetches user
4. User starts onboarding: GET `/api/v1/onboarding/questions`
5. Backend selects 10 random questions from 100 (filtered by class)
6. User answers questions in frontend
7. Frontend submits: POST `/api/v1/onboarding/submit`
8. Backend evaluates answers, identifies weak/strong topics
9. Results stored in `onboarding_results` and `user_attempts` tables
10. User's `onboarding_completed` flag set to true

### Question Generation Flow
1. User requests questions: POST `/api/v1/questions/generate`
2. Backend validates auth and parameters
3. Calls Gemini API with structured prompt
4. Gemini generates questions in JSON format
5. Backend parses and validates questions
6. Returns formatted questions to frontend

### Study Plan Generation
1. Backend receives weak topics and exam details
2. Calls Gemini with context about user's performance
3. Gemini generates day-by-day study plan
4. Returns personalized recommendations

## Security Features

### Implemented
- Auth0 JWT validation on all protected routes
- Row-Level Security (RLS) in Supabase
- CORS configuration for allowed origins
- Input validation with Pydantic
- Environment-based configuration (no hardcoded secrets)

### Recommended (Future)
- Rate limiting (e.g., 100 req/min per user)
- API key rotation strategy
- Request logging and monitoring
- DDoS protection (via deployment platform)
- Content Security Policy headers

## Performance Considerations

### Current Setup
- Async/await for all I/O operations
- Supabase connection pooling
- Cached Auth0 public key
- Singleton pattern for clients (Gemini, Supabase)

### Scalability
- Stateless design (can horizontally scale)
- Database operations optimized with indexes
- Gemini API calls are rate-limited by Google
- Consider Redis for session caching in production

## Testing Recommendations

### Unit Tests
```python
# Test authentication
def test_verify_token_valid():
    pass

# Test onboarding service
def test_get_random_questions():
    pass

# Test question generation
def test_generate_questions_with_gemini():
    pass
```

### Integration Tests
```python
# Test API endpoints
async def test_get_onboarding_questions():
    response = client.get("/api/v1/onboarding/questions")
    assert response.status_code == 200
```

### Load Testing
```bash
# Use tools like:
# - Apache Bench (ab)
# - Locust
# - k6
```

## Monitoring & Observability

### Recommended Tools
- **Sentry**: Error tracking
- **Datadog/New Relic**: APM
- **Prometheus**: Metrics
- **Grafana**: Dashboards
- **LogDNA/Papertrail**: Log aggregation

### Key Metrics to Track
- Request latency (p50, p95, p99)
- Error rate
- Database query performance
- Gemini API response time
- User registration/onboarding completion rate

## Future Enhancements

### Phase 1 (Immediate)
- Add pytest test suite
- Implement rate limiting
- Add response caching
- Enhance error logging

### Phase 2 (Short-term)
- Practice test endpoints
- Progress tracking dashboard
- Leaderboard system
- Social features (study groups)

### Phase 3 (Long-term)
- Video explanations for answers
- Doubt resolution system
- Personalized revision schedules
- Parent/teacher dashboard
- Analytics and insights

## Deployment Options

1. **Railway** (Recommended) - Easy, free tier available
2. **Render** - Simple deployment
3. **Google Cloud Run** - Serverless, auto-scaling
4. **AWS EC2/ECS** - Full control
5. **DigitalOcean App Platform** - Simple and affordable

See `DEPLOYMENT.md` for detailed instructions.

## Documentation Files

- **README.md**: Main project documentation
- **QUICKSTART.md**: Step-by-step setup guide
- **API_EXAMPLES.md**: Complete API endpoint examples
- **DEPLOYMENT.md**: Production deployment guide
- **PROJECT_SUMMARY.md**: This file - project overview

## Support & Resources

### Documentation
- FastAPI: https://fastapi.tiangolo.com/
- Supabase: https://supabase.com/docs
- Auth0: https://auth0.com/docs
- Google Gemini: https://ai.google.dev/

### API Documentation (when running)
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT License - Feel free to use for educational purposes

## Contributors

Built with Claude Code for PrepVerse CBSE exam preparation platform.

---

**Status**: Production-ready MVP ✓
**Last Updated**: 2025-12-24
**Version**: 1.0.0
