import React from 'react';

interface PrepVerseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  showTagline?: boolean;
}

/**
 * PrepVerseLogo - The brand identity component
 * Features a geometric "verse" symbol with animated glow effects
 */
export const PrepVerseLogo: React.FC<PrepVerseLogoProps> = ({
  size = 'md',
  animated = true,
  showTagline = false,
}) => {
  const sizes = {
    sm: { icon: 40, text: 'text-xl', tagline: 'text-xs' },
    md: { icon: 56, text: 'text-2xl', tagline: 'text-sm' },
    lg: { icon: 72, text: 'text-3xl', tagline: 'text-base' },
    xl: { icon: 96, text: 'text-4xl', tagline: 'text-lg' },
  };

  const { icon, text, tagline } = sizes[size];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Logo Mark */}
      <div className="relative">
        {/* Glow effect behind logo */}
        {animated && (
          <div
            className="absolute inset-0 animate-pulse-glow"
            style={{
              background: 'radial-gradient(circle, rgba(229, 57, 53, 0.4) 0%, transparent 70%)',
              filter: 'blur(20px)',
              transform: 'scale(1.5)',
            }}
          />
        )}

        {/* Logo SVG - Geometric "V" representing verse/vertex */}
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`relative ${animated ? 'animate-float' : ''}`}
          style={{ animationDuration: '4s' }}
        >
          {/* Outer hexagon frame */}
          <path
            d="M50 5L90 27.5V72.5L50 95L10 72.5V27.5L50 5Z"
            stroke="url(#logoGradient)"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />

          {/* Inner geometric V shape */}
          <path
            d="M30 30L50 70L70 30"
            stroke="url(#logoGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Vertex dot at center */}
          <circle cx="50" cy="70" r="4" fill="#E53935" />

          {/* Connection lines from V to frame */}
          <line x1="30" y1="30" x2="10" y2="45" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.4" />
          <line x1="70" y1="30" x2="90" y2="45" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.4" />
          <line x1="50" y1="70" x2="50" y2="95" stroke="url(#logoGradient)" strokeWidth="1" opacity="0.4" />

          {/* Orbital dots */}
          <circle cx="10" cy="50" r="2" fill="#FF6F60" opacity="0.8" />
          <circle cx="90" cy="50" r="2" fill="#FF6F60" opacity="0.8" />
          <circle cx="50" cy="5" r="2" fill="#FF6F60" opacity="0.8" />

          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E53935" />
              <stop offset="50%" stopColor="#FF6F60" />
              <stop offset="100%" stopColor="#FFD54F" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Logo Text */}
      <div className="flex flex-col items-center">
        <h1 className={`font-display font-bold ${text} tracking-tight`}>
          <span className="text-white">Prep</span>
          <span className="text-gradient-brand">Verse</span>
        </h1>

        {showTagline && (
          <p className={`font-mono ${tagline} text-gray-400 mt-2 tracking-widest uppercase`}>
            Learn. Compete. Connect.
          </p>
        )}
      </div>
    </div>
  );
};

export default PrepVerseLogo;
