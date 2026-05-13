import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock, Radio, XCircle, Check, RotateCcw } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

const PAR_TIMEOUT_SECONDS = 120; // 2 min to respond

const ACCOUNTABLE_STATUSES = ['on_scene', 'working', 'par', 'interior', 'roof'];

export default function PARTracker({ units, onRequestPAR, onMarkUnitPAR }) {
  const [parActive, setParActive] = useState(false);
  const [parStartTime, setParStartTime] = useState(null);
  const [respondedIds, setRespondedIds] = useState(new Set());
  const [secondsLeft, setSecondsLeft] = useState(PAR_TIMEOUT_SECONDS);
  const timerRef = useRef(null);

  const accountableUnits = units.filter(u =>
    ['on_scene', 'working', 'par'].includes(u.status)
  );

  // Countdown timer during active PAR
  useEffect(() => {
    if (!parActive) return;
    setSecondsLeft(PAR_TIMEOUT_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [parActive]);

  const getParStatus = (unit) => {
    if (!unit.last_par_time) return 'none';
    const diff = Date.now() - new Date(unit.last_par_time).getTime();
    if (diff < 10 * 60 * 1000) return 'good';
    if (diff < 20 * 60 * 1000) return 'warning';
    return 'overdue';
  };

  const startPAR = () => {
    setParActive(true);
    setParStartTime(new Date());
    setRespondedIds(new Set());
    onRequestPAR?.();
  };

  const cancelPAR = () => {
    clearInterval(timerRef.current);
    setParActive(false);
    setParStartTime(null);
    setRespondedIds(new Set());
  };

  const markResponded = (unit) => {
    setRespondedIds(prev => new Set([...prev, unit.id]));
    onMarkUnitPAR?.(unit);
  };

  const completePAR = () => {
    clearInterval(timerRef.current);
    setParActive(false);
    setParStartTime(null);
    setRespondedIds(new Set());
  };

  const respondedCount = respondedIds.size;
  const totalCount = accountableUnits.length;
  const notRespondedUnits = accountableUnits.filter(u => !respondedIds.has(u.id));
  const allResponded = totalCount > 0 && respondedCount === totalCount;
  const timedOut = secondsLeft === 0;

  const parStatusStyles = {
    good:    { bar: 'text-green-400', bg: 'bg-secondary/30' },
    warning: { bar: 'text-yellow-400', bg: 'bg-yellow-500/5 border border-yellow-600/20' },
    overdue: { bar: 'text-red-400',   bg: 'bg-red-600/10 border border-red-500/20' },
    none:    { bar: 'text-muted-foreground', bg: 'bg-secondary/30' },
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const progressPct = (secondsLeft / PAR_TIMEOUT_SECONDS) * 100;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-secondary/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-chart-1" />
          <h3 className="text-sm font-bold font-mono tracking-wider text-foreground uppercase">
            PAR Accountability
          </h3>
          {accountableUnits.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {accountableUnits.length} unit{accountableUnits.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!parActive ? (
          <Button
            size="sm"
            variant="default"
            onClick={startPAR}
            disabled={!onRequestPAR || accountableUnits.length === 0}
            className="gap-1.5 text-xs bg-primary"
          >
            <Radio className="w-3.5 h-3.5" /> Initiate PAR
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={cancelPAR} className="text-xs text-muted-foreground">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
        )}
      </div>

      {/* Active PAR session */}
      {parActive && (
        <div className={`px-4 py-3 border-b border-border ${allResponded ? 'bg-green-900/20' : timedOut ? 'bg-red-900/15' : 'bg-amber-900/10'}`}>
          {/* Status line */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {allResponded ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-xs font-mono font-bold text-green-300">ALL UNITS ACCOUNTED FOR</span>
                </>
              ) : timedOut ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-red-300">PAR TIMEOUT — {notRespondedUnits.length} NOT REPORTED</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-amber-300">PAR IN PROGRESS</span>
                </>
              )}
            </div>
            <span className={`text-sm font-mono font-bold tabular-nums ${timedOut ? 'text-red-400' : secondsLeft < 30 ? 'text-yellow-400' : 'text-foreground'}`}>
              {mins}:{secs}
            </span>
          </div>

          {/* Progress bar */}
          {!allResponded && (
            <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${timedOut ? 'bg-red-500' : secondsLeft < 30 ? 'bg-yellow-500' : 'bg-primary'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          {/* Responded tally */}
          <div className="flex items-center justify-between text-xs font-mono mb-3">
            <span className="text-muted-foreground">Responded:</span>
            <span className={`font-bold ${allResponded ? 'text-green-400' : 'text-foreground'}`}>
              {respondedCount} / {totalCount}
            </span>
          </div>

          {/* Units awaiting response */}
          {!allResponded && notRespondedUnits.length > 0 && (
            <div className="space-y-1 mb-3">
              <p className="text-[10px] font-mono text-red-400 uppercase tracking-wider mb-1">
                ⚠ Awaiting Response
              </p>
              {notRespondedUnits.map(unit => (
                <div key={unit.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-red-600/10 border border-red-500/20">
                  <span className="font-mono text-xs font-semibold text-red-300">{unit.unit_name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markResponded(unit)}
                    className="h-6 px-2 text-[10px] text-green-400 hover:text-green-300 hover:bg-green-900/20"
                  >
                    <Check className="w-3 h-3 mr-1" /> Mark PAR
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Responded units */}
          {respondedCount > 0 && (
            <div className="space-y-1 mb-3">
              <p className="text-[10px] font-mono text-green-400 uppercase tracking-wider mb-1">
                ✓ Reported In
              </p>
              {accountableUnits.filter(u => respondedIds.has(u.id)).map(unit => (
                <div key={unit.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-green-900/10 border border-green-700/20">
                  <span className="font-mono text-xs text-green-300">{unit.unit_name}</span>
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                </div>
              ))}
            </div>
          )}

          {/* Complete button */}
          <Button
            size="sm"
            className="w-full text-xs gap-1.5"
            variant={allResponded ? 'default' : 'outline'}
            onClick={completePAR}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {allResponded ? 'Close PAR — All Clear' : 'Complete PAR'}
          </Button>
        </div>
      )}

      {/* Idle unit list with last PAR times */}
      {!parActive && (
        <div className="p-3 space-y-2">
          {accountableUnits.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground/50">
              No working units on scene
            </div>
          )}
          {accountableUnits.map(unit => {
            const parStatus = getParStatus(unit);
            const styles = parStatusStyles[parStatus];
            return (
              <div key={unit.id} className={`flex items-center justify-between px-2 py-1.5 rounded ${styles.bg}`}>
                <span className="font-mono text-xs font-medium text-foreground">{unit.unit_name}</span>
                <div className="flex items-center gap-2">
                  {unit.last_par_time ? (
                    <span className={`text-[10px] font-mono flex items-center gap-1 ${styles.bar}`}>
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNowStrict(new Date(unit.last_par_time), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">No PAR yet</span>
                  )}
                  {parStatus === 'overdue' && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                  {parStatus === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}