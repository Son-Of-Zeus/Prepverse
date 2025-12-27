# PrepVerse Web - Quick Start

Get the web app running in 5 minutes.

## Step 1: Install Dependencies (1 min)

```bash
cd web
npm install
```

## Step 2: Set Up Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **Note**: No Auth0 credentials needed here - the backend handles OAuth.

## Step 3: Ensure Backend is Configured (2 min)

The backend needs Auth0 credentials. In `backend/.env`:

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.prepverse.com
SESSION_SECRET_KEY=your-secure-random-string
FRONTEND_URL=http://localhost:5173
```

See [AUTH0_SETUP.md](./AUTH0_SETUP.md) for detailed Auth0 configuration.

## Step 4: Start Both Servers (1 min)

Terminal 1 - Backend:
```bash
cd backend
./run.sh
```

Terminal 2 - Frontend:
```bash
cd web
npm run dev
```

## Step 5: Test Login

1. Visit `http://localhost:5173`
2. Click "Sign in with Google"
3. Complete Google authentication
4. You'll be redirected to onboarding (or dashboard if completed)

---

## How Authentication Works

```
Frontend                    Backend                    Auth0
   │                           │                         │
   │ Click "Sign in"           │                         │
   │──────────────────────────>│                         │
   │                           │ Redirect to Auth0       │
   │                           │────────────────────────>│
   │                           │                         │
   │           Google OAuth    │                         │
   │<────────────────────────────────────────────────────│
   │                           │                         │
   │                           │ Callback with tokens    │
   │                           │<────────────────────────│
   │                           │                         │
   │ Set cookie, redirect      │                         │
   │<──────────────────────────│                         │
   │                           │                         │
   │ API calls (cookie auto-   │                         │
   │ included)                 │                         │
   │──────────────────────────>│                         │
```

## What You Get

- **Server-side OAuth** - Tokens never exposed to browser
- **HTTP-only cookies** - XSS protection
- **Automatic credentials** - No token management needed
- **Vite proxy** - Seamless cookie handling in development

## Usage Examples

### Login

```typescript
import { useAuth } from './hooks/useAuth';

const { loginWithGoogle } = useAuth();
// Redirects to backend, which redirects to Auth0/Google
loginWithGoogle();
```

### Check Auth State

```typescript
const { isAuthenticated, user, isLoading } = useAuth();
```

### Make API Calls

```typescript
import { apiClient } from './api/client';

// Cookie automatically included!
const response = await apiClient.get('/onboarding/status');
```

### Logout

```typescript
const { logout } = useAuth();
logout();
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Login redirects fail | Check backend is running on port 8000 |
| Cookie not set | Verify Vite proxy config and `FRONTEND_URL` in backend |
| 401 on API calls | Cookie may be expired - try logging in again |
| CORS errors | Ensure backend CORS allows `http://localhost:5173` |

## Next Steps

- Read [AUTH0_SETUP.md](./AUTH0_SETUP.md) for detailed Auth0 configuration
- Read [AUTH0_INTEGRATION_SUMMARY.md](./AUTH0_INTEGRATION_SUMMARY.md) for architecture overview
- Check [INSTALLATION.md](./INSTALLATION.md) for full installation guide

---

**Ready to go!** Just start both servers and test the login flow.
