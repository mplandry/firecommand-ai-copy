import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Users, Wind, AlertTriangle, ShieldCheck, Layers, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict } from 'date-fns';

const STATUS_META = {
  working:       { label: 'Working',       color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  on_scene:      { label: 'On Scene',      color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/30' },
  par:           { label: 'PAR',           color: 'text-green-300',   bg: 'bg-green-400/10 border-green-400/30' },
  rehab:         { label: 'Rehab',         color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/30' },
  mayday:        { label: 'MAYDAY',        color: 'text-red-400',     bg: 'bg-red-600/20 border-red-500/50' },
  staging:       { label: 'Staging',       color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30' },
  responding:    { label: 'Responding',    color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/30' },
  dispatched:    { label: 'Dispatched',    color: 'text-sky-400',     bg: 'bg-sky-500/10 border-sky-500/30' },
  available:     { label: 'Available',     color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/30' },
  out_of_service:{ label: 'OOS',           color: 'text-slate-500',   bg: 'bg-slate-600/10 border-slate-600/30' },
};

const UNIT_ICONS = {
  engine:'🚒', truck:'🪜', rescue:'🚑', squad:'🔧',
  deputy:'⭐', medic:'🏥', tanker:'💧', brush:'🌿', hazmat:'☣️', other:'🚐',
};

const FLOOR_ORDER = ['Roof', '8th Floor','7th Floor','6th Floor','5th Floor',
                     '4th Floor','3rd Floor','2nd Floor','1st Floor','Lobby','Basement'];

function getPersonnel(unit) {
  const fromList  = unit.personnel?.length || 0;
  const fromCount = unit.personnel_count   || 0;
  return fromList > 0 ? fromList : fromCount;
}

export default function AccountabilityDashboard() {
  const { incidentId } = useParams();

  const { data: incident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: d => d?.[0] || null,
    enabled: !!incidentId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', incidentId],
    queryFn: () => base44.entities.Unit.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
    refetchInterval: 15000,
  });

  // ── Derived data ────────────────────────────────────────────────────────────
  const totalPersonnel   = useMemo(() => units.reduce((s, u) => s + getPersonnel(u), 0), [units]);
  const activePersonnel  = useMemo(() => units.filter(u => ['on_scene','working','par','rehab'].includes(u.status)).reduce((s, u) => s + getPersonnel(u), 0), [units]);
  const onAirCount       = useMemo(() => units.filter(u => u.air_time).length, [units]);
  const maydayUnits      = useMemo(() => units.filter(u => u.status === 'mayday'), [units]);

  const statusGroups = useMemo(() => {
    const g = {};
    units.forEach(u => {
      if (!u.status) return;
      if (!g[u.status]) g[u.status] = [];
      g[u.status].push(u);
    });
    return g;
  }, [units]);

  const floorGroups = useMemo(() => {
    const g = {};
    units.forEach(u => {
      const f = u.floor?.trim();
      if (!f) return;
      if (!g[f]) g[f] = [];
      g[f].push(u);
    });
    return g;
  }, [units]);

  const sortedFloors = useMemo(() =>
    Object.keys(floorGroups).sort((a, b) => {
      const ai = FLOOR_ORDER.indexOf(a), bi = FLOOR_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    })
  , [floorGroups]);

  const unassignedFloor = useMemo(() => units.filter(u => !u.floor?.trim()), [units]);

  const orderedStatuses = ['mayday','working','on_scene','par','rehab','staging','responding','dispatched','available','out_of_service'];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 py-2.5 flex items-center gap-3">
        <Link to={`/incident/${incidentId}`}>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Command Board
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold font-mono tracking-wider text-foreground uppercase">
              Accountability Dashboard
            </span>
            {incident && (
              <span className="text-xs text-muted-foreground font-mono">— {incident.address}</span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          Auto-refreshes every 15s
        </span>
      </div>

      {/* MAYDAY banner */}
      {maydayUnits.length > 0 && (
        <div className="bg-red-600/25 border-b border-red-500/50 px-4 py-2 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <span className="text-sm font-mono font-bold text-red-300 tracking-wide">
            ⚠ MAYDAY — {maydayUnits.map(u => u.unit_name).join(', ')}
          </span>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-b border-border">
        <KPI label="Total Personnel" value={totalPersonnel} icon={<Users className="w-4 h-4" />} color="text-foreground" />
        <KPI label="Active on Scene" value={activePersonnel} icon={<Activity className="w-4 h-4" />} color="text-green-400" />
        <KPI label="Units on Air" value={onAirCount} icon={<Wind className="w-4 h-4" />} color="text-accent" />
        <KPI label="Total Units" value={units.length} icon={<ShieldCheck className="w-4 h-4" />} color="text-primary" />
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x divide-border overflow-auto">

        {/* ── Panel 1: Unit Status ─────────────────────────────────────────── */}
        <section className="flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-secondary/40 border-b border-border flex items-center gap-2 shrink-0">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold font-mono tracking-widest text-foreground uppercase">Unit Status</h2>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{units.length} units</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {orderedStatuses.map(status => {
              const group = statusGroups[status];
              if (!group) return null;
              const meta = STATUS_META[status] || { label: status, color: 'text-foreground', bg: 'bg-secondary/20 border-border' };
              const groupPersonnel = group.reduce((s, u) => s + getPersonnel(u), 0);
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground">({group.length} unit{group.length !== 1 ? 's' : ''}
                    {groupPersonnel > 0 ? `, ${groupPersonnel} FF` : ''})</span>
                  </div>
                  <div className="space-y-1">
                    {group.map(unit => (
                      <UnitRow key={unit.id} unit={unit} meta={meta} />
                    ))}
                  </div>
                </div>
              );
            })}
            {units.length === 0 && (
              <EmptyState text="No units on scene" />
            )}
          </div>
        </section>

        {/* ── Panel 2: Floor Accountability ───────────────────────────────── */}
        <section className="flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-secondary/40 border-b border-border flex items-center gap-2 shrink-0">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold font-mono tracking-widest text-foreground uppercase">Floor Assignments</h2>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{units.filter(u => u.floor).length} tracked</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sortedFloors.map(floor => {
              const floorUnits = floorGroups[floor];
              const floorPersonnel = floorUnits.reduce((s, u) => s + getPersonnel(u), 0);
              const hasMayday = floorUnits.some(u => u.status === 'mayday');
              const isSpecial = floor === 'Roof' || floor === 'Basement';
              return (
                <div key={floor} className={`rounded-lg border overflow-hidden ${hasMayday ? 'border-red-500/40' : 'border-border'}`}>
                  <div className={`px-3 py-2 flex items-center justify-between ${hasMayday ? 'bg-red-600/15' : isSpecial ? 'bg-amber-500/8' : 'bg-secondary/40'}`}>
                    <div className="flex items-center gap-2">
                      {hasMayday && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      <span className={`text-xs font-mono font-bold ${hasMayday ? 'text-red-300' : isSpecial ? 'text-amber-400' : 'text-cyan-400'}`}>
                        ▲ {floor}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-mono">
                      <span className="text-muted-foreground">{floorUnits.length} unit{floorUnits.length !== 1 ? 's' : ''}</span>
                      {floorPersonnel > 0 && <span className="text-green-400 font-bold">{floorPersonnel} FF</span>}
                    </div>
                  </div>
                  <div className="px-3 py-2 flex flex-wrap gap-1.5">
                    {floorUnits.map(unit => (
                      <FloorUnitChip key={unit.id} unit={unit} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Unassigned */}
            {unassignedFloor.length > 0 && (
              <div className="rounded-lg border border-dashed border-border overflow-hidden opacity-60">
                <div className="px-3 py-2 bg-secondary/20 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">No Floor Assigned</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{unassignedFloor.length} unit{unassignedFloor.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="px-3 py-2 flex flex-wrap gap-1.5">
                  {unassignedFloor.map(unit => (
                    <FloorUnitChip key={unit.id} unit={unit} />
                  ))}
                </div>
              </div>
            )}

            {sortedFloors.length === 0 && unassignedFloor.length === units.length && (
              <EmptyState text="No floor assignments yet" />
            )}
          </div>
        </section>

        {/* ── Panel 3: Personnel Summary ──────────────────────────────────── */}
        <section className="flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-secondary/40 border-b border-border flex items-center gap-2 shrink-0">
            <Users className="w-4 h-4 text-green-400" />
            <h2 className="text-xs font-bold font-mono tracking-widest text-foreground uppercase">Personnel Detail</h2>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">{totalPersonnel} total FF</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {units.filter(u => getPersonnel(u) > 0 || u.officer || (u.personnel?.length > 0)).map(unit => (
              <PersonnelCard key={unit.id} unit={unit} />
            ))}
            {units.length === 0 && <EmptyState text="No units on scene" />}
            {units.length > 0 && units.every(u => !getPersonnel(u) && !u.officer && !u.personnel?.length) && (
              <EmptyState text="No personnel data entered yet" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KPI({ label, value, icon, color }) {
  return (
    <div className="bg-card px-4 py-4 flex flex-col items-center justify-center gap-1">
      <div className={`text-3xl font-bold font-mono tabular-nums ${color}`}>{value}</div>
      <div className={`flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground`}>
        {icon} {label}
      </div>
    </div>
  );
}

function UnitRow({ unit, meta }) {
  const personnel = getPersonnel(unit);
  const isOnAir = !!unit.air_time;
  return (
    <div className={`flex items-center gap-2 px-2.5 py-2 rounded border text-xs ${meta.bg}`}>
      <span className="text-base leading-none">{UNIT_ICONS[unit.unit_type] || '🚐'}</span>
      <span className={`font-mono font-semibold ${unit.status === 'mayday' ? 'text-red-300' : 'text-foreground'}`}>
        {unit.unit_name}
      </span>
      {unit.officer && (
        <span className="text-muted-foreground text-[10px] truncate flex-1">{unit.officer}</span>
      )}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {unit.floor && (
          <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded px-1 py-0.5">
            {unit.floor}
          </span>
        )}
        {isOnAir && (
          <span className="text-[9px] font-mono bg-accent/15 text-accent border border-accent/30 rounded px-1 py-0.5 flex items-center gap-0.5">
            <Wind className="w-2.5 h-2.5" /> AIR
          </span>
        )}
        {personnel > 0 && (
          <span className="text-[10px] font-mono text-green-400 font-bold">{personnel}FF</span>
        )}
      </div>
    </div>
  );
}

function FloorUnitChip({ unit }) {
  const meta = STATUS_META[unit.status] || { color: 'text-foreground', bg: 'bg-secondary/20 border-border' };
  return (
    <div className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[10px] font-mono font-semibold ${meta.bg} ${meta.color}`}>
      <span className="text-sm leading-none">{UNIT_ICONS[unit.unit_type] || '🚐'}</span>
      <span>{unit.unit_name}</span>
      {unit.personnel_count > 0 && <span className="opacity-70">·{unit.personnel_count}</span>}
    </div>
  );
}

function PersonnelCard({ unit }) {
  const personnel = getPersonnel(unit);
  const meta = STATUS_META[unit.status] || { label: unit.status, color: 'text-muted-foreground', bg: 'bg-secondary/20 border-border' };
  return (
    <div className="rounded-lg border border-border bg-secondary/20 overflow-hidden">
      <div className="px-3 py-2 bg-secondary/40 flex items-center gap-2">
        <span className="text-base leading-none">{UNIT_ICONS[unit.unit_type] || '🚐'}</span>
        <span className="text-xs font-mono font-bold text-foreground">{unit.unit_name}</span>
        {unit.officer && (
          <span className="text-[10px] text-muted-foreground truncate">· {unit.officer}</span>
        )}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <span className={`text-[9px] font-mono font-bold ${meta.color}`}>{meta.label}</span>
          {personnel > 0 && (
            <span className="text-[10px] font-mono font-bold text-green-400">{personnel} FF</span>
          )}
        </div>
      </div>
      {unit.personnel?.length > 0 && (
        <div className="px-3 py-2 flex flex-wrap gap-1.5">
          {unit.personnel.map((name, i) => (
            <span key={i} className="text-[10px] font-mono bg-secondary/60 text-foreground rounded px-1.5 py-0.5 border border-border">
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="px-3 py-1.5 flex items-center gap-3 text-[9px] font-mono text-muted-foreground border-t border-border/50">
        {unit.floor && <span>📍 {unit.floor}</span>}
        {unit.air_time && (
          <span className="text-accent">
            💨 On air {formatDistanceToNowStrict(new Date(unit.air_time), { addSuffix: true })}
          </span>
        )}
        {unit.on_scene_time && (
          <span>⏱ On scene {formatDistanceToNowStrict(new Date(unit.on_scene_time), { addSuffix: true })}</span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-8 text-xs text-muted-foreground/40 font-mono">{text}</div>
  );
}