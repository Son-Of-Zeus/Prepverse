import React, { useState } from 'react';

export interface FocusModeSettings {
  pomodoroMinutes: number;
  breakMinutes: number;
  enabled: boolean;
}

interface FocusModeSettingsProps {
  onSettingsChange: (settings: FocusModeSettings) => void;
  initialSettings?: FocusModeSettings;
}

/**
 * FocusModeSettings - Configuration component for focus mode and pomodoro timers
 */
export const FocusModeSettings: React.FC<FocusModeSettingsProps> = ({
  onSettingsChange,
  initialSettings,
}) => {
  const [settings, setSettings] = useState<FocusModeSettings>(
    initialSettings || {
      pomodoroMinutes: 25,
      breakMinutes: 5,
      enabled: false,
    }
  );

  const handleToggle = (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handlePomodoroChange = (minutes: number) => {
    const newSettings = { ...settings, pomodoroMinutes: minutes };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleBreakChange = (minutes: number) => {
    const newSettings = { ...settings, breakMinutes: minutes };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className="glass rounded-2xl p-6 border border-white/10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl text-white font-bold mb-1">
            Focus Mode
          </h3>
          <p className="text-sm text-gray-400">
            Enable distraction-free study sessions with pomodoro breaks
          </p>
        </div>
        {/* Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-14 h-7 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-prepverse-red/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-prepverse-red"></div>
        </label>
      </div>

      {settings.enabled && (
        <div className="space-y-6 pt-4 border-t border-white/10 animate-fade-in">
          {/* Timer Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pomodoro Timer */}
            <div className="relative">
              {/* Background glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-br from-electric/20 via-plasma/20 to-solar/20 rounded-2xl blur-sm opacity-50" />
              
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-electric/20 flex items-center justify-center border border-electric/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white">
                      Focus Time
                    </label>
                    <span className="text-xs text-gray-400">minutes</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePomodoroChange(Math.max(5, settings.pomodoroMinutes - 5))}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white flex items-center justify-center font-bold text-lg transition-all duration-200 hover:border-electric/30"
                  >
                    −
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="5"
                      max="120"
                      step="5"
                      value={settings.pomodoroMinutes}
                      onChange={(e) => handlePomodoroChange(Math.max(5, Math.min(120, parseInt(e.target.value) || 25)))}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white text-center font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-electric/50 focus:border-electric/30 transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-xs text-gray-500 font-normal">min</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handlePomodoroChange(Math.min(120, settings.pomodoroMinutes + 5))}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white flex items-center justify-center font-bold text-lg transition-all duration-200 hover:border-electric/30"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Break Timer */}
            <div className="relative">
              {/* Background glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-br from-solar/20 via-plasma/20 to-electric/20 rounded-2xl blur-sm opacity-50" />
              
              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-solar/20 flex items-center justify-center border border-solar/30">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-solar">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white">
                      Break Time
                    </label>
                    <span className="text-xs text-gray-400">minutes</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleBreakChange(Math.max(1, settings.breakMinutes - 1))}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white flex items-center justify-center font-bold text-lg transition-all duration-200 hover:border-solar/30"
                  >
                    −
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="1"
                      max="30"
                      step="1"
                      value={settings.breakMinutes}
                      onChange={(e) => handleBreakChange(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white text-center font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-solar/50 focus:border-solar/30 transition-all [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-xs text-gray-500 font-normal">min</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBreakChange(Math.min(30, settings.breakMinutes + 1))}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white flex items-center justify-center font-bold text-lg transition-all duration-200 hover:border-solar/30"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="pt-4 border-t border-white/10">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-electric/10 via-plasma/10 to-solar/10 border border-white/10 p-4">
              <div className="absolute top-0 right-0 w-32 h-32 bg-electric/5 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-electric/20 flex items-center justify-center border border-electric/30">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-electric"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-semibold text-white mb-2">How it works</p>
                  <ul className="space-y-1.5 text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="text-electric mt-1">•</span>
                      <span>Focus mode blocks distractions and tab switching</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-electric mt-1">•</span>
                      <span>After <span className="font-semibold text-white">{settings.pomodoroMinutes} minutes</span> of focused time, you'll get a <span className="font-semibold text-white">{settings.breakMinutes}-minute</span> break</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-electric mt-1">•</span>
                      <span>Interruptions reset the pomodoro timer</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusModeSettings;

