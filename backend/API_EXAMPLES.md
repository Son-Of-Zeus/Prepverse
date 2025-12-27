# PrepVerse API Examples

Complete collection of API endpoint examples with request/response formats.

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-auth0-jwt-token>
```

---

## 1. Health Check (Public)

### GET /health

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

---

## 2. Get Current User Profile

### GET /api/v1/auth/me

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/auth/me
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "student@example.com",
  "full_name": "John Doe",
  "class_level": 12,
  "onboarding_completed": true,
  "total_questions_attempted": 150,
  "correct_answers": 120,
  "accuracy": 80.0,
  "created_at": "2025-01-15T10:30:00Z"
}
```

---

## 3. Get Onboarding Questions

### GET /api/v1/onboarding/questions

Returns 10 random questions based on user's class level.

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/onboarding/questions
```

**Response:**
```json
[
  {
    "id": "onb_001",
    "question": "What is the degree of the polynomial 3x^4 + 2x^2 - 7x + 1?",
    "options": ["1", "2", "3", "4"],
    "subject": "mathematics",
    "topic": "algebra",
    "difficulty": "easy",
    "time_estimate_seconds": 30
  },
  {
    "id": "onb_002",
    "question": "The roots of the equation x^2 - 5x + 6 = 0 are:",
    "options": ["2 and 3", "1 and 6", "-2 and -3", "2 and -3"],
    "subject": "mathematics",
    "topic": "algebra",
    "difficulty": "easy",
    "time_estimate_seconds": 45
  }
  // ... 8 more questions
]
```

---

## 4. Submit Onboarding Answers

### POST /api/v1/onboarding/submit

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
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
  }' \
  http://localhost:8000/api/v1/onboarding/submit
```

**Response:**
```json
{
  "total_questions": 10,
  "correct_answers": 8,
  "score_percentage": 80.0,
  "results": [
    {
      "question_id": "onb_001",
      "question": "What is the degree of the polynomial 3x^4 + 2x^2 - 7x + 1?",
      "selected_answer": "4",
      "correct_answer": "4",
      "is_correct": true,
      "explanation": "The degree of a polynomial is the highest power of the variable.",
      "subject": "mathematics",
      "topic": "algebra"
    }
    // ... results for all 10 questions
  ],
  "weak_topics": ["geometry", "trigonometry"],
  "strong_topics": ["algebra", "statistics"],
  "recommendations": "Good performance! Focus on improving weak areas. Focus on these topics: geometry, trigonometry. Practice more questions in these areas daily."
}
```

---

## 5. Get Onboarding Status

### GET /api/v1/onboarding/status

**Request:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/v1/onboarding/status
```

**Response (Completed):**
```json
{
  "completed": true,
  "score": 80.0,
  "completed_at": "2025-01-15T11:00:00Z",
  "weak_topics": ["geometry", "trigonometry"],
  "strong_topics": ["algebra", "statistics"]
}
```

**Response (Not Completed):**
```json
{
  "completed": false,
  "score": null,
  "completed_at": null,
  "weak_topics": [],
  "strong_topics": []
}
```

---

## 6. Generate Questions with AI

### POST /api/v1/questions/generate

Uses Google Gemini to generate custom questions.

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "mathematics",
    "topic": "calculus",
    "difficulty": "medium",
    "class_level": 12,
    "count": 5
  }' \
  http://localhost:8000/api/v1/questions/generate
```

**Response:**
```json
{
  "questions": [
    {
      "question": "Find the derivative of f(x) = 3x^2 + 2x - 1",
      "options": [
        "6x + 2",
        "3x + 2",
        "6x - 1",
        "3x^2 + 2"
      ],
      "correct_answer": "6x + 2",
      "explanation": "Using the power rule: d/dx(x^n) = nx^(n-1). So f'(x) = 6x + 2.",
      "subject": "mathematics",
      "topic": "calculus",
      "subtopic": null,
      "difficulty": "medium",
      "class_level": 12,
      "question_type": "mcq",
      "time_estimate_seconds": 60,
      "concept_tags": []
    }
    // ... 4 more questions
  ],
  "count": 5,
  "source": "gemini"
}
```

**Valid Parameters:**
- `subject`: mathematics, science, etc.
- `topic`: Any topic within the subject
- `difficulty`: easy, medium, hard
- `class_level`: 10 or 12
- `count`: 1-20 (default: 5)

---

## 7. Generate Study Plan

### POST /api/v1/questions/generate/study-plan

**Request:**
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "class_level": 12,
    "weak_topics": ["calculus", "3d_geometry", "probability"],
    "target_exam": "JEE Main",
    "days_available": 30
  }' \
  http://localhost:8000/api/v1/questions/generate/study-plan?class_level=12&weak_topics=calculus&weak_topics=3d_geometry&weak_topics=probability&target_exam=JEE%20Main&days_available=30
```

**Response:**
```json
{
  "plan": "30-Day Study Plan for JEE Main\n\nWeek 1: Foundation Building\n- Day 1-2: Calculus fundamentals (limits, continuity)\n- Day 3-4: Basic differentiation rules\n- Day 5-7: Integration basics and practice\n\nWeek 2: 3D Geometry\n- Day 8-10: Direction cosines and ratios\n- Day 11-12: Planes and lines in 3D space\n- Day 13-14: Practice problems\n\nWeek 3: Probability\n- Day 15-17: Basic probability concepts\n- Day 18-20: Conditional probability\n- Day 21: Mixed practice\n\nWeek 4: Integration and Revision\n- Day 22-24: Advanced calculus problems\n- Day 25-26: 3D geometry revision\n- Day 27-28: Probability revision\n- Day 29: Full mock test\n- Day 30: Weak area focus\n\nDaily Schedule:\n- Morning (2 hours): Theory and concepts\n- Evening (2 hours): Practice questions\n- Break every 45 minutes\n- Weekly revision on Sundays"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Invalid token: Token has expired"
}
```

### 400 Bad Request
```json
{
  "detail": "Class level must be 10 or 12"
}
```

### 404 Not Found
```json
{
  "detail": "User not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Failed to generate questions. Please try again."
}
```

---

## Testing Tips

1. **Get Auth0 Token**: Use your frontend's auth flow or Auth0's test token endpoint
2. **Use Swagger UI**: Visit http://localhost:8000/docs for interactive testing
3. **Check Logs**: Run server with `--reload` flag to see detailed logs
4. **Database State**: Verify data in Supabase dashboard after API calls

## Postman Collection

Import this as a Postman collection:

1. Create new collection "PrepVerse API"
2. Add environment variables:
   - `base_url`: http://localhost:8000
   - `token`: <your-auth0-token>
3. Create requests for each endpoint above
4. Use `{{base_url}}` and `{{token}}` in requests

## Rate Limiting (Future)

Currently no rate limiting. Consider adding:
- 100 requests/minute for authenticated users
- 10 requests/minute for AI generation endpoints
- Implement using Redis or in-memory cache
