# PrepVerse Backend - Testing Checklist

Use this checklist to verify your backend is working correctly.

## Pre-Flight Checks

- [ ] Python 3.11+ installed
- [ ] Virtual environment activated
- [ ] All dependencies installed (`pip install -r requirements.txt`)
- [ ] `.env` file created with all required variables
- [ ] Supabase database tables created (`database_schema.sql` executed)
- [ ] Auth0 application configured
- [ ] Google Gemini API key obtained

## Environment Variables Check

Run this to verify all variables are set:

```bash
python -c "from app.config import get_settings; s = get_settings(); print('✓ All environment variables loaded successfully')"
```

Expected: No errors, prints success message

## Server Start Check

### 1. Start Server

```bash
uvicorn app.main:app --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

- [ ] Server starts without errors
- [ ] No import errors
- [ ] Port 8000 is available

## Endpoint Testing

### Public Endpoints (No Auth Required)

#### 1. Root Endpoint

```bash
curl http://localhost:8000/
```

Expected response:
```json
{
  "name": "PrepVerse API",
  "version": "1.0.0",
  "status": "running",
  "message": "Welcome to PrepVerse API"
}
```

- [ ] Returns 200 OK
- [ ] Response matches expected format

#### 2. Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

- [ ] Returns 200 OK
- [ ] Status is "healthy"

#### 3. API Documentation

Visit in browser:
- http://localhost:8000/docs (Swagger UI)
- http://localhost:8000/redoc (ReDoc)

- [ ] Swagger UI loads correctly
- [ ] All 10 endpoints visible
- [ ] ReDoc documentation loads

### Authenticated Endpoints

First, get an Auth0 token from your frontend or Auth0 dashboard.

#### 4. Get Current User Profile

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/v1/auth/me
```

Expected response (first time):
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "full_name": null,
  "class_level": 10,
  "onboarding_completed": false,
  "total_questions_attempted": 0,
  "correct_answers": 0,
  "accuracy": 0.0,
  "created_at": "2025-12-24T..."
}
```

Checks:
- [ ] Returns 200 OK
- [ ] User created in database (first time)
- [ ] Email matches token
- [ ] Default class_level is 10
- [ ] onboarding_completed is false

#### 5. Get Onboarding Questions

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/v1/onboarding/questions
```

Expected:
- [ ] Returns 200 OK
- [ ] Array of exactly 10 questions
- [ ] Each question has: id, question, options (4), subject, topic, difficulty
- [ ] No correct_answer field (hidden from students)
- [ ] Questions match user's class_level

Sample question structure:
```json
{
  "id": "onb_001",
  "question": "What is the degree of the polynomial 3x^4 + 2x^2 - 7x + 1?",
  "options": ["1", "2", "3", "4"],
  "subject": "mathematics",
  "topic": "algebra",
  "difficulty": "easy",
  "time_estimate_seconds": 30
}
```

#### 6. Submit Onboarding Answers

Create a file `test_submission.json`:
```json
{
  "answers": [
    {"question_id": "onb_001", "selected_answer": "4"},
    {"question_id": "onb_002", "selected_answer": "2 and 3"},
    {"question_id": "onb_003", "selected_answer": "29"},
    {"question_id": "onb_004", "selected_answer": "Infinitely many solutions"},
    {"question_id": "onb_005", "selected_answer": "Square of ratio of corresponding sides"},
    {"question_id": "onb_006", "selected_answer": "90 degrees"},
    {"question_id": "onb_007", "selected_answer": "5"},
    {"question_id": "onb_008", "selected_answer": "1/2"},
    {"question_id": "onb_009", "selected_answer": "1"},
    {"question_id": "onb_010", "selected_answer": "6"}
  ]
}
```

Submit:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d @test_submission.json \
  http://localhost:8000/api/v1/onboarding/submit
```

Expected:
- [ ] Returns 200 OK
- [ ] total_questions = 10
- [ ] correct_answers between 0-10
- [ ] score_percentage calculated correctly
- [ ] results array has 10 items
- [ ] Each result shows: question, selected_answer, correct_answer, is_correct, explanation
- [ ] weak_topics and strong_topics identified
- [ ] recommendations provided
- [ ] User's onboarding_completed set to true in database

#### 7. Check Onboarding Status

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/v1/onboarding/status
```

After submission:
```json
{
  "completed": true,
  "score": 80.0,
  "completed_at": "2025-12-24T...",
  "weak_topics": ["geometry"],
  "strong_topics": ["algebra", "statistics"]
}
```

- [ ] completed is true
- [ ] score matches submission
- [ ] completed_at timestamp present
- [ ] topics match evaluation

#### 8. Generate Questions with AI

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "mathematics",
    "topic": "calculus",
    "difficulty": "medium",
    "class_level": 12,
    "count": 3
  }' \
  http://localhost:8000/api/v1/questions/generate
```

Expected:
- [ ] Returns 200 OK (may take 5-10 seconds)
- [ ] questions array with 3 questions
- [ ] Each question has: question, options, correct_answer, explanation
- [ ] count = 3
- [ ] source = "gemini"

Note: This uses Gemini API, requires valid GEMINI_API_KEY

#### 9. Generate Study Plan

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  "http://localhost:8000/api/v1/questions/generate/study-plan?class_level=12&weak_topics=calculus&weak_topics=probability&target_exam=JEE%20Main&days_available=30"
```

