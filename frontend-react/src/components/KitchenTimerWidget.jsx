import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Bell, 
  Clock, 
  ChevronUp, 
  ChevronDown, 
  Flame, 
  Sparkles,
  CheckCircle2,
  X
} from 'lucide-react';
import { playTimerSound, playSuccessSound, playClickSound } from '../utils/soundEffects';
import { useToast } from '../context/ToastContext';

const PRESETS = [
  { id: 'soft_egg', label: 'Soft Boiled Egg', minutes: 6, seconds: 0, icon: '🥚' },
  { id: 'hard_egg', label: 'Hard Boiled Egg', minutes: 10, seconds: 0, icon: '🥚' },
  { id: 'pasta', label: 'Pasta Al Dente', minutes: 9, seconds: 0, icon: '🍝' },
  { id: 'tea', label: 'Tea / French Press', minutes: 4, seconds: 0, icon: '🍵' },
  { id: 'steak_flip', label: 'Steak Flip', minutes: 3, seconds: 0, icon: '🥩' },
  { id: 'rest_meat', label: 'Rest Meat', minutes: 5, seconds: 0, icon: '🔪' },
  { id: 'bake_check', label: 'Bake Check', minutes: 20, seconds: 0, icon: '🍞' },
  { id: 'quick_test', label: '10s Test Timer', minutes: 0, seconds: 10, icon: '⚡' },
];

