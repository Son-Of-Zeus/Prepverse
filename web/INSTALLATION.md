# PrepVerse Web - Installation & Quick Start

## Quick Installation

### 1. Install Dependencies

```bash
cd /Users/vpranav/Desktop/Dev/PEC/web
npm install
```

This will install all required packages including:
- `@auth0/auth0-react` - Auth0 React SDK
- `axios` - HTTP client for API calls
- All other existing dependencies

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Then edit `.env` and add your Auth0 credentials:

```env
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://api.prepverse.com
VITE_API_URL=http://localhost:8080/api
```

### 3. Configure Auth0

See [AUTH0_SETUP.md](./AUTH0_SETUP.md) for detailed Auth0 configuration steps.

Quick checklist:
- [ ] Create Auth0 application (Single Page Application type)
- [ ] Add callback URL: `http://localhost:5173/callback`
- [ ] Add logout URL: `http://localhost:5173`
- [ ] Enable Google social connection
- [ ] Create Auth0 API (for backend integration)
- [ ] Copy credentials to `.env`

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## What's Been Implemented

### File Structure
```
web/
├── src/
│   ├── lib/
│   │   └── auth0.ts              ✅ Auth0 configuration
│   ├── hooks/
│   │   └── useAuth.ts            ✅ Custom auth hook
│   ├── api/
│   │   ├── client.ts             ✅ Axios with auth interceptor
│   │   └── onboarding.ts         ✅ Onboarding API functions
│   ├── pages/
│   │   ├── Login.tsx             ✅ Updated with Auth0
│   │   ├── Callback.tsx          ✅ Auth0 callback handler
│   │   └── Onboarding.tsx        ✅ Existing onboarding page
│   ├── App.tsx                   ✅ Updated with auth state
│   └── main.tsx                  ✅ Wrapped with Auth0Provider
├── .env.example                  ✅ Environment template
└── AUTH0_SETUP.md                ✅ Setup documentation
```

### Features Implemented

1. **Authentication**
   - Google OAuth login via Auth0
   - Automatic token refresh
   - Secure token storage (memory-based)
   - Logout functionality

2. **API Integration**
   - Axios client with automatic Bearer token injection
   - Error handling interceptors
   - Onboarding API functions ready to use

3. **User Flow**
   - Login page with Google sign-in
   - Auth0 callback handling
   - Automatic redirect to onboarding after login
   - Loading states during authentication

4. **Security**
   - Tokens stored in memory (not localStorage)
   - Refresh token rotation enabled
   - Audience-scoped access tokens
   - Google-only authentication

## Testing the Integration

### 1. Test Login Flow

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click "Sign in with Google"
4. Complete Google authentication
5. You should be redirected to `/callback` then to onboarding page

### 2. Test API Client

The API client is ready to use. Example:

```typescript
import { getOnboardingStatus } from './api/onboarding';

// This automatically includes the auth token
const status = await getOnboardingStatus();
```

### 3. Test Auth Hook

```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div>
      {isAuthenticated && (
        <>
          <p>Hello, {user?.name}</p>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}
```

## Backend Requirements

Your backend API should:

1. **Accept Bearer tokens** in the Authorization header
2. **Validate Auth0 JWT tokens** using your Auth0 domain and audience
3. **Handle these endpoints** (as defined in `onboarding.ts`):
   - `GET /onboarding/status` - Get user's onboarding status
   - `GET /onboarding/questions?class=10|12` - Get onboarding questions
   - `POST /onboarding/submit` - Submit onboarding answers
   - `POST /onboarding/skip` - Skip onboarding

4. **CORS configuration** should allow:
   ```
   Access-Control-Allow-Origin: http://localhost:5173
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   ```

## Next Steps

1. **Configure Auth0** (see AUTH0_SETUP.md)
2. **Update backend** to validate Auth0 tokens
3. **Test the full flow** from login to onboarding
4. **Add React Router** for proper navigation (optional but recommended)
5. **Implement dashboard** page after onboarding completion

## Common Issues

### Issue: "Missing required Auth0 configuration"
**Solution**: Ensure all environment variables are set in `.env`

### Issue: Auth0 callback fails
**Solution**: Verify callback URL matches in both Auth0 Dashboard and your app

### Issue: API calls return 401 Unauthorized
**Solution**:
- Check that backend is validating Auth0 tokens correctly
- Verify VITE_AUTH0_AUDIENCE matches your Auth0 API identifier
- Ensure backend is configured to accept tokens from your Auth0 domain

### Issue: Google login not working
**Solution**:
- Verify Google connection is enabled in Auth0
- Check Google OAuth credentials in Auth0
- Ensure redirect URIs are configured in Google Cloud Console

## Getting Help

- Auth0 Documentation: https://auth0.com/docs
- Auth0 React SDK: https://auth0.com/docs/libraries/auth0-react
- PrepVerse Backend API docs: [Link to your backend docs]

## Development Tips

1. **Hot Reload**: The dev server supports hot reload - changes will reflect immediately
2. **Dev Navigation**: Use the bottom-left dev nav buttons to jump between pages
3. **Console Logs**: Check browser console for auth errors and API responses
4. **Network Tab**: Use browser DevTools Network tab to inspect API calls and tokens
