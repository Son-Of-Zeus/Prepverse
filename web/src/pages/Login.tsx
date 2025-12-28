import React, { useState } from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { PrepVerseLogo } from '../components/ui/PrepVerseLogo';
import { GoogleSignInButton } from '../components/ui/GoogleSignInButton';
import { useAuth } from '../hooks/useAuth';

/**
 * Login Page - The gateway to the PrepVerse universe
 *
 * Design Philosophy:
 * - Creates a sense of entering a "verse" or dimension of learning
 * - Dark, cosmic aesthetic with red accent representing focus and energy
 * - Typography hierarchy uses Fraunces for display, Space Grotesk for body
 * - Asymmetric layout breaks from typical centered login patterns
 * - Floating elements and particles create depth and movement
 */
export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      // Could show error message to user here
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Animated cosmic background */}
      <CosmicBackground starCount={100} showGrid showOrbs />

      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left panel - Decorative with floating elements */}
        <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
          {/* Large decorative text */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <span
              className="font-display text-[20rem] font-black text-white select-none"
              style={{
                opacity: 0.02,
                transform: 'rotate(-10deg) translateX(-10%)',
              }}
            >
              V
            </span>
          </div>

          {/* Floating subject badges */}
          <div className="relative w-full max-w-md">
            {/* Subject pills floating around */}
            <SubjectBadge
              label="Mathematics"
              color="bg-math"
              position="top-0 left-0"
              delay={0}
            />
            <SubjectBadge
              label="Physics"
              color="bg-physics"
              position="top-12 right-8"
              delay={200}
            />
            <SubjectBadge
              label="Chemistry"
              color="bg-chemistry"
              position="bottom-24 left-4"
              delay={400}
            />
            <SubjectBadge
              label="Biology"
              color="bg-biology"
              position="bottom-0 right-0"
              delay={600}
            />
          </div>
        </div>

        {/* Right panel - Login form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-12">
            {/* Logo section */}
            <div
              className="flex flex-col items-center opacity-0 animate-slide-up"
              style={{ animationDelay: '0.1s' }}
            >
              <PrepVerseLogo size="xl" animated showTagline />
            </div>

            {/* Welcome text */}
            <div
              className="text-center space-y-4 opacity-0 animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              <h2 className="font-display text-display-sm text-white">
                Enter the Verse
              </h2>
              <p className="text-gray-400 text-body-lg max-w-sm mx-auto">
                Your personalized learning universe awaits. CBSE 10th & 12th preparation, reimagined.
              </p>
            </div>

            {/* Sign in button */}
            <div
              className="flex justify-center opacity-0 animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <GoogleSignInButton onClick={handleGoogleSignIn} loading={isLoading} />
            </div>

            {/* Additional info */}
            <div
              className="text-center space-y-6 opacity-0 animate-fade-in"
              style={{ animationDelay: '0.5s' }}
            >
              {/* Trust indicators */}
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <ShieldIcon />
                <span>Secured with Auth0</span>
              </div>

              {/* Decorative line with dot */}
              <div className="flex items-center justify-center gap-4">
                <div className="w-16 h-px bg-gradient-to-r from-transparent to-white/20" />
                <div className="w-2 h-2 rounded-full bg-prepverse-red/50" />
                <div className="w-16 h-px bg-gradient-to-l from-transparent to-white/20" />
              </div>

              {/* Footer links */}
              <p className="text-gray-500 text-sm">
                By continuing, you agree to our{' '}
                <a
                  href="#"
                  className="text-prepverse-red hover:text-prepverse-red-light transition-colors"
                >
                  Terms
                </a>{' '}
                &{' '}
                <a
                  href="#"
                  className="text-prepverse-red hover:text-prepverse-red-light transition-colors"
                >
                  Privacy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom decorative wave */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L48 110C96 100 192 80 288 75C384 70 480 80 576 85C672 90 768 90 864 82.5C960 75 1056 60 1152 57.5C1248 55 1344 65 1392 70L1440 75V120H1392C1344 120 1248 120 1152 120C1056 120 960 120 864 120C768 120 672 120 576 120C480 120 384 120 288 120C192 120 96 120 48 120H0Z"
            fill="url(#waveGradient)"
            opacity="0.5"
          />
          <defs>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="1440" y2="0">
              <stop offset="0%" stopColor="#E53935" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#E53935" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#536DFE" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

// Helper Components

interface SubjectBadgeProps {
  label: string;
  color: string;
  position: string;
  delay: number;
}

const SubjectBadge: React.FC<SubjectBadgeProps> = ({ label, color, position, delay }) => (
  <div
    className={`absolute ${position} opacity-0 animate-scale-in`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div
      className={`
        px-4 py-2 rounded-full ${color} bg-opacity-20
        border border-white/10 backdrop-blur-sm
        font-mono text-sm text-white
        animate-float
      `}
      style={{ animationDelay: `${delay}ms`, animationDuration: `${4 + delay / 200}s` }}
    >
      {label}
    </div>
  </div>
);

interface StatItemProps {
  value: string;
  label: string;
}

const StatItem: React.FC<StatItemProps> = ({ value, label }) => (
  <div className="text-center">
    <div className="font-display text-xl text-white font-bold">{value}</div>
    <div className="font-mono text-xs text-gray-500 uppercase">{label}</div>
  </div>
);

const ShieldIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export default LoginPage;
