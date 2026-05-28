import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Move, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UNIT_TYPE_ICONS = {
  engine: '🚒', truck: '🪜', rescue: '🚑', squad: '🔧', battalion: '⭐',
  medic: '🏥', tanker: '💧', brush: '🌿', hazmat: '☣️', other: '🚐',
};

const STATUS_COLORS = {
  dispatched:    'border-gray-500   bg-gray-900/80',
  responding:    'border-yellow-500 bg-yellow-900/80',
  on_scene:      'border-blue-500   bg-blue-900/80',
  working:       'border-red-500    bg-red-900/80',
  par:           'border-green-500  bg-green-900/80',
  mayday:        'border-red-400    bg-red-800/90 animate-pulse',
  available:     'border-green-600  bg-green-900/80',
  rehab:         'border-purple-500 bg-purple-900/80',
  out_of_service:'border-gray-600   bg-gray-900/80',
};

const GRID_SIZE = 64; // px per cell
const COLS = 20;
const ROWS = 16;

// Default hydrant starting positions — bottom-left near water supply, bottom-right near delta
const DEFAULT_HYDRANTS = [
  { id: 'h1', x: 1,  y: 12 },
  { id: 'h2', x: 16, y: 12 },
];

// ── Abbreviate unit name for tight label ──────────────────────────────────────
function shortName(name) {
  const parts = name.trim().split(/\s+/);
  const rawTown = parts[0];
  const town = rawTown.toUpperCase();
  const rest = parts.slice(1).join(' ');

  const typeMap = [
    [/^Engine\s*/i,    'E'],
    [/^Tower\s*/i,     'Tw'],
    [/^Ladder\s*/i,    'L'],
    [/^Rescue\s*/i,    'R'],
    [/^Squad\s*/i,     'Sq'],
    [/^Moody Boat/i,   'MB'],
    [/^Central Boat/i, 'CB'],
    [/^Medic\s*/i,     'M'],
    [/^Tanker\s*/i,    'Tnk'],
    [/^Brush\s*/i,     'Br'],
    [/^Hazmat\s*/i,    'Hz'],
  ];

  let abbrev = rest;
  for (const [pattern, short] of typeMap) {
    if (pattern.test(rest)) { abbrev = rest.replace(pattern, short); break; }
  }
  return rest ? `${town} ${abbrev}` : town;
}

// ── Map tactical assignment → SiteMap grid zone ───────────────────────────────
function assignmentToPosition(assignment, index) {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const cx = (v) => Math.min(COLS - 1, Math.max(0, v));
  const cy = (v) => Math.min(ROWS - 1, Math.max(0, v));
  switch (assignment) {
    case 'division_a':   return { x: cx(6  + col * 2), y: cy(13 + row) };
    case 'division_b':   return { x: cx(col),           y: cy(4  + row) };
    case 'division_c':   return { x: cx(6  + col * 2), y: cy(row)       };
    case 'division_d':   return { x: cx(17 + col),      y: cy(4  + row)  };
    case 'roof':         return { x: cx(7  + col * 2), y: cy(2  + row)  };
    case 'interior':     return { x: cx(8  + col * 2), y: cy(6  + row)  };
    case 'rit':          return { x: cx(col),           y: cy(1  + row)  };
    case 'rehab':        return { x: cx(16 + col),      y: cy(13 + row)  };
    case 'staging':      return { x: cx(13 + col * 2), y: cy(13 + row)  };
    case 'medical':      return { x: cx(10 + col * 2), y: cy(11 + row)  };
    case 'water_supply': return { x: cx(col),           y: cy(12 + row)  };
    case 'ventilation':  return { x: cx(3  + col * 2), y: cy(row)       };
    case 'search':       return { x: cx(8  + col * 2), y: cy(9  + row)  };
    case 'exposure':     return { x: cx(17 + col),      y: cy(row)       };
    case 'unassigned':   return { x: cx(3  + col * 2), y: cy(13 + row)  };
    // ── Building corners ──
    case 'corner_ab':    return { x: cx(3  + col), y: cy(10 + row) }; // bottom-left
    case 'corner_ad':    return { x: cx(15 + col), y: cy(10 + row) }; // bottom-right
    case 'corner_bc':    return { x: cx(3  + col), y: cy(2  + row) }; // top-left
    case 'corner_cd':    return { x: cx(15 + col), y: cy(2  + row) }; // top-right
    default:             return { x: cx(col),       y: cy(ROWS - 1 - row) };
  }
}

