import React, { useState, useEffect, useRef } from 'react';
import './Timer.css';

// Fast test mode: treat minutes as seconds (e.g., 25 minutes runs in 25 seconds)
// Toggle to false to restore normal behavior.
const FAST_TIMER = false;

const Timer = ({ onOpenShelf = () => {}, onAwardCup = () => {} }) => {

  const [minutes, setMinutes] = useState(25);
  const [seconds, _setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionDurationSec, setSessionDurationSec] = useState(0); // real seconds, for awards/records
  const [sessionPlannedTicks, setSessionPlannedTicks] = useState(0); // ticking unit used by timer/progress
  const intervalRef = useRef(null);
  const hasAwardedRef = useRef(false); // guard to prevent double-awards

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(timeLeft => {
          if (timeLeft <= 1) {
            // stop ticking immediately
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // award only once per session
            if (!hasAwardedRef.current) {
              hasAwardedRef.current = true;
              setIsActive(false);
              setIsPaused(false);
              setIsComplete(true);
              playCompletionSound();
              // Award cup based on planned session duration (only when naturally completed)
              const minutesPlanned = Math.floor(sessionDurationSec / 60);
              const type = minutesPlanned >= 60 ? 'gold' : minutesPlanned >= 30 ? 'silver' : 'bronze';
              onAwardCup({
                type,
                awardedAt: new Date().toISOString(),
                durationSec: sessionDurationSec,
              });
              setTimeout(() => setIsComplete(false), 1000);
            }
            return 0;
          }
          return timeLeft - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, isPaused, onAwardCup, sessionDurationSec]);

  useEffect(() => {
    const totalTime = (FAST_TIMER ? (minutes + seconds) : (minutes * 60 + seconds));
    const denom = isActive || isPaused ? sessionPlannedTicks || totalTime : totalTime;
    if (denom > 0) {
      const newProgress = ((denom - timeLeft) / denom) * 100;
      setProgress(newProgress);
    }
  }, [timeLeft, minutes, seconds, isActive, isPaused, sessionPlannedTicks]);

  const playCompletionSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
  } catch {
      console.log('Audio not supported');
    }
  };

  const startTimer = () => {
    if (!isActive && !isPaused) {
      const totalRealSeconds = minutes * 60 + seconds; // for awards/logs
      const totalTicks = FAST_TIMER ? (minutes + seconds) : totalRealSeconds;
      setTimeLeft(totalTicks);
      setSessionPlannedTicks(totalTicks);
      setSessionDurationSec(totalRealSeconds);
  hasAwardedRef.current = false; // reset award guard at the start of a session
      setProgress(0);
    }
    setIsActive(true);
    setIsPaused(false);
    setIsComplete(false);
  };

  const pauseTimer = () => {
    setIsPaused(!isPaused);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(0);
    setProgress(0);
    setIsComplete(false);
  hasAwardedRef.current = false; // clear guard on manual reset
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = isActive || isPaused
    ? timeLeft
    : (FAST_TIMER ? (minutes + seconds) : (minutes * 60 + seconds));

  // Calculate cup liquid height - ensure it's visible even at small percentages
  const cupLiquidHeight = Math.max(progress, progress > 0 ? 4 : 0);

  return (
    <div className="timer-container">
      <div className="timer-header">
        <h1>FOCUSBREW</h1>
        <p className="timer-subtitle">STAY FOCUSED, ONE SIP AT A TIME</p>
      </div>

      <div className="timer-display pixel-border">
        <div className="time-value">
          {formatTime(displayTime)}
        </div>
      </div>

      <div className="timer-inputs">
        <div className="input-group">
          <label>MINUTES</label>
          <input
            type="number"
            min="1"
            max="60"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isActive}
          />
        </div>
      </div>

      <div className="timer-controls">
        {!isActive && !isPaused && (
          <button onClick={startTimer} className="start-btn pixel-bounce">
            START
          </button>
        )}
        {isActive && (
          <button onClick={pauseTimer} className="pause-btn">
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
        )}
        {(isActive || isPaused) && (
          <button onClick={resetTimer} className="reset-btn">
            RESET
          </button>
        )}
      </div>

      <div className="cup-container">
        <div className={`coffee-cup pixel-container ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}>
          {/* Clipping container for the liquid so it stays inside the cup */}
          <div className="cup-inner">
            <div
              className="cup-liquid"
              style={{
                height: `${cupLiquidHeight}%`,
                minHeight: progress > 0 ? '8px' : '0px',
              }}
            />
          </div>
          {/* Cup outline drawn with pixel-art box-shadows sits above the liquid */}
          <div className="cup-outline"></div>
          {/* Cup handle */}
          <div className="cup-handle"></div>
          {/* Steam animation */}
          {(progress > 0 || isActive) && (
            <div className="steam">
              <div className="steam-line steam-1"></div>
              <div className="steam-line steam-2"></div>
              <div className="steam-line steam-3"></div>
            </div>
          )}
        </div>
  {/* Removed progress tracker */}
        {isActive && !isPaused && (
          <div className="brew-status">BREWING...</div>
        )}
  <button className="shelf-btn" onClick={() => onOpenShelf()}>CUP SHELF</button>
      </div>

    </div>
  );
};

export default Timer;
