import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle, Wind, X, Split } from 'lucide-react';

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

// Short badge label for alarm level — shown on every card that has one
const ALARM_BADGE = {
  '1st_alarm':  { label: '1A', color: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
  '2nd_alarm':  { label: '2A', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  '3rd_alarm':  { label: '3A', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  '4th_alarm':  { label: '4A', color: 'bg-red-700/20 text-red-300 border-red-700/40' },
  '5th_alarm':  { label: '5A', color: 'bg-red-900/30 text-red-200 border-red-900/50' },
  'task_force': { label: 'TF', color: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  'strike_team':{ label: 'ST', color: 'bg-purple-700/20 text-purple-300 border-purple-700/40' },
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
  const [isSplit, setIsSplit] = useState(false);
  const [teamAName, setTeamAName] = useState('Team 1');
  const [teamBName, setTeamBName] = useState('Team 2');
  const isRescue = unit.unit_type === 'rescue';

  const personnel = unit.personnel || [];

  // teamAssignments: { [personName]: 1 | 2 } — all unassigned (null) by default
  const [teamAssignments, setTeamAssignments] = useState({});

  // Re-init if personnel changes — preserve existing assignments
  useEffect(() => {
    setTeamAssignments(prev => {
      const map = {};
      personnel.forEach(p => { map[p] = prev[p] ?? null; });
      return map;
    });
  }, [unit.personnel]);

  const teamA = personnel.filter(p => teamAssignments[p] === 1);
  const teamB = personnel.filter(p => teamAssignments[p] === 2);
  const unassigned = personnel.filter(p => !teamAssignments[p]);

  const assignToTeam = (e, person, team) => {
    e.stopPropagation();
    setTeamAssignments(prev => ({ ...prev, [person]: prev[person] === team ? null : team }));
  };

  const airElapsed = useElapsed(unit.air_time);
  const entryElapsed = useElapsed(unit.on_scene_time);
  const cfg = statusConfig[unit.status] || statusConfig.dispatched;
  const isMayday = unit.status === 'mayday';

  const isWorking = unit.status === 'working' || unit.status === 'par';
  const isRehab = unit.status === 'rehab';
  const isOnScene = unit.status === 'on_scene';

  // Blink until the IC assigns this unit somewhere real
  const isStaging = unit.assignment === 'staging';
  const alarmBadge = ALARM_BADGE[unit.alarm_level] || null;

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
        hover:shadow-lg hover:shadow-black/20 group ${unit.notes ? 'min-h-[68px]' : 'h-[68px]'}
        ${cfg.bg}
        ${isMayday     ? 'animate-pulse-red border-red-500/60 ring-1 ring-red-500/60' :
          rehabWarning  ? 'animate-pulse border-violet-400/80 ring-1 ring-violet-400/50' :
          isStaging     ? 'animate-pulse border-amber-400/80 ring-2 ring-amber-400/60 shadow-amber-500/20 shadow-md' :
          isMutualAid   ? 'border-amber-500/50 ring-1 ring-amber-500/20' :
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

      <div className="pl-4 pr-7 py-2 flex flex-col justify-between gap-1">
        {/* Top row: type badge + name + alarm badge + status */}
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
            {alarmBadge && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${alarmBadge.color}`}>
                {alarmBadge.label}
              </span>
            )}
          </div>
          <span className={`text-xs font-mono font-semibold tracking-wider shrink-0 ${
            rehabWarning ? 'text-violet-300 font-bold' :
            isStaging    ? 'text-amber-300 font-bold animate-pulse' :
            cfg.text
          }`}>
            {rehabWarning ? '⚠ REHAB' : isStaging ? '⚡ STAGE' : cfg.label}
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

        {/* Notes row — only shown when notes exist */}
        {unit.notes && (
          <div className="text-[10px] font-mono text-muted-foreground truncate italic pb-1">
            {unit.notes}
          </div>
        )}

        {/* Split toggle — rescue only, sits in flow so nothing overlaps */}
        {isRescue && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsSplit(s => !s); }}
            className={`flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors mt-0.5
              ${isSplit
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30'
                : 'bg-transparent text-muted-foreground border-border/30 hover:text-foreground opacity-0 group-hover:opacity-100'
              }`}
          >
            <Split className="w-2.5 h-2.5" /> {isSplit ? 'SPLIT ▲' : 'SPLIT'}
          </button>
        )}

        {/* Split teams view — rescue units only */}
        {isRescue && isSplit && (
          <div className="mt-1 pt-1 border-t border-border/40 pb-1 space-y-1.5">
            {personnel.length === 0 ? (
              <div className="text-[10px] font-mono text-muted-foreground italic text-center py-1">
                No roster loaded — add personnel via unit edit
              </div>
            ) : (
              <>
                {/* Unassigned pool */}
                {unassigned.length > 0 && (
                  <div>
                    <div className="text-[9px] font-mono text-muted-foreground mb-0.5">Tap to assign →</div>
                    <div className="flex flex-wrap gap-1">
                      {unassigned.map((p, i) => (
                        <div key={i} className="flex gap-0.5">
                          <button onClick={e => assignToTeam(e, p, 1)}
                            className="text-[9px] font-mono px-1 py-0.5 rounded-l bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/40 transition-colors leading-3">
                            1
                          </button>
                          <span className="text-[10px] font-mono text-foreground px-1 py-0.5 bg-secondary/40 border-y border-border/40 leading-3">
                            {p.split('|')[0]}
                          </span>
                          <button onClick={e => assignToTeam(e, p, 2)}
                            className="text-[9px] font-mono px-1 py-0.5 rounded-r bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/40 transition-colors leading-3">
                            2
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team boxes */}
                <div className="flex gap-2">
                  <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded px-2 py-1 min-h-[32px]">
                    <input
                      value={teamAName}
                      onChange={e => setTeamAName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-[9px] font-mono font-bold text-blue-400 tracking-wider bg-transparent border-none outline-none w-full mb-0.5"
                      maxLength={12}
                    />
                    {teamA.map((p, i) => (
                      <button key={i} onClick={e => assignToTeam(e, p, 1)}
                        className="block w-full text-left text-[10px] font-mono text-foreground truncate hover:text-muted-foreground transition-colors leading-4">
                        {p.split('|')[0]}
                      </button>
                    ))}
                    {teamA.length === 0 && <div className="text-[10px] font-mono text-muted-foreground italic">—</div>}
                  </div>
                  <div className="flex-1 bg-orange-500/10 border border-orange-500/30 rounded px-2 py-1 min-h-[32px]">
                    <input
                      value={teamBName}
                      onChange={e => setTeamBName(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-[9px] font-mono font-bold text-orange-400 tracking-wider bg-transparent border-none outline-none w-full mb-0.5"
                      maxLength={12}
                    />
                    {teamB.map((p, i) => (
                      <button key={i} onClick={e => assignToTeam(e, p, 2)}
                        className="block w-full text-left text-[10px] font-mono text-foreground truncate hover:text-muted-foreground transition-colors leading-4">
                        {p.split('|')[0]}
                      </button>
                    ))}
                    {teamB.length === 0 && <div className="text-[10px] font-mono text-muted-foreground italic">—</div>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