// ── Map SiteMap grid position → tactical board assignment ─────────────────────
function positionToAssignment(x, y) {
  // ── Building corners — checked first (tight zones at each corner of structure) ──
  if (x >= 3 && x <= 5  && y >= 10 && y <= 12) return 'corner_ab'; // bottom-left
  if (x >= 14 && x <= 16 && y >= 10 && y <= 12) return 'corner_ad'; // bottom-right
  if (x >= 3 && x <= 5  && y >= 2  && y <= 4)  return 'corner_bc'; // top-left
  if (x >= 14 && x <= 16 && y >= 2  && y <= 4)  return 'corner_cd'; // top-right
  // ── Outer zones ──
  if (x <= 2 && y <= 3)   return 'rit';
  if (x >= 17 && y <= 2)  return 'exposure';
  if (x >= 16 && y >= 12) return 'rehab';
  if (x <= 2 && y >= 11)  return 'water_supply';
  if (y >= 12 && x >= 5 && x <= 15) return 'division_a';
  if (x <= 3  && y >= 3  && y <= 11) return 'division_b';
  if (y <= 2  && x >= 4  && x <= 16) return 'division_c';
  if (x >= 16 && y >= 3  && y <= 11) return 'division_d';
  if (y >= 2  && y <= 4  && x >= 5  && x <= 15) return 'roof';
  if (y >= 5  && y <= 8  && x >= 5  && x <= 14) return 'interior';
  if (y >= 8  && y <= 11 && x >= 6  && x <= 12) return 'search';
  if (y >= 9  && y <= 12 && x >= 9  && x <= 14) return 'medical';
  if (y >= 11 && x >= 11 && x <= 15) return 'staging';
  if (y <= 4  && x >= 3  && x <= 6)  return 'ventilation';
  return 'unassigned';
}

// ── Draggable fire hydrant token ──────────────────────────────────────────────
function HydrantToken({ hydrant, onDragStart, isReadOnly }) {
  return (
    <div
      className={`absolute z-20 select-none cursor-${isReadOnly ? 'default' : 'grab'} active:cursor-grabbing`}
      style={{ left: hydrant.x * GRID_SIZE + 2, top: hydrant.y * GRID_SIZE + 2 }}
      onMouseDown={isReadOnly ? undefined : (e) => onDragStart(e, hydrant.id, 'hydrant')}
      onTouchStart={isReadOnly ? undefined : (e) => onDragStart(e, hydrant.id, 'hydrant')}
      title="Fire Hydrant — drag to reposition"
    >
      <div
        className="rounded-md border-2 border-red-400 bg-red-950/90 shadow-lg flex flex-col items-center justify-center gap-0.5"
        style={{ width: GRID_SIZE - 4, height: GRID_SIZE - 4 }}
      >
        {/* Inline SVG hydrant icon */}
        <svg viewBox="0 0 24 28" width="30" height="30" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cap (blue) */}
          <ellipse cx="12" cy="4" rx="6" ry="3.5" fill="#3b82f6" />
          {/* Neck */}
          <rect x="10" y="4" width="4" height="4" fill="#b91c1c" />
          {/* Body */}
          <rect x="7" y="8" width="10" height="11" rx="2.5" fill="#ef4444" />
          {/* Left outlet */}
          <rect x="2" y="11" width="5" height="4" rx="1.5" fill="#b91c1c" />
          {/* Right outlet */}
          <rect x="17" y="11" width="5" height="4" rx="1.5" fill="#b91c1c" />
          {/* Base */}
          <rect x="5" y="19" width="14" height="5" rx="2" fill="#b91c1c" />
          {/* Cap shine */}
          <ellipse cx="10" cy="3" rx="2" ry="1" fill="#93c5fd" opacity="0.5" />
        </svg>
        <span className="font-mono text-[8px] font-bold text-red-200 leading-none tracking-wider">HYDRANT</span>
      </div>
    </div>
  );
}

// ── Draggable unit token ──────────────────────────────────────────────────────
function UnitToken({ unit, position, onDragStart, isReadOnly }) {
  const colorClass = STATUS_COLORS[unit.status] || STATUS_COLORS.dispatched;
  return (
    <div
      className={`absolute cursor-${isReadOnly ? 'default' : 'grab'} active:cursor-grabbing select-none z-10`}
      style={{ left: position.x * GRID_SIZE + 2, top: position.y * GRID_SIZE + 2 }}
      onMouseDown={isReadOnly ? undefined : (e) => onDragStart(e, unit.id, 'unit')}
      onTouchStart={isReadOnly ? undefined : (e) => onDragStart(e, unit.id, 'unit')}
      title={`${unit.unit_name} — ${unit.status}`}
    >
      <div
        className={`rounded-md border-2 ${colorClass} shadow-lg flex flex-col items-center justify-center gap-0.5`}
        style={{ width: GRID_SIZE - 4, height: GRID_SIZE - 4 }}
      >
        <span className="text-xl leading-none">{UNIT_TYPE_ICONS[unit.unit_type] || '🚐'}</span>
        <span className="font-mono text-xs font-bold text-white leading-none text-center tracking-tight px-1">
          {shortName(unit.unit_name)}
        </span>
      </div>
    </div>
  );
}

