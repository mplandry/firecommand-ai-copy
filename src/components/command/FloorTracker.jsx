import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FLOOR_ORDER = [
  'Roof',
  'Attic',
  '8th Floor', '7th Floor', '6th Floor', '5th Floor',
  '4th Floor', '3rd Floor', '2nd Floor', '1st Floor',
  'Basement',
];

const unitTypeIcons = {
  engine: '🚒', truck: '🪜', rescue: '🚑', squad: '🔧',
  deputy: '⭐', medic: '🏥', tanker: '💧', brush: '🌿',
  hazmat: '☣️', other: '🚐',
};

const statusColors = {
  working:  'border-blue-500/60 text-blue-300',
  on_scene: 'border-green-500/60 text-green-300',
  par:      'border-green-400/60 text-green-200',
  mayday:   'border-red-500 text-red-300 animate-pulse',
  rehab:    'border-purple-500/60 text-purple-300',
};

// Only show floors that have units OR the always-visible base floors
const BASE_FLOORS = ['Roof', 'Attic', '2nd Floor', '1st Floor', 'Basement'];

export default function FloorTracker({ units, onUpdateUnit, specialUnits = [] }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Exclude water/special apparatus that never enter a building.
  // Match on full name OR strip dept prefix so "WAL Moody Boat" matches "Moody Boat" too.
  // Also hardcode known non-building units as a safety net.
  const ALWAYS_EXCLUDE = /\b(boat|rtv)\b/i;
  const floorUnits = units.filter(u => {
    const uName = u.unit_name?.toLowerCase().trim() || '';
    if (ALWAYS_EXCLUDE.test(uName)) return false;
    return !specialUnits.some(sName => {
      const s = sName.toLowerCase().trim();
      const sStripped = s.replace(/^[a-z]{2,5}\s+/, ''); // strip prefix like "wal "
      return uName === s || uName === sStripped || uName.endsWith(sStripped);
    });
  });

  // Group by floor — also catch attic-assigned units whose floor may be 'Attic'
  const byFloor = {};
  floorUnits.forEach(u => {
    // If no explicit floor but assigned to attic, treat as Attic floor
    const floor = u.floor?.trim() || (u.assignment === 'attic' ? 'Attic' : null);
    if (floor) {
      if (!byFloor[floor]) byFloor[floor] = [];
      byFloor[floor].push(u);
    }
  });

  // Determine which floors to show
  const floorsWithUnits = new Set(Object.keys(byFloor));
  const visibleFloors = showAll
    ? FLOOR_ORDER
    : FLOOR_ORDER.filter(f => floorsWithUnits.has(f) || BASE_FLOORS.includes(f));

  const handleDragEnd = (result) => {
    if (!result.destination || !onUpdateUnit) return;
    const { draggableId, destination } = result;
    const targetFloor = destination.droppableId === '__none__' ? '' : destination.droppableId;
    const unit = units.find(u => u.id === draggableId);
    if (unit && unit.floor !== targetFloor) {
      const updateData = { floor: targetFloor };
      // Auto-set working when assigned to a floor
      if (targetFloor && !['available', 'out_of_service', 'rehab', 'mayday'].includes(unit.status)) {
        updateData.status = 'working';
        if (!unit.on_scene_time) updateData.on_scene_time = new Date().toISOString();
      }
      onUpdateUnit(unit, updateData);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <h3 className="text-sm font-bold font-mono tracking-widest text-foreground uppercase">
          Floor Accountability
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            {units.filter(u => u.floor).length} tracked
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {/* Show all toggle */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono text-muted-foreground/50">
              Drag units between floors
            </span>
            <button
              onClick={() => setShowAll(s => !s)}
              className="text-xs font-mono text-primary hover:underline"
            >
              {showAll ? 'show fewer' : 'show all floors'}
            </button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Building cross-section */}
            <div className="flex gap-3">
              {/* Floor labels column */}
              <div className="flex flex-col" style={{ gap: 4 }}>
                {visibleFloors.map(floor => {
                  const isRoof = floor === 'Roof';
                  const isBasement = floor === 'Basement';
                  return (
                    <div
                      key={floor}
                      className="flex items-center justify-end"
                      style={{ height: 64 }}
                    >
                      <span className={`text-xs font-mono font-bold tracking-wider pr-2 whitespace-nowrap ${
                        isRoof || isBasement || floor === 'Attic' ? 'text-amber-400/80' : 'text-cyan-400/70'
                      }`}>
                        {floor === '1st Floor' ? '1F' :
                         floor === '2nd Floor' ? '2F' :
                         floor === '3rd Floor' ? '3F' :
                         floor === '4th Floor' ? '4F' :
                         floor === '5th Floor' ? '5F' :
                         floor === '6th Floor' ? '6F' :
                         floor === '7th Floor' ? '7F' :
                         floor === '8th Floor' ? '8F' :
                         floor === 'Basement'  ? 'BSM' :
                         floor === 'Attic'     ? 'ATTC' :
                         floor.substring(0, 4).toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Drop zones column — building silhouette */}
              <div className="flex-1 flex flex-col border border-border/60 rounded overflow-hidden" style={{ gap: 0 }}>
                {visibleFloors.map((floor, idx) => {
                  const floorUnits = byFloor[floor] || [];
                  const hasMayday = floorUnits.some(u => u.status === 'mayday');
                  const isRoof = floor === 'Roof';
                  const isBasement = floor === 'Basement';

                  return (
                    <Droppable droppableId={floor} key={floor} direction="horizontal">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex items-center px-2 gap-2 transition-colors border-b border-border/30 last:border-b-0 ${
                            snapshot.isDraggingOver
                              ? 'bg-primary/15'
                              : hasMayday
                              ? 'bg-red-500/10'
                              : isRoof
                              ? 'bg-amber-500/5'
                              : isBasement
                              ? 'bg-slate-700/30'
                              : idx % 2 === 0
                              ? 'bg-secondary/20'
                              : 'bg-secondary/10'
                          }`}
                          style={{ minHeight: 64 }}
                        >
                          {floorUnits.map((unit, uIdx) => (
                            <Draggable
                              key={unit.id}
                              draggableId={unit.id}
                              index={uIdx}
                              isDragDisabled={!onUpdateUnit}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-xs font-mono font-semibold cursor-grab active:cursor-grabbing select-none ${
                                    dragSnapshot.isDragging
                                      ? 'shadow-lg ring-1 ring-primary opacity-90 bg-card'
                                      : statusColors[unit.status] || 'border-border text-foreground'
                                  } bg-card/80`}
                                >
                                  <span className="text-base">{unitTypeIcons[unit.unit_type] || '🚐'}</span>
                                  <span>{unit.unit_name}</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {/* Personnel count if any units */}
                          {floorUnits.length > 0 && (
                            <span className="ml-auto text-xs font-mono font-bold text-muted-foreground/60 pr-1">
                              {floorUnits.reduce((s, u) => s + (u.personnel_count || 0), 0)}p
                            </span>
                          )}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </div>
            </div>

            {/* Unassigned / no-floor drop zone */}
            <div className="mt-3">
              <div className="text-xs font-mono text-muted-foreground/40 mb-1.5">
                UNASSIGNED FLOOR — drag here to clear floor
              </div>
              <Droppable droppableId="__none__" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-wrap gap-1.5 min-h-[48px] rounded border border-dashed p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'border-primary/60 bg-primary/10' : 'border-border/40'
                    }`}
                  >
                    {floorUnits.filter(u => !u.floor?.trim()).map((unit, idx) => (
                      <Draggable
                        key={unit.id}
                        draggableId={unit.id}
                        index={idx}
                        isDragDisabled={!onUpdateUnit}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`flex items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs font-mono cursor-grab active:cursor-grabbing select-none ${
                              dragSnapshot.isDragging ? 'shadow-lg ring-1 ring-primary bg-card' : 'bg-secondary/30 text-muted-foreground'
                            }`}
                          >
                            <span className="text-base">{unitTypeIcons[unit.unit_type] || '🚐'}</span>
                            <span>{unit.unit_name}</span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {floorUnits.filter(u => !u.floor?.trim()).length === 0 && !snapshot.isDraggingOver && (
                      <span className="text-xs font-mono text-muted-foreground/30">all units assigned to a floor</span>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>
        </div>
      )}
    </div>
  );
}