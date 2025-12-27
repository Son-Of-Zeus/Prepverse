# PrepVerse Auth0 Integration - Quick Start

## TL;DR - Get Running in 5 Minutes

### Step 1: Install Dependencies (1 min)

```bash
cd /Users/vpranav/Desktop/Dev/PEC/web
npm install
```

### Step 2: Set Up Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env` and add your Auth0 credentials:

```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com          # From Auth0 Dashboard
VITE_AUTH0_CLIENT_ID=your-client-id              # From Auth0 Dashboard
VITE_AUTH0_AUDIENCE=https://api.prepverse.com    # Your API identifier
VITE_API_URL=http://localhost:8080/api           # Your backend URL
```

### Step 3: Configure Auth0 (2 min)

1. Go to https://manage.auth0.com
2. Create a **Single Page Application**
3. In Settings, add:
   - **Allowed Callback URLs**: `http://localhost:5173/callback`
   - **Allowed Logout URLs**: `http://localhost:5173`
   - **Allowed Web Origins**: `http://localhost:5173`
4. Enable **Google** social connection in Authentication > Social
5. Save changes

### Step 4: Run the App (1 min)

```bash
npm run dev
```

Visit `http://localhost:5173` and test the login!

---

## What You Get

✅ **Complete Auth0 Integration**
- Google OAuth login
- Automatic token management
- Secure token storage (memory-based)
- Token refresh handling

✅ **Ready-to-Use API Client**
- Automatic Bearer token injection
- Error handling
- TypeScript types

✅ **Onboarding API Functions**
- `getOnboardingStatus()`
- `getOnboardingQuestions(class)`
- `submitOnboardingAnswers(answers)`

✅ **Production-Ready Features**
- Loading states
- Error handling
- Security best practices
- Full TypeScript support

---

## File Overview

### New Files Created

| File | Purpose |
|------|---------|
| `src/lib/auth0.ts` | Auth0 configuration |
| `src/hooks/useAuth.ts` | Custom auth hook |
| `src/api/client.ts` | Axios with auth interceptor |
| `src/api/onboarding.ts` | Onboarding API functions |
| `src/pages/Callback.tsx` | Auth0 callback handler |
| `.env.example` | Environment template |

### Modified Files

| File | Changes |
|------|---------|
| `src/main.tsx` | Added Auth0Provider wrapper |
| `src/App.tsx` | Added auth state management |
| `src/pages/Login.tsx` | Integrated actual Auth0 login |
| `src/pages/index.ts` | Exported Callback page |
| `package.json` | Added Auth0 & Axios dependencies |

---

## Usage Examples

### Login with Google

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
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Welcome, {user?.name}!</div>;
}
```

### Make API Calls

```typescript
import { getOnboardingStatus } from './api/onboarding';

// Token is automatically included!
const status = await getOnboardingStatus();
```

---

## Need More Details?

- **Full Setup Guide**: See [AUTH0_SETUP.md](./AUTH0_SETUP.md)
- **Installation Guide**: See [INSTALLATION.md](./INSTALLATION.md)
- **Complete Summary**: See [AUTH0_INTEGRATION_SUMMARY.md](./AUTH0_INTEGRATION_SUMMARY.md)

---

## Troubleshooting

### "Missing required Auth0 configuration" error
→ Check that all variables in `.env` are filled in correctly

### Auth0 callback fails
→ Verify callback URL `http://localhost:5173/callback` is added in Auth0 Dashboard

### 401 Unauthorized on API calls
→ Ensure your backend is configured to validate Auth0 JWT tokens

### Google login doesn't work
→ Verify Google connection is enabled in Auth0 Dashboard > Authentication > Social

---

## Next Steps After Setup

1. ✅ Test the login flow
2. ✅ Verify tokens are being sent to API
3. 🔧 Configure backend to validate Auth0 tokens
4. 🔧 Implement onboarding endpoints on backend
5. 🚀 Deploy to production (update Auth0 URLs)

---

**Everything is ready to go!** Just follow the 4 steps above and you'll have Auth0 authentication working.
