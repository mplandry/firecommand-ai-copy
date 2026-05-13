import React, { useState, useEffect, useRef } from 'react';
import { Timer, AlertTriangle, RotateCcw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// How long (in minutes) before a PAR check is considered overdue
const PAR_INTERVAL_MINUTES = 10;
const PAR_WARNING_MINUTES = 2; // warn when this many minutes remain
const TOTAL_SECONDS = PAR_INTERVAL_MINUTES * 60;
const WARNING_SECONDS = PAR_WARNING_MINUTES * 60;

export default function PARCountdownTimer({ lastRadioLogTime, onRequestPAR, isReadOnly }) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [overdue, setOverdue] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lastResetRef = useRef(null);

  // Reset whenever a new radio log comes in
  useEffect(() => {
    if (!lastRadioLogTime) return;
    if (lastResetRef.current === lastRadioLogTime) return;
    lastResetRef.current = lastRadioLogTime;
    setSecondsLeft(TOTAL_SECONDS);
    setOverdue(false);
    setDismissed(false);
  }, [lastRadioLogTime]);

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setOverdue(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleReset = () => {
    setSecondsLeft(TOTAL_SECONDS);
    setOverdue(false);
    setDismissed(false);
    onRequestPAR?.();
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const progress = secondsLeft / TOTAL_SECONDS; // 1 → 0
  const isWarning = secondsLeft <= WARNING_SECONDS && secondsLeft > 0;
  const circumference = 2 * Math.PI * 10; // radius=10

  if (overdue && !dismissed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border-b border-red-600/40 animate-pulse-red">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-xs font-mono font-bold text-red-300 flex-1">
          PAR OVERDUE — Accountability check required
        </span>
        <div className="flex gap-1.5 shrink-0">
          {!isReadOnly && (
            <Button
              size="sm"
              variant="destructive"
              className="h-6 px-2 text-[10px] font-mono gap-1"
              onClick={handleReset}
            >
              <CheckCircle className="w-3 h-3" /> Initiate PAR
            </Button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-[10px] font-mono text-red-400/70 hover:text-red-300 px-1"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (dismissed && !overdue) return null;

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 border-b border-border/60 transition-colors ${
      isWarning ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-secondary/30'
    }`}>
      {/* Circular countdown */}
      <div className="relative w-6 h-6 shrink-0">
        <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
          <circle cx="12" cy="12" r="10" stroke="currentColor"
            className="text-secondary/60" strokeWidth="2.5" fill="none" />
          <circle cx="12" cy="12" r="10" stroke="currentColor"
            className={isWarning ? 'text-yellow-400' : 'text-primary'}
            strokeWidth="2.5" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <Timer className={`w-2.5 h-2.5 absolute inset-0 m-auto ${isWarning ? 'text-yellow-400' : 'text-muted-foreground'}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono font-bold tabular-nums ${
            isWarning ? 'text-yellow-300' : 'text-foreground'
          }`}>
            {mins}:{secs}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground truncate">
            {isWarning ? 'PAR check due soon' : 'until PAR check'}
          </span>
        </div>
      </div>

      {!isReadOnly && (
        <button
          onClick={handleReset}
          title="Initiate PAR & reset timer"
          className="text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}