// ── Snap pixel offset to nearest grid cell ────────────────────────────────────
function snapToGrid(px) {
  return Math.max(0, Math.round(px / GRID_SIZE));
}

// ─────────────────────────────────────────────────────────────────────────────

// Units that never appear on the site map (boats, utility vehicles, etc.)
const SITEMAP_EXCLUDE = /\b(boat|rtv)\b/i;

export default function SiteMap({ units, isReadOnly, onMoveUnit, incidentId }) {
  // Strip non-deployable apparatus before any rendering or position tracking
  const mapUnits = units.filter(u => !SITEMAP_EXCLUDE.test(u.unit_name || ''));
  // Unit positions derived from assignments
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null); // { id, type: 'unit'|'hydrant', offsetX, offsetY }
  const gridRef = useRef(null);
  const prevAssignments = useRef({});
  const positionsRef = useRef({});

  // Hydrant positions — persisted in localStorage per incident
  const [hydrantPositions, setHydrantPositions] = useState(() => {
    if (!incidentId) return DEFAULT_HYDRANTS;
    try {
      const saved = localStorage.getItem(`sitemap_hydrants_${incidentId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_HYDRANTS;
  });

  // Persist hydrant positions on every change
  useEffect(() => {
    if (!incidentId) return;
    try {
      localStorage.setItem(`sitemap_hydrants_${incidentId}`, JSON.stringify(hydrantPositions));
    } catch {}
  }, [hydrantPositions, incidentId]);

  // Keep ref so handleMouseUp reads latest unit positions without stale closure
  useEffect(() => { positionsRef.current = positions; }, [positions]);

  // Mirror tactical board → SiteMap: auto-place/move units when assignment changes
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev };
      const groups = {};
      mapUnits.forEach(u => {
        const a = u.assignment || 'unassigned';
        if (!groups[a]) groups[a] = [];
        groups[a].push(u.id);
      });
      mapUnits.forEach((unit) => {
        const curr = unit.assignment || 'unassigned';
        const prev2 = prevAssignments.current[unit.id];
        const idx = groups[curr].indexOf(unit.id);
        if (!next[unit.id] || prev2 !== curr) {
          next[unit.id] = assignmentToPosition(curr, idx);
        }
        prevAssignments.current[unit.id] = curr;
      });
      // Clean up removed units
      Object.keys(next).forEach(id => {
        if (!mapUnits.find(u => u.id === id)) {
          delete next[id];
          delete prevAssignments.current[id];
        }
      });
      return next;
    });
  }, [mapUnits]);

  // ── Drag start — handles both units and hydrants ──────────────────────────
  const handleDragStart = useCallback((e, id, type = 'unit') => {
    e.preventDefault();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const pos = type === 'hydrant'
      ? (hydrantPositions.find(h => h.id === id) || { x: 0, y: 0 })
      : (positions[id] || { x: 0, y: 0 });

    setDragging({
      id,
      type,
      offsetX: clientX - rect.left - pos.x * GRID_SIZE,
      offsetY: clientY - rect.top  - pos.y * GRID_SIZE,
    });
  }, [positions, hydrantPositions]);

  // ── Mouse/touch move ──────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rawX = clientX - rect.left - dragging.offsetX;
    const rawY = clientY - rect.top  - dragging.offsetY;
    const x = Math.min(COLS - 1, snapToGrid(rawX));
    const y = Math.min(ROWS - 1, snapToGrid(rawY));

    if (dragging.type === 'hydrant') {
      setHydrantPositions(prev => prev.map(h => h.id === dragging.id ? { ...h, x, y } : h));
    } else {
      setPositions(prev => ({ ...prev, [dragging.id]: { x, y } }));
    }
  }, [dragging]);

  // ── Mouse/touch up — fires onMoveUnit for unit drops ─────────────────────
  const handleMouseUp = useCallback(() => {
    if (dragging?.type === 'unit' && onMoveUnit) {
      const pos = positionsRef.current[dragging.id];
      if (pos) {
        const unit = mapUnits.find(u => u.id === dragging.id);
        const newAssignment = positionToAssignment(pos.x, pos.y);
        if (unit && newAssignment !== (unit.assignment || 'unassigned')) {
          onMoveUnit(unit, newAssignment);
        }
      }
    }
    setDragging(null);
  }, [dragging, mapUnits, onMoveUnit]);

  // Global listeners while dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const resetPositions = () => setPositions({});

  const gridW = COLS * GRID_SIZE;
  const gridH = ROWS * GRID_SIZE;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Move className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex-1">
          Site Map — drag units · assignments sync to tactical board
        </span>
        <span className="text-[9px] font-mono text-red-400/70 mr-1">🔴 hydrants draggable</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-muted-foreground" onClick={resetPositions}>
          <RotateCcw className="w-3 h-3" /> Reset Units
        </Button>
      </div>

      {/* Scrollable grid canvas */}
      <div className="flex-1 overflow-auto p-2">
        <div
          ref={gridRef}
          className="relative border border-border rounded-lg overflow-hidden"
          style={{ width: gridW, height: gridH, minWidth: gridW }}
        >
          {/* Grid lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="smallGrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                <path d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              </pattern>
              <pattern id="bigGrid" width={GRID_SIZE * 5} height={GRID_SIZE * 5} patternUnits="userSpaceOnUse">
                <rect width={GRID_SIZE * 5} height={GRID_SIZE * 5} fill="url(#smallGrid)" />
                <path d={`M ${GRID_SIZE * 5} 0 L 0 0 0 ${GRID_SIZE * 5}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bigGrid)" />
          </svg>

          {/* Zone labels */}
          <div className="absolute inset-0 pointer-events-none">
            {[
              { label: '▲ ALPHA',   x: COLS/2 - 2,   y: ROWS - 1.2  },
              { label: '▼ CHARLIE', x: COLS/2 - 2.5, y: 0.2         },
              { label: 'BRAVO ▶',  x: 0,             y: ROWS/2 - 0.5 },
              { label: '◀ DELTA',  x: COLS - 4,      y: ROWS/2 - 0.5 },
            ].map(({ label, x, y }) => (
              <span
                key={label}
                className="absolute text-xs font-mono font-bold text-white bg-black/70 border border-white/30 rounded px-2 py-0.5 uppercase tracking-wider whitespace-nowrap z-20"
                style={{ left: x * GRID_SIZE, top: y * GRID_SIZE }}
              >
                {label}
              </span>
            ))}
            {/* Corner zone indicators — fuchsia badges at each building corner */}
            {[
              { label: 'A/B', x: 3, y: 10.4 }, // bottom-left
              { label: 'A/D', x: 15, y: 10.4 }, // bottom-right
              { label: 'B/C', x: 3, y: 2.4  }, // top-left
              { label: 'C/D', x: 15, y: 2.4  }, // top-right
            ].map(({ label, x, y }) => (
              <span
                key={label}
                className="absolute text-[9px] font-mono font-bold text-fuchsia-200 bg-fuchsia-900/80 border border-fuchsia-500/50 rounded px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap z-20"
                style={{ left: x * GRID_SIZE, top: y * GRID_SIZE }}
              >
                {label}
              </span>
            ))}
            {/* Building outline (centered) */}
            <div
              className="absolute border-2 border-dashed border-primary/20 rounded"
              style={{ left: GRID_SIZE * 5, top: GRID_SIZE * 3, width: GRID_SIZE * 10, height: GRID_SIZE * 8 }}
            >
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-primary/20 uppercase tracking-widest whitespace-nowrap">
                Structure
              </span>
            </div>
          </div>

          {/* Hydrant tokens — rendered below units (z-20 vs z-10 on units, but hydrant has z-20 so it stays on top when dragged) */}
          {hydrantPositions.map(hydrant => (
            <HydrantToken
              key={hydrant.id}
              hydrant={hydrant}
              onDragStart={handleDragStart}
              isReadOnly={isReadOnly}
            />
          ))}

          {/* Unit tokens */}
          {mapUnits.map(unit => {
            const pos = positions[unit.id] || { x: 0, y: 0 };
            return (
              <UnitToken
                key={unit.id}
                unit={unit}
                position={pos}
                onDragStart={handleDragStart}
                isReadOnly={isReadOnly}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 px-1">
          {[
            ['working',   'Working' ],
            ['on_scene',  'On Scene'],
            ['par',       'PAR'     ],
            ['rehab',     'Rehab'   ],
            ['mayday',    'MAYDAY'  ],
          ].map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded border-2 ${STATUS_COLORS[status]}`} />
              <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-2 border-red-400 bg-red-950/90" />
            <span className="text-[9px] font-mono text-muted-foreground">Hydrant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
