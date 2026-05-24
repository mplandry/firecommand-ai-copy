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

const GRID_SIZE = 48; // px per cell
const COLS = 20;
const ROWS = 16;

// ── Abbreviate unit name for tight label ──────────────────────────────────────
function shortName(name) {
  const parts = name.trim().split(/\s+/);
  const rawTown = parts[0];
  const town = rawTown.charAt(0).toUpperCase() + rawTown.slice(1).toLowerCase(); // WAL→Wal, CAM→Cam
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

// ── Draggable unit token ──────────────────────────────────────────────────────
function UnitToken({ unit, position, onDragStart, isReadOnly }) {
  const colorClass = STATUS_COLORS[unit.status] || STATUS_COLORS.dispatched;
  return (
    <div
      className={`absolute flex flex-col items-center cursor-${isReadOnly ? 'default' : 'grab'} select-none z-10`}
      style={{ left: position.x * GRID_SIZE + 2, top: position.y * GRID_SIZE + 2, width: GRID_SIZE - 4, height: GRID_SIZE + 4 }}
      onMouseDown={isReadOnly ? undefined : (e) => onDragStart(e, unit.id)}
      onTouchStart={isReadOnly ? undefined : (e) => onDragStart(e, unit.id)}
      title={`${unit.unit_name} — ${unit.status}`}
    >
      <div className={`w-10 h-10 rounded-md border-2 ${colorClass} flex items-center justify-center text-xl leading-none shadow-lg`}>
        {UNIT_TYPE_ICONS[unit.unit_type] || '🚐'}
      </div>
      <span className="font-mono text-[10px] text-foreground font-bold leading-tight mt-0.5 bg-background/90 px-1 rounded truncate max-w-[44px] text-center">
        {shortName(unit.unit_name)}
      </span>
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

  // Initialise unplaced units in a row across the bottom
  useEffect(() => {
    setPositions(prev => {
      const next = { ...prev };
      units.forEach((unit, i) => {
        if (!next[unit.id]) {
          next[unit.id] = { x: i % 10, y: ROWS - 1 - Math.floor(i / 10) };
        }
      });
      // Clean up removed units
      Object.keys(next).forEach(id => {
        if (!units.find(u => u.id === id)) delete next[id];
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
              { label: 'ALPHA ▶', x: 0,  y: ROWS/2 - 0.5, rotate: false, anchor: 'left'   },
              { label: '◀ CHARLIE', x: COLS - 4, y: ROWS/2 - 0.5, rotate: false, anchor: 'left' },
              { label: '▼ BRAVO', x: COLS/2 - 1.5, y: 0.2, rotate: false, anchor: 'left'  },
              { label: '▲ DELTA', x: COLS/2 - 1.5, y: ROWS - 1.2, rotate: false, anchor: 'left' },
            ].map(({ label, x, y }) => (
              <span
                key={label}
                className="absolute text-[11px] font-mono font-bold text-amber-400/80 uppercase tracking-widest drop-shadow-sm"
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