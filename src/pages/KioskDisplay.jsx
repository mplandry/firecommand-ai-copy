import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNowStrict } from 'date-fns';

// Detect current shift based on time (day = 06:00–18:00, night otherwise)
function getCurrentShift() {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'day' : 'night';
}
import { Flame, Clock, ChevronLeft, ChevronRight, Pause, Play, X, AlertTriangle, Wind, Users, Layers } from 'lucide-react';

// ── constants ────────────────────────────────────────────────────────────────
const SLIDE_DURATION = 12000; // ms per slide

const ASSIGNMENT_LABELS = {
  division_a: 'DIV A', division_b: 'DIV B', division_c: 'DIV C', division_d: 'DIV D',
  roof: 'ROOF', interior: 'INTERIOR', rit: 'RIT', rehab: 'REHAB',
  water_supply: 'WATER', ventilation: 'VENT', search: 'SEARCH', medical: 'MEDICAL',
  exposure: 'EXPOSURE', staging: 'STAGING', unassigned: 'UNASSIGNED',
};

const STATUS_COLORS = {
  dispatched:    { text: 'text-gray-400',    bg: 'bg-gray-800/60',    border: 'border-gray-600' },
  responding:    { text: 'text-yellow-300',  bg: 'bg-yellow-900/40',  border: 'border-yellow-600' },
  on_scene:      { text: 'text-blue-300',    bg: 'bg-blue-900/40',    border: 'border-blue-500' },
  working:       { text: 'text-red-300',     bg: 'bg-red-900/40',     border: 'border-red-500' },
  par:           { text: 'text-green-300',   bg: 'bg-green-900/40',   border: 'border-green-500' },
  mayday:        { text: 'text-red-200',     bg: 'bg-red-700/60',     border: 'border-red-400' },
  available:     { text: 'text-green-400',   bg: 'bg-green-900/30',   border: 'border-green-600' },
  rehab:         { text: 'text-purple-300',  bg: 'bg-purple-900/40',  border: 'border-purple-500' },
  out_of_service:{ text: 'text-gray-500',    bg: 'bg-gray-900/60',    border: 'border-gray-700' },
};

const DIV_COLORS = {
  division_a: 'border-l-red-500',
  division_b: 'border-l-blue-500',
  division_c: 'border-l-green-500',
  division_d: 'border-l-yellow-500',
};

const UNIT_ICONS = {
  engine:'🚒', truck:'🪜', rescue:'🚑', squad:'🔧',
  battalion:'⭐', medic:'🏥', tanker:'💧', brush:'🌿', hazmat:'☣️', other:'🚐',
};

// ── helpers ───────────────────────────────────────────────────────────────────
function Clock24() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span>{format(time, 'HH:mm:ss')}</span>;
}

function ParBadge({ unit }) {
  if (!unit.last_par_time) return <span className="text-[11px] text-gray-500 italic">No PAR</span>;
  const diff = Date.now() - new Date(unit.last_par_time).getTime();
  const color = diff < 10*60*1000 ? 'text-green-400' : diff < 20*60*1000 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={`text-[11px] font-mono ${color}`}>
      {formatDistanceToNowStrict(new Date(unit.last_par_time), { addSuffix: true })}
    </span>
  );
}

// ── slides ────────────────────────────────────────────────────────────────────

