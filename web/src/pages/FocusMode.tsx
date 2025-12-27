import React from 'react';
import { CosmicBackground } from '../components/ui/CosmicBackground';
import { AssessmentTimer } from '../components/onboarding/AssessmentTimer';
import { FocusModeSettings } from '../components/onboarding/FocusModeSettings';
import FocusModeSession from '../components/onboarding/FocusModeSession';
import { useFocus } from '../contexts/FocusContext';

interface FocusModePageProps {
  onNavigateBack?: () => void;
}

export const FocusModePage: React.FC<FocusModePageProps> = ({ onNavigateBack }) => {
  const { isActive, settings, updateSettings, startSession, stopSession, timeRemaining, totalTime, isPaused, isOnBreak } = useFocus();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-void">
      <CosmicBackground starCount={80} showGrid showOrbs />

      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateBack}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back
          </button>
          <div>
            <h1 className="font-display text-xl text-white">Focus Zone</h1>
            <p className="text-gray-500 text-sm">Deep Work Session</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8 md:px-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">

        {!isActive ? (
          <div className="w-full max-w-xl animate-fade-in">
            <FocusModeSettings
              initialSettings={settings}
              onSettingsChange={updateSettings}
            />
            <div className="mt-8 flex justify-center">
              <button
                onClick={startSession}
                className="px-12 py-5 bg-gradient-to-r from-prepverse-red to-prepverse-red-deep hover:from-prepverse-red-light hover:to-prepverse-red transition-all duration-300 rounded-2xl text-white font-bold text-xl shadow-[0_0_30px_rgba(229,57,53,0.3)] hover:shadow-[0_0_50px_rgba(229,57,53,0.5)] transform hover:scale-105"
              >
                Enter Focus Mode
              </button>
            </div>
          </div>
        ) : (
          <FocusModeSession settings={settings}>
            <div className="flex flex-col items-center justify-center w-full max-w-2xl">
              <div className="mb-12 transform scale-150">
                <AssessmentTimer
                  totalSeconds={totalTime}
                  forcedTimeRemaining={timeRemaining}
                  isPaused={isPaused}
                  onTimeUp={() => { /* Handled by Context */ }}
                />
              </div>

              <div className="text-center space-y-4">
                <h2 className="text-2xl font-display text-white">
                  {isOnBreak ? "Break Time" : isPaused ? "Session Paused" : "Stay Focused"}
                </h2>
                <p className="text-gray-400 max-w-md">
                  {isOnBreak ? "Enjoy your break! The next session will start shortly." : "Your session is active."}
                </p>
                <div className="flex gap-4 justify-center mt-8">
                  <button
                    onClick={stopSession}
                    className="px-6 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
                  >
                    End Session
                  </button>
                </div>
              </div>
            </div>
          </FocusModeSession>
        )}

      </main>
    </div>
  );
};

export default FocusModePage;
