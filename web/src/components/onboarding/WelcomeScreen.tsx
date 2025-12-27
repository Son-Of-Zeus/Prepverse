import React from 'react';
import { PrepVerseLogo } from '../ui/PrepVerseLogo';
import { AlertTriangle } from 'lucide-react';

interface WelcomeScreenProps {
  userName: string;
  onContinue: () => void;
  alertMessage?: string | null;
}

/**
 * WelcomeScreen - Post-login welcome with user greeting
 *
 * Design Philosophy:
 * - Personal, warm welcome with user's name
 * - Preview of what's coming (quick assessment)
 * - Builds excitement before the assessment
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  userName,
  onContinue,
  alertMessage,
}) => {
  const features = [
    {
      icon: '01',
      title: '10 Quick Questions',
      description: 'A brief assessment to understand your current level',
    },
    {
      icon: '02',
      title: '10 Minutes',
      description: 'Just enough time to showcase your knowledge',
    },
    {
      icon: '03',
      title: 'Personalized Path',
      description: 'We will create a custom learning journey for you',
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-12">
        {/* Alert Message */}
        {alertMessage && (
          <div className="w-full p-6 rounded-3xl glass border border-red-500/20 flex items-center gap-4 animate-slide-down shadow-lg shadow-red-900/10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div>
              <h3 className="text-white font-display font-semibold text-lg">Session Terminated</h3>
              <p className="text-gray-400 text-sm">{alertMessage}</p>
            </div>
          </div>
        )}

        {/* Logo */}
        <div
          className="flex justify-center opacity-0 animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          <PrepVerseLogo size="lg" animated />
        </div>

        {/* Greeting */}
        <div
          className="text-center space-y-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-prepverse-red/10 border border-prepverse-red/20">
            <span className="text-prepverse-red text-sm">Welcome aboard!</span>
          </div>

          <h1 className="font-display text-display-md text-white">
            Hey{' '}
            <span className="text-gradient-brand">{userName}</span>
          </h1>

          <p className="text-gray-400 text-body-lg max-w-md mx-auto">
            Before we begin, let us understand your current preparation level with a quick assessment.
          </p>
        </div>

        {/* Features preview */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          {features.map((feature, index) => (
            <div
              key={feature.icon}
              className="glass rounded-2xl p-6 text-center space-y-3 opacity-0 animate-scale-in"
              style={{ animationDelay: `${500 + index * 100}ms` }}
            >
              <div className="font-mono text-3xl font-bold text-gradient-brand">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-white">{feature.title}</h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div
          className="flex flex-col items-center gap-4 opacity-0 animate-slide-up"
          style={{ animationDelay: '0.6s' }}
        >
          <button
            onClick={onContinue}
            className="group relative px-8 py-4 bg-prepverse-red text-white font-semibold text-lg rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-prepverse-red focus:ring-offset-4 focus:ring-offset-void"
          >
            {/* Gradient shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

            <span className="relative flex items-center gap-3">
              Let us Begin
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </button>

          <p className="text-gray-500 text-sm">
            No pressure - this is just to personalize your experience
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
