# Auth0 Integration - Implementation Summary

## Overview

PrepVerse uses **server-side OAuth** for web authentication. The backend handles all OAuth token exchange with Auth0, and the web frontend uses HTTP-only session cookies for authentication.

## Architecture

### Why Server-Side OAuth?

- **Security**: Tokens never exposed to JavaScript (XSS protection)
- **Simplicity**: No client-side token management needed
- **Cookie-based**: Automatic credential handling by browser

### Authentication Flow

```
User clicks "Sign in with Google"
         ↓
Frontend redirects to backend /api/v1/auth/login
         ↓
Backend redirects to Auth0 with Google connection
         ↓
User authenticates with Google
         ↓
Auth0 redirects to backend /api/v1/auth/callback
         ↓
Backend exchanges auth code for tokens
         ↓
Backend creates/updates user in database
         ↓
Backend sets HTTP-only session cookie
         ↓
Backend redirects to frontend (onboarding or dashboard)
         ↓
All subsequent API requests include cookie automatically
```

## Files Overview

### Frontend (`web/src/`)

| File | Purpose |
|------|---------|
| `hooks/useAuth.ts` | Custom auth hook - redirects to backend for login |
| `api/client.ts` | Axios instance with `withCredentials: true` |
| `api/onboarding.ts` | Onboarding API functions |
| `pages/Login.tsx` | Login page with Google sign-in button |
| `App.tsx` | Auth state management and routing |

### Backend (`backend/app/`)

| File | Purpose |
|------|---------|
| `core/oauth.py` | Authlib OAuth client for Auth0 |
| `core/session.py` | Session token creation/validation |
| `core/security.py` | Dual auth support (cookie + Bearer) |
| `api/v1/auth.py` | Auth endpoints (login, callback, logout, me) |

## Usage

### Login

```typescript
import { useAuth } from './hooks/useAuth';

function LoginButton() {
  const { loginWithGoogle } = useAuth();
  return <button onClick={loginWithGoogle}>Sign in with Google</button>;
}
```

### Check Auth State

```typescript
import { useAuth } from './hooks/useAuth';

function Profile() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Welcome, {user?.full_name}!</div>;
}
```

### Make API Calls

```typescript
import { apiClient } from './api/client';

// Cookie is automatically included - no token management needed!
const response = await apiClient.get('/onboarding/status');
```

### Logout

```typescript
import { useAuth } from './hooks/useAuth';

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={logout}>Sign out</button>;
}
```

## Security Features

1. **HTTP-only Cookies**
   - Session token stored in HTTP-only cookie
   - Not accessible via JavaScript (XSS protection)
   - Secure flag enabled in production

2. **Server-side Token Exchange**
   - Auth0 tokens never reach the browser
   - Backend handles all OAuth operations
   - Client secret securely stored on server

3. **Session Management**
   - Signed session tokens (itsdangerous)
   - 7-day expiration
   - Secure cookie attributes

4. **CORS + Credentials**
   - Vite proxy in dev ensures same-origin
   - `withCredentials: true` for cookie handling

## Environment Variables

### Frontend (`web/.env`)

```env
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Note: No Auth0 credentials needed in frontend - backend handles OAuth.

### Backend (`backend/.env`)

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.prepverse.com
SESSION_SECRET_KEY=generate-a-secure-random-string
FRONTEND_URL=http://localhost:5173
```

## Development

### With Vite Proxy (Recommended)

The Vite dev server proxies `/api` requests to the backend, making cookies work seamlessly:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
    },
  },
});
```

### Testing the Flow

1. Start backend: `cd backend && ./run.sh`
2. Start frontend: `cd web && npm run dev`
3. Visit `http://localhost:5173`
4. Click "Sign in with Google"
5. After authentication, you'll be redirected to onboarding or dashboard

## Troubleshooting

### Cookie not being set

- Ensure backend `FRONTEND_URL` matches your frontend URL
- Check that Vite proxy is configured correctly
- Verify `withCredentials: true` in axios client

### Redirect loop

- Check Auth0 callback URL is set to backend: `http://localhost:8000/api/v1/auth/callback`
- Verify `SESSION_SECRET_KEY` is set in backend `.env`

### CORS errors

- Ensure backend CORS allows frontend origin
- Check that Vite proxy is working (requests should go through `/api`)

### 401 Unauthorized

- Cookie may have expired (7-day max age)
- Try logging out and back in
- Check browser dev tools > Application > Cookies

---

**Status**: Server-side OAuth implementation complete
