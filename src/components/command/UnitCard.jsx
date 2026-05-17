import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle, Wind, ChevronRight } from 'lucide-react';

const statusConfig = {
  dispatched:    { bar: 'bg-yellow-500',  bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  label: 'DISPATCHED' },
  responding:    { bar: 'bg-yellow-400',  bg: 'bg-yellow-400/10',  text: 'text-yellow-300',  label: 'RESPONDING' },
  on_scene:      { bar: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'ON SCENE' },
  working:       { bar: 'bg-blue-500',    bg: 'bg-blue-500/10',    text: 'text-blue-400',    label: 'WORKING' },
  par:           { bar: 'bg-emerald-400', bg: 'bg-emerald-400/10', text: 'text-emerald-300', label: 'PAR' },
  mayday:        { bar: 'bg-red-600',     bg: 'bg-red-600/15',     text: 'text-red-400',     label: 'MAYDAY' },
  available:     { bar: 'bg-slate-500',   bg: 'bg-slate-500/10',   text: 'text-slate-400',   label: 'AVAILABLE' },
  rehab:         { bar: 'bg-violet-500',  bg: 'bg-violet-500/10',  text: 'text-violet-400',  label: 'REHAB' },
  out_of_service:{ bar: 'bg-slate-700',   bg: 'bg-slate-700/10',   text: 'text-slate-500',   label: 'OOS' },
};

const unitTypeLabel = {
  engine: 'ENG', truck: 'TRK', rescue: 'RSC', squad: 'SQD',
  deputy: 'DEP', medic: 'MED', tanker: 'TNK', brush: 'BRS',
  hazmat: 'HZM', other: 'OTH',
};

export default function UnitCard({ unit, onEdit }) {
  const [airElapsed, setAirElapsed] = useState(null);
  const cfg = statusConfig[unit.status] || statusConfig.dispatched;
  const isMayday = unit.status === 'mayday';

  useEffect(() => {
    if (!unit.air_time) return;
    const tick = () => {
      const diff = Date.now() - new Date(unit.air_time).getTime();
      const m = Math.floor(diff / 60000);
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setAirElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unit.air_time]);

  return (
    <div
      onClick={() => onEdit?.(unit)}
      className={`
        relative rounded-lg cursor-pointer select-none overflow-hidden
        border border-border/60 hover:border-border transition-all duration-150
        hover:shadow-lg hover:shadow-black/20 group
        ${cfg.bg}
        ${isMayday ? 'animate-pulse-red ring-1 ring-red-500/60' : ''}
      `}
    >
      {/* Status bar accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.bar} rounded-l-lg`} />

      <div className="pl-3 pr-3 py-2.5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} border border-current/20 shrink-0`}>
              {unitTypeLabel[unit.unit_type] || 'OTH'}
            </span>
            <span className="font-mono font-bold text-sm text-foreground truncate">
              {unit.unit_name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-mono font-semibold tracking-wider ${cfg.text}`}>
              {cfg.label}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {unit.officer && (
            <span className="text-[11px] text-muted-foreground font-mono truncate">{unit.officer}</span>
          )}
          {unit.personnel_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
              <Users className="w-3 h-3" />{unit.personnel_count}
            </span>
          )}
          {unit.floor && (
            <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-mono font-semibold">
              ▲ {unit.floor}
            </span>
          )}
          {unit.air_time && airElapsed && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
              <Wind className="w-3 h-3" />{airElapsed}
            </span>
          )}
        </div>

        {/* Personnel list */}
        {unit.personnel?.length > 0 && (
          <div className="mt-1.5 text-[10px] font-mono text-muted-foreground/60 truncate">
            {unit.personnel.join(' · ')}
          </div>
        )}

        {/* MAYDAY alert */}
        {isMayday && (
          <div className="mt-2 flex items-center gap-1.5 bg-red-600/20 border border-red-500/40 rounded px-2 py-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-300 text-[11px] font-bold tracking-wider">MAYDAY — MAYDAY — MAYDAY</span>
          </div>
        )}
      </div>
    </div>
  );
}