import React, { useState, useEffect } from 'react';
import { Clock, Radio, MapPin, Shield, Flame } from 'lucide-react';

const statusConfig = {
  active:        { label: 'ACTIVE',         bg: 'bg-red-600',    pulse: true },
  under_control: { label: 'UNDER CONTROL',  bg: 'bg-yellow-600', pulse: false },
  overhaul:      { label: 'OVERHAUL',       bg: 'bg-blue-600',   pulse: false },
  cleared:       { label: 'CLEARED',        bg: 'bg-emerald-700',pulse: false },
};

const alarmColors = {
  '1st_alarm':   'border-primary/40 text-primary',
  '2nd_alarm':   'border-orange-500/40 text-orange-400',
  '3rd_alarm':   'border-red-500/40 text-red-400',
  '4th_alarm':   'border-red-600/40 text-red-500',
  '5th_alarm':   'border-red-700/40 text-red-600',
  task_force:    'border-violet-500/40 text-violet-400',
  strike_team:   'border-pink-500/40 text-pink-400',
};

export default function IncidentHeader({ incident }) {
  const [elapsed, setElapsed] = useState('00:00:00');
  const cfg = statusConfig[incident?.status] || statusConfig.active;

  useEffect(() => {
    if (!incident?.started_at) return;
    const tick = () => {
      const diff = Date.now() - new Date(incident.started_at).getTime();
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [incident?.started_at]);

  if (!incident) return null;

  const alarmClass = alarmColors[incident.alarm_level] || 'border-border text-muted-foreground';

  return (
    <div className="flex items-center gap-4 flex-wrap min-w-0">
      {/* Command name + status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary shrink-0" />
          <span className="text-base font-mono font-bold tracking-wide text-foreground uppercase truncate max-w-[200px]">
            {incident.command_name || 'COMMAND'}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${cfg.bg}`}>
          {cfg.pulse && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping shrink-0" />}
          <span className="text-[11px] font-mono font-bold tracking-wider text-white">{cfg.label}</span>
        </div>
        <div className={`border rounded-md px-2 py-1 text-[10px] font-mono font-bold tracking-widest ${alarmClass}`}>
          {incident.alarm_level?.replace('_', ' ').toUpperCase() || '1ST ALARM'}
        </div>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
        <MapPin className="w-3.5 h-3.5 shrink-0" />
        <span className="text-sm font-mono truncate">{incident.address}</span>
      </div>

      {/* IC */}
      {incident.ic_name && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs font-mono">IC: <span className="text-foreground font-semibold">{incident.ic_name}</span></span>
        </div>
      )}

      {/* Elapsed timer */}
      <div className="flex items-center gap-2 bg-secondary/80 border border-border/60 rounded-lg px-3 py-1.5 ml-auto">
        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="font-mono text-base font-bold text-amber-400 tracking-widest tabular-nums">{elapsed}</span>
      </div>
    </div>
  );
}