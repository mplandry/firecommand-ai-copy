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

function useElapsed(timestamp) {
  const [elapsed, setElapsed] = useState(null);
  useEffect(() => {
    if (!timestamp) return;
    const tick = () => {
      const diff = Date.now() - new Date(timestamp).getTime();
      const m = Math.floor(diff / 60000);
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timestamp]);
  return elapsed;
}

export default function UnitCard({ unit, onEdit }) {
  const airElapsed = useElapsed(unit.air_time);
  const entryElapsed = useElapsed(unit.on_scene_time);
  const cfg = statusConfig[unit.status] || statusConfig.dispatched;
  const isMayday = unit.status === 'mayday';
  const isDeployed = ['on_scene', 'working', 'par'].includes(unit.status) && unit.on_scene_time;

  // Warn if on scene > 20 min
  const entryMinutes = unit.on_scene_time ? (Date.now() - new Date(unit.on_scene_time).getTime()) / 60000 : 0;
  const entryWarning = isDeployed && entryMinutes >= 20;

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

      <div className="pl-3 pr-3 py-3">
        {/* Top row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[9px] font-mono font-bold tracking-widest px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} border border-current/20 shrink-0`}>
              {unitTypeLabel[unit.unit_type] || 'OTH'}
            </span>
            <span className="font-mono font-bold text-base text-foreground truncate">
              {unit.unit_name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-mono font-semibold tracking-wider ${cfg.text}`}>
              {cfg.label}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
        </div>

        {/* Mutual aid town badge — derive from notes or from known prefixes in unit name */}
        {(() => {
          const townMap = { CAM: 'Cambridge', BEL: 'Belmont', LEX: 'Lexington', ARL: 'Arlington' };
          const mutualAidLabel = unit.notes?.startsWith('Mutual Aid')
            ? unit.notes
            : (() => {
                const prefix = unit.unit_name?.split(' ')[0]?.toUpperCase();
                return townMap[prefix] ? `Mutual Aid — ${townMap[prefix]}` : null;
              })();
          return mutualAidLabel ? (
            <div className="mt-1.5 text-[10px] font-mono font-bold tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded px-2 py-0.5 inline-block">
              {mutualAidLabel}
            </div>
          ) : null;
        })()}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {unit.officer && (
            <span className="text-xs text-muted-foreground font-mono truncate">{unit.officer}</span>
          )}
          {unit.personnel_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <Users className="w-3.5 h-3.5" />{unit.personnel_count}
            </span>
          )}
          {unit.floor && (
            <span className="flex items-center gap-1 text-xs text-cyan-400 font-mono font-semibold">
              ▲ {unit.floor}
            </span>
          )}
          {unit.air_time && airElapsed && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
              <Wind className="w-3.5 h-3.5" />{airElapsed}
            </span>
          )}
        </div>

        {/* Entry timer — shown when unit is deployed on scene */}
        {isDeployed && entryElapsed && (
          <div className={`mt-2 flex items-center gap-1.5 rounded px-2 py-1.5 border ${
            entryWarning
              ? 'bg-orange-500/15 border-orange-500/40'
              : 'bg-secondary/60 border-border/40'
          }`}>
            <Clock className={`w-3.5 h-3.5 shrink-0 ${entryWarning ? 'text-orange-400' : 'text-muted-foreground'}`} />
            <span className={`text-xs font-mono font-bold tracking-wider ${entryWarning ? 'text-orange-300' : 'text-muted-foreground'}`}>
              ON SCENE
            </span>
            <span className={`text-xs font-mono font-bold ml-auto ${entryWarning ? 'text-orange-300' : 'text-foreground'}`}>
              {entryElapsed}
            </span>
          </div>
        )}

        {/* Personnel list */}
        {unit.personnel?.length > 0 && (
          <div className="mt-1.5 text-[11px] font-mono text-muted-foreground/60 truncate">
            {unit.personnel.join(' · ')}
          </div>
        )}

        {/* MAYDAY alert */}
        {isMayday && (
          <div className="mt-2 flex items-center gap-1.5 bg-red-600/20 border border-red-500/40 rounded px-2 py-1.5">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-300 text-xs font-bold tracking-wider">MAYDAY — MAYDAY — MAYDAY</span>
          </div>
        )}
      </div>
    </div>
  );
}