function formatTime(totalSecs) {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function KitchenTimerWidget({ isFloating = false, onClose }) {
  const toast = useToast();
  const [timers, setTimers] = useState(() => {
    try {
      const saved = localStorage.getItem('chef_kitchen_timers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customLabel, setCustomLabel] = useState('');
  const [customMin, setCustomMin] = useState(5);
  const [customSec, setCustomSec] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('chef_kitchen_timers', JSON.stringify(timers));
    } catch (e) {
      console.warn('Failed to save timers to localStorage', e);
    }
  }, [timers]);

  // Main Timer Interval
  useEffect(() => {
    const hasRunning = timers.some(t => t.isRunning && t.remaining > 0);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (!t.isRunning || t.remaining <= 0) return t;

        const nextRemaining = t.remaining - 1;
        if (nextRemaining === 0) {
          // Finished!
          if (soundEnabled) {
            playTimerSound();
            setTimeout(() => playSuccessSound(), 400);
          }
          toast.success(`⏰ Timer Alert: "${t.label}" is ready!`);
          return { ...t, remaining: 0, isRunning: false, isFinished: true };
        }

        return { ...t, remaining: nextRemaining };
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [timers, soundEnabled, toast]);

  const handleStartTimer = (id) => {
    playClickSound();
    setTimers(prev => prev.map(t => t.id === id ? { ...t, isRunning: true, isFinished: false } : t));
  };

  const handlePauseTimer = (id) => {
    playClickSound();
    setTimers(prev => prev.map(t => t.id === id ? { ...t, isRunning: false } : t));
  };

  const handleResetTimer = (id) => {
    playClickSound();
    setTimers(prev => prev.map(t => t.id === id ? { ...t, remaining: t.total, isRunning: false, isFinished: false } : t));
  };

  const handleDeleteTimer = (id) => {
    playClickSound();
    setTimers(prev => prev.filter(t => t.id !== id));
  };

  const handleAddPreset = (preset) => {
    playClickSound();
    const total = preset.minutes * 60 + preset.seconds;
    const newTimer = {
      id: `timer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: preset.label,
      icon: preset.icon,
      total,
      remaining: total,
      isRunning: true,
      isFinished: false,
      createdAt: Date.now()
    };
    setTimers(prev => [...prev, newTimer]);
    toast.success(`Started "${preset.label}" (${formatTime(total)}) ⏱️`);
  };

  const handleCreateCustom = (e) => {
    e.preventDefault();
    const total = (parseInt(customMin, 10) || 0) * 60 + (parseInt(customSec, 10) || 0);
    if (total <= 0) {
      toast.error('Please enter a valid time greater than 0.');
      return;
    }
    const label = customLabel.trim() || `Timer (${formatTime(total)})`;
    const newTimer = {
      id: `timer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label,
      icon: '⏱️',
      total,
      remaining: total,
      isRunning: true,
      isFinished: false,
      createdAt: Date.now()
    };
    setTimers(prev => [...prev, newTimer]);
    setCustomLabel('');
    setShowAddForm(false);
    toast.success(`Started "${label}" timer! 🎯`);
  };

  const runningCount = timers.filter(t => t.isRunning).length;

  return (
    <div className={`kitchen-timer-widget card glass ${isFloating ? 'floating-timer-container' : ''}`}>
      {/* Header */}
      <div className="timer-header">
        <div className="timer-title-wrap">
          <div className={`timer-status-icon ${runningCount > 0 ? 'pulse-glow' : ''}`}>
            <Clock size={18} />
          </div>
          <div>
            <h3 className="timer-title">Kitchen Multi-Timer</h3>
            <span className="timer-subtitle">
              {runningCount > 0 ? `${runningCount} active timer${runningCount > 1 ? 's' : ''}` : 'Ready for cooking'}
            </span>
          </div>
        </div>

        <div className="timer-header-actions">
          <button 
            className={`timer-icon-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(prev => !prev)}
            title={soundEnabled ? 'Mute Chimes' : 'Enable Audio Chimes'}
            aria-label="Toggle Sound"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          <button
            className="timer-icon-btn"
            onClick={() => setIsExpanded(prev => !prev)}
            title={isExpanded ? 'Collapse' : 'Expand'}
            aria-label="Toggle Expand"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isFloating && onClose && (
            <button className="timer-icon-btn close-btn" onClick={onClose} aria-label="Close Floating Timer">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="timer-body">
          {/* Active Timers List */}
          {timers.length > 0 && (
            <div className="active-timers-list">
              {timers.map(timer => {
                const progressPct = timer.total > 0 ? ((timer.total - timer.remaining) / timer.total) * 100 : 0;
                const isFinished = timer.isFinished || timer.remaining === 0;

                return (
                  <div 
                    key={timer.id} 
                    className={`timer-item-card ${timer.isRunning ? 'ticking' : ''} ${isFinished ? 'finished' : ''}`}
                  >
                    <div className="timer-item-top">
                      <div className="timer-item-label-group">
                        <span className="timer-item-icon">{timer.icon || '⏱️'}</span>
                        <span className="timer-item-label">{timer.label}</span>
                      </div>

                      <div className="timer-item-countdown">
                        <span className={`timer-clock-digits ${isFinished ? 'alert-flash' : ''}`}>
                          {formatTime(timer.remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="timer-progress-track">
                      <div 
                        className={`timer-progress-fill ${isFinished ? 'finished' : ''}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Controls */}
                    <div className="timer-item-controls">
                      {isFinished ? (
                        <button 
                          className="btn-timer-action reset" 
                          onClick={() => handleResetTimer(timer.id)}
                          title="Reset and Cook Again"
                        >
                          <RotateCcw size={13} /> Reset
                        </button>
                      ) : timer.isRunning ? (
                        <button 
                          className="btn-timer-action pause" 
                          onClick={() => handlePauseTimer(timer.id)}
                          title="Pause Timer"
                        >
                          <Pause size={13} /> Pause
                        </button>
                      ) : (
                        <button 
                          className="btn-timer-action resume" 
                          onClick={() => handleStartTimer(timer.id)}
                          title="Resume Timer"
                        >
                          <Play size={13} /> Start
                        </button>
                      )}

                      <button 
                        className="btn-timer-action reset" 
                        onClick={() => handleResetTimer(timer.id)}
                        title="Reset to full time"
                      >
                        <RotateCcw size={13} />
                      </button>

                      <button 
                        className="btn-timer-action delete" 
                        onClick={() => handleDeleteTimer(timer.id)}
                        title="Dismiss Timer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Presets Grid */}
          <div className="timer-presets-section">
            <div className="timer-section-header">
              <span className="timer-section-title">⚡ Culinary Presets</span>
              <button 
                className="btn-add-custom-timer"
                onClick={() => setShowAddForm(prev => !prev)}
              >
                <Plus size={13} /> {showAddForm ? 'Cancel' : 'Custom'}
              </button>
            </div>

            {/* Custom Input Form Drawer */}
            {showAddForm && (
              <form onSubmit={handleCreateCustom} className="timer-custom-form fade-in-up">
                <input
                  type="text"
                  placeholder="Timer label (e.g. Simmering Sauce)"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="timer-input text"
                />
                <div className="timer-time-inputs">
                  <div className="timer-time-group">
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={customMin}
                      onChange={(e) => setCustomMin(e.target.value)}
                      className="timer-input num"
                    />
                    <span className="unit-label">min</span>
                  </div>
                  <span className="time-colon">:</span>
                  <div className="timer-time-group">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customSec}
                      onChange={(e) => setCustomSec(e.target.value)}
                      className="timer-input num"
                    />
                    <span className="unit-label">sec</span>
                  </div>
                  <button type="submit" className="btn-create-timer">
                    <Play size={13} /> Start
                  </button>
                </div>
              </form>
            )}

            <div className="timer-preset-chips">
              {PRESETS.map(preset => (
                <button
                  key={preset.id}
                  className="timer-preset-btn"
                  onClick={() => handleAddPreset(preset)}
                  title={`Start ${preset.label} (${preset.minutes}m ${preset.seconds ? preset.seconds + 's' : ''})`}
                >
                  <span className="preset-icon">{preset.icon}</span>
                  <span className="preset-name">{preset.label}</span>
                  <span className="preset-dur">
                    {preset.minutes > 0 ? `${preset.minutes}m` : `${preset.seconds}s`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
