import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const UNIT_TYPE_ICONS = {
  engine: '🚒', truck: '🪜', rescue: '🚑', squad: '🔧', battalion: '⭐',
  medic: '🏥', tanker: '💧', brush: '🌿', hazmat: '☣️', other: '🚐',
};

const STATUS_COLORS = {
  dispatched:   'border-gray-500   bg-gray-900/80',
  responding:   'border-yellow-500 bg-yellow-900/80',
  on_scene:     'border-blue-500   bg-blue-900/80',
  working:      'border-red-500    bg-red-900/80',
  par:          'border-green-500  bg-green-900/80',
  mayday:       'border-red-400    bg-red-800/90 animate-pulse',
  available:    'border-green-600  bg-green-900/80',
  rehab:        'border-purple-500 bg-purple-900/80',
  out_of_service:'border-gray-600  bg-gray-900/80',
};

const GRID_SIZE = 64; // px per cell
const COLS = 20;
const ROWS = 16;

// ── Abbreviate unit name for tight label ──────────────────────────────────────
function shortName(name) {
  const parts = name.trim().split(/\s+/);
  const rawTown = parts[0];
  const town = rawTown.toUpperCase(); // WAL→WAL, CAM→CAM
  const rest = parts.slice(1).join(' ');

  const typeMap = [
    [/^Engine\s*/i,       'E'],
    [/^Tower\s*/i,        'Tw'],
    [/^Ladder\s*/i,       'L'],
    [/^Rescue\s*/i,       'R'],
    [/^Squad\s*/i,        'Sq'],
    [/^Moody Boat/i,      'MB'],
    [/^Central Boat/i,    'CB'],
    [/^Medic\s*/i,        'M'],
    [/^Tanker\s*/i,       'Tnk'],
    [/^Brush\s*/i,        'Br'],
    [/^Hazmat\s*/i,       'Hz'],
  ];

  let abbrev = rest;
  for (const [pattern, short] of typeMap) {
    if (pattern.test(rest)) {
      abbrev = rest.replace(pattern, short);
      break;
    }
  }

  return rest ? `${town} ${abbrev}` : town;
}

// ── Map tactical board assignment → SiteMap grid zone ────────────────────────
function assignmentToPosition(assignment, index) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const cx = (v) => Math.min(COLS - 1, Math.max(0, v));
  const cy = (v) => Math.min(ROWS - 1, Math.max(0, v));
  switch (assignment) {
    case 'division_a':   return { x: cx(6 + col),   y: cy(13 + row) };  // Alpha — bottom
    case 'division_b':   return { x: cx(col),        y: cy(4 + row) };   // Bravo — left
    case 'division_c':   return { x: cx(6 + col),   y: cy(row) };        // Charlie — top
    case 'division_d':   return { x: cx(17 + col),  y: cy(4 + row) };   // Delta — right
    case 'roof':         return { x: cx(7 + col),   y: cy(2 + row) };   // Roof — upper center
    case 'interior':     return { x: cx(8 + col),   y: cy(6 + row) };   // Interior — center
    case 'rit':          return { x: cx(col),        y: cy(1 + row) };   // RIT — top-left
    case 'rehab':        return { x: cx(16 + col),  y: cy(13 + row) };  // Rehab — bottom-right
    case 'staging':      return { x: cx(13 + col),  y: cy(13 + row) };  // Staging — bottom center
    case 'medical':      return { x: cx(10 + col),  y: cy(11 + row) };  // Medical
    case 'water_supply': return { x: cx(col),        y: cy(12 + row) };  // Water supply — bottom-left
    case 'ventilation':  return { x: cx(3 + col),   y: cy(row) };       // Ventilation — top
    case 'search':       return { x: cx(8 + col),   y: cy(9 + row) };   // Search — lower interior
    case 'exposure':     return { x: cx(17 + col),  y: cy(row) };       // Exposure — top-right
    case 'unassigned':   return { x: cx(3 + col),   y: cy(13 + row) };  // Unassigned — bottom staging
    default:             return { x: cx(col),        y: cy(ROWS - 1 - row) };
  }
}