Expected:
- [ ] Returns 200 OK
- [ ] plan field contains detailed study schedule
- [ ] Plan is personalized based on weak topics
- [ ] Mentions target exam and timeline

## Database Verification

### Check Supabase Tables

1. **users table**
```sql
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;
```
- [ ] Your user exists
- [ ] auth0_id matches
- [ ] onboarding_completed updated after submission

2. **onboarding_results table**
```sql
SELECT * FROM onboarding_results ORDER BY completed_at DESC LIMIT 5;
```
- [ ] Result stored after submission
- [ ] score matches API response
- [ ] weak_topics and strong_topics arrays populated

3. **user_attempts table**
```sql
SELECT COUNT(*) FROM user_attempts WHERE user_id = 'your-user-id';
```
- [ ] 10 attempts recorded after onboarding
- [ ] is_correct field matches answers
- [ ] attempt_type = 'onboarding'

## Error Handling Tests

### 1. Missing Token

```bash
curl http://localhost:8000/api/v1/auth/me
```

Expected:
- [ ] Returns 403 Forbidden
- [ ] Error message about missing credentials

### 2. Invalid Token

```bash
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:8000/api/v1/auth/me
```

Expected:
- [ ] Returns 401 Unauthorized
- [ ] Error message about invalid token

### 3. Invalid Request Data

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"answers": []}' \
  http://localhost:8000/api/v1/onboarding/submit
```

Expected:
- [ ] Returns 422 Unprocessable Entity
- [ ] Validation error about minimum answers

### 4. Invalid Class Level

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "mathematics",
    "topic": "algebra",
    "difficulty": "easy",
    "class_level": 11,
    "count": 5
  }' \
  http://localhost:8000/api/v1/questions/generate
```

Expected:
- [ ] Returns 400 Bad Request
- [ ] Error message: "Class level must be 10 or 12"

## Performance Tests

### 1. Response Times

Measure endpoint response times:

```bash
time curl http://localhost:8000/health
```

Expected:
- [ ] /health: < 50ms
- [ ] /api/v1/auth/me: < 200ms
- [ ] /api/v1/onboarding/questions: < 300ms
- [ ] /api/v1/onboarding/submit: < 500ms
- [ ] /api/v1/questions/generate: < 10s (AI generation)

### 2. Concurrent Requests

Test with Apache Bench:
```bash
ab -n 100 -c 10 http://localhost:8000/health
```

Expected:
- [ ] All requests complete successfully
- [ ] No errors
- [ ] Consistent response times

## Integration Tests

### Full Onboarding Flow

1. [ ] Get user profile (creates user if new)
2. [ ] Check onboarding status (should be incomplete)
3. [ ] Get onboarding questions (10 random)
4. [ ] Submit answers
5. [ ] Check onboarding status again (should be complete)
6. [ ] Verify data in database

### Question Generation Flow

1. [ ] Get user profile
2. [ ] Generate questions for weak topics
3. [ ] Verify questions are relevant
4. [ ] Generate study plan
5. [ ] Verify plan includes weak topics

## Security Tests

### 1. CORS

Test from browser console at different origin:
```javascript
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(console.log)
```

- [ ] Request succeeds from allowed origins
- [ ] Request blocked from other origins (in production)

### 2. SQL Injection Attempt

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "mathematics\"; DROP TABLE users; --",
    "topic": "algebra",
    "difficulty": "easy",
    "class_level": 10,
    "count": 5
  }' \
  http://localhost:8000/api/v1/questions/generate
```

- [ ] Request handled safely
- [ ] No SQL injection occurs
- [ ] Database remains intact

## Cleanup

After testing:

```bash
# Stop server: Ctrl+C

# Deactivate virtual environment
deactivate
```

## Troubleshooting

### Common Issues

1. **Module not found**
   - Solution: Activate venv, reinstall dependencies

2. **Port already in use**
   - Solution: `lsof -ti:8000 | xargs kill -9`

3. **Database connection failed**
   - Solution: Check SUPABASE_URL and SUPABASE_KEY

4. **Auth0 token invalid**
   - Solution: Get fresh token, check AUTH0_DOMAIN and AUDIENCE

5. **Gemini API error**
   - Solution: Verify GEMINI_API_KEY, check quota

## Test Results Template

```
Date: _______________
Tester: _______________

PASSED / FAILED

[ ] Environment Setup
[ ] Server Start
[ ] Public Endpoints (2/2)
[ ] Auth Endpoints (1/1)
[ ] Onboarding Endpoints (3/3)
[ ] Question Generation (2/2)
[ ] Database Verification
[ ] Error Handling
[ ] Performance
[ ] Security

Notes:
_____________________________________
_____________________________________
_____________________________________

Overall Status: PASS / FAIL
```

## Automated Testing (Future)

Create `tests/` directory with pytest:

```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

# Add more tests...
```

Run with:
```bash
pytest tests/
```

---

**Checklist Complete**: Ready for production deployment!
