import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Bell, Timer, PauseCircle, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PARChecklistDialog from './PARChecklistDialog';

const PAR_INTERVAL_MINUTES = 20;
const PAR_WARNING_MINUTES = 3;
const TOTAL_SECONDS = PAR_INTERVAL_MINUTES * 60;
const WARNING_SECONDS = PAR_WARNING_MINUTES * 60;

export default function PARAlert({ lastRadioLogTime, onRequestPAR, isReadOnly, units = [] }) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [overdue, setOverdue] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const lastResetRef = useRef(null);
  const notifFiredRef = useRef(false);

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotifGranted(true);
    }
  }, []);

  const requestNotifPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setNotifGranted(result === 'granted');
  };

  // Reset timer when a new radio log comes in
  useEffect(() => {
    if (!lastRadioLogTime) return;
    if (lastResetRef.current === lastRadioLogTime) return;
    lastResetRef.current = lastRadioLogTime;
    setSecondsLeft(TOTAL_SECONDS);
    setOverdue(false);
    setDismissed(false);
    notifFiredRef.current = false;
  }, [lastRadioLogTime]);

  // Countdown tick
  useEffect(() => {
    if (stopped) return;
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
  }, [stopped]);

  // Fire browser notification when overdue
  useEffect(() => {
    if (overdue && notifGranted && !notifFiredRef.current) {
      notifFiredRef.current = true;
      new Notification('⚠️ PAR Check Required', {
        body: 'It has been 20 minutes. Conduct a Personnel Accountability Report now.',
        icon: '/favicon.ico',
        requireInteraction: true,
      });
    }
  }, [overdue, notifGranted]);

  const handleInitiatePAR = () => {
    setShowChecklist(true);
  };

  const handleConfirmPAR = () => {
    setSecondsLeft(TOTAL_SECONDS);
    setOverdue(false);
    setDismissed(false);
    setStopped(false);
    notifFiredRef.current = false;
    onRequestPAR?.();
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const isWarning = secondsLeft <= WARNING_SECONDS && secondsLeft > 0;
  const progress = secondsLeft / TOTAL_SECONDS;
  const circumference = 2 * Math.PI * 10;

  // ── Checklist Dialog (rendered regardless of banner state) ──
  const checklistDialog = (
    <PARChecklistDialog
      open={showChecklist}
      onClose={() => setShowChecklist(false)}
      units={units}
      onConfirmPAR={handleConfirmPAR}
    />
  );

  // ── Overdue banner ──
  if (overdue && !dismissed) {
    return (
      <>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-red-950/60 border-b-2 border-red-500/70 animate-pulse-red">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-mono font-black text-red-300 tracking-wide uppercase">
            PAR OVERDUE — Accountability check required
          </span>
          <p className="text-[10px] font-mono text-red-400/70 mt-0.5">
            {PAR_INTERVAL_MINUTES} minutes have elapsed since last radio activity.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isReadOnly && (
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-3 text-xs font-mono gap-1.5"
              onClick={handleInitiatePAR}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Initiate PAR
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-3 text-xs font-mono gap-1.5 border-red-500/40 text-red-300 hover:bg-red-950/40"
            onClick={() => { setStopped(true); setDismissed(true); }}
          >
            <PauseCircle className="w-3.5 h-3.5" /> Stop Timer
          </Button>
        </div>
      </div>
      {checklistDialog}
    </>
    );
  }

  // ── Warning / normal countdown strip ──
  return (
    <>
    <div className={`flex items-center gap-3 px-4 py-1.5 border-b border-border/50 transition-colors ${
      isWarning ? 'bg-yellow-950/30 border-yellow-700/40' : 'bg-muted/30'
    }`}>
      {/* Circular progress */}
      <div className="relative w-5 h-5 shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5 -rotate-90">
          <circle cx="12" cy="12" r="10" stroke="currentColor"
            className="text-secondary/60" strokeWidth="3" fill="none" />
          <circle cx="12" cy="12" r="10" stroke="currentColor"
            className={isWarning ? 'text-yellow-400' : 'text-primary'}
            strokeWidth="3" fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <Timer className={`w-2 h-2 absolute inset-0 m-auto ${isWarning ? 'text-yellow-400' : 'text-muted-foreground'}`} />
      </div>

      <span className={`text-xs font-mono font-bold tabular-nums ${isWarning ? 'text-yellow-300' : 'text-muted-foreground'}`}>
        {mins}:{secs}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground/60">
        {stopped ? '⏸ PAR timer stopped' : isWarning ? '⚠ PAR check due soon' : 'until next PAR check'}
      </span>

      <div className="ml-auto flex items-center gap-2">
        {/* Notification permission button */}
        {'Notification' in window && Notification.permission === 'default' && (
          <button
            onClick={requestNotifPermission}
            title="Enable PAR alerts"
            className="text-muted-foreground/40 hover:text-primary transition-colors"
          >
            <Bell className="w-3 h-3" />
          </button>
        )}
        {stopped ? (
          <button
            onClick={() => setStopped(false)}
            title="Resume PAR timer"
            className="text-xs font-mono text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Resume
          </button>
        ) : !isReadOnly && (
          <button
            onClick={handleInitiatePAR}
            title="Initiate PAR & reset timer"
            className={`text-xs font-mono transition-colors ${isWarning ? 'text-yellow-400 hover:text-yellow-300' : 'text-muted-foreground/50 hover:text-primary'}`}
          >
            PAR ↺
          </button>
        )}
      </div>
    </div>
    {checklistDialog}
    </>
  );
}