// ── Draggable unit token ──────────────────────────────────────────────────────
function UnitToken({ unit, position, onDragStart, isReadOnly }) {
  const colorClass = STATUS_COLORS[unit.status] || STATUS_COLORS.dispatched;
  return (
    <div
      className={`absolute cursor-${isReadOnly ? 'default' : 'grab'} active:cursor-grabbing select-none z-10`}
      style={{ left: position.x * GRID_SIZE + 2, top: position.y * GRID_SIZE + 2 }}
      onMouseDown={isReadOnly ? undefined : (e) => onDragStart(e, unit.id)}
      onTouchStart={isReadOnly ? undefined : (e) => onDragStart(e, unit.id)}
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

// ── Snap a pixel offset to nearest grid cell ──────────────────────────────────
function snapToGrid(px) {
  return Math.max(0, Math.round(px / GRID_SIZE));
}

export default function SiteMap({ units, isReadOnly }) {
  // positions: { [unitId]: { x, y } }
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null); // { unitId, offsetX, offsetY }
  const gridRef = useRef(null);
  const prevAssignments = useRef({});

  // Mirror tactical board: auto-place/move units when assignment changes
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev };

      // Group units by assignment so we can stagger within each zone
      const groups = {};
      units.forEach(u => {
        const a = u.assignment || 'unassigned';
        if (!groups[a]) groups[a] = [];
        groups[a].push(u.id);
      });

      units.forEach((unit) => {
        const curr = unit.assignment || 'unassigned';
        const prev2 = prevAssignments.current[unit.id];
        const idx = groups[curr].indexOf(unit.id);

        if (!next[unit.id] || prev2 !== curr) {
          // New unit or assignment changed → snap to zone
          next[unit.id] = assignmentToPosition(curr, idx);
        }
        prevAssignments.current[unit.id] = curr;
      });

      // Clean up removed units
      Object.keys(next).forEach(id => {
        if (!units.find(u => u.id === id)) {
          delete next[id];
          delete prevAssignments.current[id];
        }
      });

      return next;
    });
  }, [units]);

  const handleDragStart = useCallback((e, unitId) => {
    e.preventDefault();
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const pos = positions[unitId] || { x: 0, y: 0 };
    setDragging({
      unitId,
      offsetX: clientX - rect.left - pos.x * GRID_SIZE,
      offsetY: clientY - rect.top  - pos.y * GRID_SIZE,
    });
  }, [positions]);

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
    setPositions(prev => ({ ...prev, [dragging.unitId]: { x, y } }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

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

  const resetPositions = () => {
    setPositions({});
  };

  const gridW = COLS * GRID_SIZE;
  const gridH = ROWS * GRID_SIZE;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Move className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex-1">
          Site Map — drag units to position
        </span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-muted-foreground" onClick={resetPositions}>
          <RotateCcw className="w-3 h-3" /> Reset
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
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
          >
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
              { label: '▲ ALPHA',    x: COLS/2 - 2,   y: ROWS - 1.2,    rotate: false, anchor: 'left' },
              { label: '▼ CHARLIE', x: COLS/2 - 2.5, y: 0.2,           rotate: false, anchor: 'left' },
              { label: 'BRAVO ▶',  x: 0,             y: ROWS/2 - 0.5,  rotate: false, anchor: 'left' },
              { label: '◀ DELTA',  x: COLS - 4,      y: ROWS/2 - 0.5,  rotate: false, anchor: 'left' },
            ].map(({ label, x, y }) => (
              <span
                key={label}
                className="absolute text-xs font-mono font-bold text-white bg-black/70 border border-white/30 rounded px-2 py-0.5 uppercase tracking-wider whitespace-nowrap z-20"
                style={{ left: x * GRID_SIZE, top: y * GRID_SIZE }}
              >
                {label}
              </span>
            ))}
            {/* Building outline (centered) */}
            <div
              className="absolute border-2 border-dashed border-primary/20 rounded"
              style={{
                left: GRID_SIZE * 5, top: GRID_SIZE * 3,
                width: GRID_SIZE * 10, height: GRID_SIZE * 8,
              }}
            >
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-mono text-primary/20 uppercase tracking-widest whitespace-nowrap">
                Structure
              </span>
            </div>
          </div>

          {/* Unit tokens */}
          {units.map(unit => {
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
            ['working',   'Working'  ],
            ['on_scene',  'On Scene' ],
            ['par',       'PAR'      ],
            ['rehab',     'Rehab'    ],
            ['mayday',    'MAYDAY'   ],
          ].map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded border-2 ${STATUS_COLORS[status]}`} />
              <span className="text-[9px] font-mono text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}