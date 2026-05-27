import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle, Wind, X } from 'lucide-react';

const statusConfig = {
  dispatched:    { bar: 'bg-yellow-500',  bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  label: 'DISPATCHED' },
  responding:    { bar: 'bg-yellow-400',  bg: 'bg-yellow-400/10',  text: 'text-yellow-300',  label: 'RESPONDING' },
  staging:       { bar: 'bg-amber-500',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   label: 'STAGING' },
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
      const diff = Math.max(0, Date.now() - new Date(timestamp).getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timestamp]);
  return elapsed;
}

export default function UnitCard({ unit, onEdit, onClearAssignment, deptPrefix = 'WAL' }) {
  const airElapsed = useElapsed(unit.air_time);
  const entryElapsed = useElapsed(unit.on_scene_time);
  const cfg = statusConfig[unit.status] || statusConfig.dispatched;
  const isMayday = unit.status === 'mayday';

  const isWorking = unit.status === 'working' || unit.status === 'par';
  const isRehab = unit.status === 'rehab';
  const isOnScene = unit.status === 'on_scene';

  // Mutual aid: explicit flag, OR short prefix (ARL, NEW…), OR full town name at start
  const MA_TOWNS = /^(arlington|belmont|boston|cambridge|chelsea|concord|dedham|everett|framingham|lexington|lincoln|malden|medford|millis|natick|needham|newton|norwood|quincy|reading|somerville|stoneham|sudbury|watertown|wellesley|weston|woburn|worcester|arl|bel|cam|con|ded|eve|fra|lex|lin|mal|med|nat|ned|new|nor|qui|rea|som|sto|sud|wat|wel|wes|wob|wor)\s/i;
  const prefixMatch = unit.unit_name?.match(/^([A-Z]{2,5})\s/);
  const isMutualAid = unit.is_mutual_aid
    || MA_TOWNS.test(unit.unit_name || '')
    || (prefixMatch && prefixMatch[1].toUpperCase() !== deptPrefix.toUpperCase());

  // Use rehab_time for rehab timer, on_scene_time (or updated_date) for working/on_scene/mayday
  const workingAnchor = unit.on_scene_time || unit.updated_date;
  const rehabAnchor = unit.rehab_time || unit.updated_date;
  const timerAnchor = isRehab ? rehabAnchor : workingAnchor;

  const activeElapsed = useElapsed(
    (isWorking || isRehab || isOnScene || isMayday) ? timerAnchor : null
  );

  const activeMinutes = timerAnchor ? Math.max(0, (Date.now() - new Date(timerAnchor).getTime()) / 60000) : 0;
  const entryWarning = isWorking && activeMinutes >= 20;
  const rehabWarning = isRehab && activeMinutes >= 20;

  return (
    <div
      onClick={() => onEdit?.(unit)}
      className={`
        relative rounded-lg cursor-grab active:cursor-grabbing select-none overflow-hidden
        border transition-all duration-150
        hover:shadow-lg hover:shadow-black/20 group h-[68px]
        ${cfg.bg}
        ${isMayday    ? 'animate-pulse-red border-red-500/60 ring-1 ring-red-500/60' :
          rehabWarning ? 'animate-pulse border-violet-400/80 ring-1 ring-violet-400/50' :
          isMutualAid  ? 'border-amber-500/50 ring-1 ring-amber-500/20' :
                         'border-border/60 hover:border-border'}
      `}
    >
      {/* Status bar accent — amber for mutual aid */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isMutualAid ? 'bg-amber-500' : cfg.bar} rounded-l-lg`} />

      {/* Quick-clear assignment button — visible on hover */}
      {onClearAssignment && (
        <button
          onClick={(e) => { e.stopPropagation(); onClearAssignment(unit); }}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded flex items-center justify-center bg-secondary/80 hover:bg-destructive/80 text-muted-foreground hover:text-white"
          title="Clear assignment"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      <div className="pl-4 pr-7 py-2 h-full flex flex-col justify-between">
        {/* Top row: type badge + name + status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-xs font-mono font-bold tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} border border-current/20 shrink-0`}>
              {unitTypeLabel[unit.unit_type] || 'OTH'}
            </span>
            <span className="font-mono font-bold text-sm text-foreground truncate">
              {unit.unit_name}
            </span>
            {isMutualAid && (
              <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">MA</span>
            )}
          </div>
          <span className={`text-xs font-mono font-semibold tracking-wider shrink-0 ${
            rehabWarning ? 'text-violet-300 font-bold' : cfg.text
          }`}>
            {rehabWarning ? '⚠ REHAB' : cfg.label}
          </span>
        </div>

        {/* Bottom row: personnel + floor + officer + timer */}
        <div className="flex items-center gap-3">
          {unit.personnel_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <Users className="w-3.5 h-3.5" />{unit.personnel_count}
            </span>
          )}
          {unit.floor && (
            <span className="text-xs text-cyan-400 font-mono font-semibold">▲ {unit.floor}</span>
          )}
          {unit.officer && (
            <span className="text-xs text-muted-foreground font-mono truncate">{unit.officer}</span>
          )}
          {unit.air_time && airElapsed && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-mono">
              <Wind className="w-3.5 h-3.5" />{airElapsed}
            </span>
          )}
          {(isWorking || isRehab || isOnScene || isMayday) && activeElapsed && (
            <span className={`flex items-center gap-1 text-xs font-mono font-bold ml-auto ${
              isMayday     ? 'text-red-400' :
              rehabWarning ? 'text-violet-200 drop-shadow-[0_0_4px_rgba(167,139,250,0.8)]' :
              entryWarning ? 'text-orange-400' :
              isRehab      ? 'text-violet-400' :
              'text-muted-foreground'
            }`}>
              <Clock className="w-3.5 h-3.5" />{activeElapsed}
            </span>
          )}
          {isMayday && (
            <span className="text-xs text-red-300 font-bold tracking-wider animate-pulse">MAYDAY</span>
          )}
        </div>
      </div>
    </div>
  );
}