// Slide 1: Tactical Board — all units grouped by assignment
function TacticalSlide({ units, incident }) {
  const [expandedUnit, setExpandedUnit] = useState(null);
  const grouped = {};
  units.forEach(u => {
    const key = u.assignment || 'unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(u);
  });
  const filledGroups = Object.entries(grouped).filter(([, us]) => us.length > 0);

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <SlideHeader label="TACTICAL BOARD" icon={<Flame className="w-7 h-7 text-red-400" />} incident={incident} units={units} />
      <div className="flex-1 grid grid-cols-4 gap-4 overflow-hidden">
        {filledGroups.map(([assignment, us]) => {
          const divColor = DIV_COLORS[assignment] || 'border-l-gray-600';
          return (
            <div key={assignment} className={`bg-card border border-border border-l-4 ${divColor} rounded-xl p-4 flex flex-col gap-2 overflow-hidden`}>
              <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">
                {ASSIGNMENT_LABELS[assignment] || assignment}
              </p>
              <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                {us.map(unit => {
                  const sc = STATUS_COLORS[unit.status] || STATUS_COLORS.dispatched;
                  const isExpanded = expandedUnit === unit.id;
                  const crew = unit.personnel || [];
                  return (
                    <div
                      key={unit.id}
                      className={`rounded-lg border px-3 py-2 cursor-pointer transition-all ${sc.bg} ${sc.border} ${isExpanded ? 'ring-1 ring-white/20' : ''}`}
                      onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{UNIT_ICONS[unit.unit_type] || '🚐'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-bold text-white text-base leading-tight truncate">{unit.unit_name}</p>
                          {unit.officer && <p className="text-[11px] text-gray-400 truncate">{unit.officer_rank ? `${unit.officer_rank} ` : ''}{unit.officer.split('|')[0]}</p>}
                        </div>
                        <span className={`text-[10px] font-mono font-bold uppercase ${sc.text}`}>
                          {unit.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {isExpanded && crew.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-0.5">
                          {crew.map((name, i) => (
                            <p key={i} className="text-[11px] font-mono text-gray-300 truncate">• {name.split('|')[0]}</p>
                          ))}
                        </div>
                      )}
                      {isExpanded && crew.length === 0 && !unit.officer && (
                        <p className="mt-2 pt-2 border-t border-white/10 text-[11px] font-mono text-gray-500 italic">No personnel listed</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filledGroups.length === 0 && (
          <div className="col-span-4 flex items-center justify-center text-muted-foreground font-mono text-xl">
            No units assigned
          </div>
        )}
      </div>
    </div>
  );
}

// Slide 2: PAR Status
function PARSlide({ units, incident }) {
  const [expandedUnit, setExpandedUnit] = useState(null);
  const accountable = units.filter(u => ['on_scene', 'working', 'par'].includes(u.status));
  const mayday = units.filter(u => u.status === 'mayday');

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <SlideHeader label="PAR ACCOUNTABILITY" icon={<Users className="w-7 h-7 text-green-400" />} incident={incident} units={units} />

      {mayday.length > 0 && (
        <div className="bg-red-700/30 border-2 border-red-500 rounded-xl px-6 py-4 flex items-center gap-4 animate-pulse">
          <AlertTriangle className="w-10 h-10 text-red-400 shrink-0" />
          <div>
            <p className="text-2xl font-bold font-mono text-red-300 tracking-widest">MAYDAY — MAYDAY — MAYDAY</p>
            <p className="text-lg text-red-400 font-mono">{mayday.map(u => u.unit_name).join(' · ')}</p>
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {accountable.map(unit => {
          const sc = STATUS_COLORS[unit.status] || STATUS_COLORS.dispatched;
          const crew = unit.personnel || [];
          const personnel = crew.length || unit.personnel_count || 0;
          const isExpanded = expandedUnit === unit.id;
          return (
            <div
              key={unit.id}
              className={`flex flex-col gap-2 rounded-xl border-2 p-5 cursor-pointer transition-all ${sc.bg} ${sc.border} ${isExpanded ? 'ring-1 ring-white/20' : ''}`}
              onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{UNIT_ICONS[unit.unit_type] || '🚐'}</span>
                <div>
                  <p className="font-mono font-black text-white text-2xl">{unit.unit_name}</p>
                  <p className={`text-sm font-mono font-bold uppercase ${sc.text}`}>
                    {unit.status?.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 border-t border-white/10 pt-2">
                <span className="text-sm text-gray-400 font-mono">Last PAR</span>
                <ParBadge unit={unit} />
              </div>
              {personnel > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 font-mono">Personnel</span>
                  <span className="text-sm font-mono text-white font-bold">{personnel} FF</span>
                </div>
              )}
              {unit.floor && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 font-mono">Floor</span>
                  <span className="text-sm font-mono text-cyan-300 font-bold">{unit.floor}</span>
                </div>
              )}
              {isExpanded && (
                <div className="border-t border-white/10 pt-2 mt-1 flex flex-col gap-0.5">
                  {unit.officer && (
                    <p className="text-[12px] font-mono text-orange-300 truncate">
                      ★ {unit.officer_rank ? `${unit.officer_rank} ` : ''}{unit.officer.split('|')[0]}
                    </p>
                  )}
                  {crew.map((name, i) => (
                    <p key={i} className="text-[12px] font-mono text-gray-300 truncate">• {name.split('|')[0]}</p>
                  ))}
                  {!unit.officer && crew.length === 0 && (
                    <p className="text-[11px] font-mono text-gray-500 italic">No personnel listed</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {accountable.length === 0 && (
          <div className="col-span-3 flex items-center justify-center text-muted-foreground font-mono text-xl">
            No units on scene
          </div>
        )}
      </div>
    </div>
  );
}

// Slide 3: Unit Assignments summary
function AssignmentsSlide({ units, incident }) {
  const statusTally = {};
  units.forEach(u => { statusTally[u.status] = (statusTally[u.status] || 0) + 1; });

  const onAir = units.filter(u => u.air_time);
  const totalPersonnel = units.reduce((s, u) => s + (u.personnel?.length || u.personnel_count || 0), 0);
  const activePersonnel = units.filter(u => ['on_scene','working','par'].includes(u.status))
    .reduce((s, u) => s + (u.personnel?.length || u.personnel_count || 0), 0);

  // Group by floor
  const byFloor = {};
  units.forEach(u => { if (u.floor) { if (!byFloor[u.floor]) byFloor[u.floor] = []; byFloor[u.floor].push(u); } });
  const floorOrder = ['Roof','8th Floor','7th Floor','6th Floor','5th Floor','4th Floor','3rd Floor','2nd Floor','1st Floor','Basement'];
  const sortedFloors = Object.keys(byFloor).sort((a,b) => {
    const ai = floorOrder.indexOf(a), bi = floorOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <SlideHeader label="UNIT ASSIGNMENTS" icon={<Layers className="w-7 h-7 text-blue-400" />} incident={incident} units={units} />

      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Stats column */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-5xl font-black font-mono text-white">{units.length}</p>
            <p className="text-sm font-mono text-muted-foreground mt-1 uppercase tracking-wider">Total Units</p>
          </div>
          <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-5 text-center">
            <p className="text-5xl font-black font-mono text-green-300">{activePersonnel}</p>
            <p className="text-sm font-mono text-green-600 mt-1 uppercase tracking-wider">Active FF</p>
          </div>
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-5 text-center">
            <p className="text-5xl font-black font-mono text-accent">{totalPersonnel}</p>
            <p className="text-sm font-mono text-accent/70 mt-1 uppercase tracking-wider">Total Personnel</p>
          </div>
          {onAir.length > 0 && (
            <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-5 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wind className="w-5 h-5 text-blue-300" />
                <p className="text-4xl font-black font-mono text-blue-300">{onAir.length}</p>
              </div>
              <p className="text-sm font-mono text-blue-600 uppercase tracking-wider">On Air (SCBA)</p>
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
          <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1">Status Breakdown</p>
          {Object.entries(statusTally).map(([status, count]) => {
            const sc = STATUS_COLORS[status] || STATUS_COLORS.dispatched;
            return (
              <div key={status} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${sc.bg} ${sc.border}`}>
                <span className={`font-mono font-bold text-sm uppercase tracking-wide ${sc.text}`}>
                  {status.replace(/_/g, ' ')}
                </span>
                <span className="font-mono font-black text-white text-2xl">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Floor accountability */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 overflow-y-auto">
          <p className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1">Floor Accountability</p>
          {sortedFloors.length === 0 && (
            <p className="text-muted-foreground font-mono text-sm italic">No floor assignments</p>
          )}
          {sortedFloors.map(floor => (
            <div key={floor} className="flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/30 border border-border/50">
              <span className="font-mono font-bold text-cyan-300 text-sm">▲ {floor}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-muted-foreground">{byFloor[floor].map(u => u.unit_name).join(', ')}</span>
                <span className="font-mono text-white font-bold text-sm bg-secondary/60 px-2 py-0.5 rounded">
                  {byFloor[floor].length}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── shared header ─────────────────────────────────────────────────────────────
function SlideHeader({ label, icon, incident, units }) {
  const maydayCount = units.filter(u => u.status === 'mayday').length;
  return (
    <div className="flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        {icon}
        <div>
          <p className="text-3xl font-black font-mono tracking-widest text-white uppercase">{label}</p>
          {incident && (
            <p className="text-base font-mono text-muted-foreground">
              {incident.command_name || incident.address} &nbsp;·&nbsp;
              {incident.alarm_level?.replace(/_/g, ' ').toUpperCase()}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6 text-right">
        {maydayCount > 0 && (
          <span className="text-xl font-black font-mono text-red-400 animate-pulse uppercase tracking-widest">
            ⚠ MAYDAY
          </span>
        )}
        <div>
          <p className="text-3xl font-mono font-bold text-white tabular-nums"><Clock24 /></p>
          {incident?.started_at && (
            <p className="text-xs font-mono text-muted-foreground">
              Elapsed: {formatDistanceToNowStrict(new Date(incident.started_at))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main kiosk ────────────────────────────────────────────────────────────────
const SLIDES = [
  { id: 'tactical',    label: 'Tactical Board',   Component: TacticalSlide    },
  { id: 'par',         label: 'PAR Status',        Component: PARSlide         },
  { id: 'assignments', label: 'Unit Assignments',  Component: AssignmentsSlide },
];

export default function KioskDisplay() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: rawUnits = [] } = useQuery({
    queryKey: ['kiosk-units', incidentId],
    queryFn: () => base44.entities.Unit.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
    refetchInterval: 10000,
  });

  const { data: rosterEntries = [] } = useQuery({
    queryKey: ['kiosk-roster', format(new Date(), 'yyyy-MM-dd'), getCurrentShift()],
    queryFn: () => base44.entities.Roster.filter({
      shift_date: format(new Date(), 'yyyy-MM-dd'),
      shift: getCurrentShift(),
    }, 'unit_name', 100),
    refetchInterval: 30000,
  });

  // Merge roster personnel into units by matching unit name
  const units = useMemo(() => {
    return rawUnits.map(unit => {
      const rosterMatch = rosterEntries.find(
        r => r.unit_name?.toLowerCase().trim() === unit.unit_name?.toLowerCase().trim()
      );
      if (!rosterMatch) return unit;
      return {
        ...unit,
        officer: rosterMatch.officer || unit.officer,
        personnel: rosterMatch.personnel?.length ? rosterMatch.personnel : unit.personnel,
        personnel_count: rosterMatch.personnel_count || unit.personnel_count,
      };
    });
  }, [rawUnits, rosterEntries]);

  const { data: incident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: d => d?.[0] || null,
    enabled: !!incidentId,
    refetchInterval: 30000,
  });

  const nextSlide = useCallback(() => {
    setSlideIdx(i => (i + 1) % SLIDES.length);
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setSlideIdx(i => (i - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    setProgress(0);
    const interval = 100;
    const steps = SLIDE_DURATION / interval;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setProgress((step / steps) * 100);
      if (step >= steps) {
        nextSlide();
      }
    }, interval);
    return () => clearInterval(timer);
  }, [slideIdx, paused, nextSlide]);

  const { Component } = SLIDES[slideIdx];
  const mayday = units.some(u => u.status === 'mayday');

  return (
    <div className={`min-h-screen bg-background flex flex-col select-none ${mayday ? 'ring-4 ring-inset ring-red-600' : ''}`}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-2 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-mono font-bold text-sm tracking-wider text-primary uppercase">KIOSK</span>
        </div>
        <div className="flex gap-1 flex-1">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setSlideIdx(i); setProgress(0); }}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                i === slideIdx ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => setPaused(p => !p)} className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary/50 transition-colors">
          {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <button onClick={() => prevSlide()} className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary/50 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => nextSlide()} className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary/50 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => navigate(`/incident/${incidentId}`)} className="text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-secondary/50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary/40 shrink-0">
        <div
          className="h-full bg-primary transition-none"
          style={{ width: `${paused ? progress : progress}%` }}
        />
      </div>

      {/* Slide */}
      <div className="flex-1 overflow-hidden">
        <Component units={units} incident={incident} />
      </div>
    </div>
  );
}