import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FLOOR_ORDER = [
  'Roof',
  '8th Floor', '7th Floor', '6th Floor', '5th Floor',
  '4th Floor', '3rd Floor', '2nd Floor', '1st Floor',
  'Basement',
];

const unitTypeIcons = {
  engine: '🚒', truck: '🪜', rescue: '🚑', squad: '🔧',
  battalion: '⭐', medic: '🏥', tanker: '💧', brush: '🌿',
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
const BASE_FLOORS = ['Roof', '2nd Floor', '1st Floor', 'Basement'];

export default function FloorTracker({ units, onUpdateUnit }) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Group by floor
  const byFloor = {};
  units.forEach(u => {
    const floor = u.floor?.trim() || null;
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
      onUpdateUnit(unit, { floor: targetFloor });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase">
          Floor Accountability
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground">
            {units.filter(u => u.floor).length} tracked
          </span>
          {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          {/* Show all toggle */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-muted-foreground/50">
              Drag units between floors
            </span>
            <button
              onClick={() => setShowAll(s => !s)}
              className="text-[9px] font-mono text-primary hover:underline"
            >
              {showAll ? 'show fewer' : 'show all floors'}
            </button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Building cross-section */}
            <div className="flex gap-2">
              {/* Floor labels column */}
              <div className="flex flex-col" style={{ gap: 4 }}>
                {visibleFloors.map(floor => {
                  const isRoof = floor === 'Roof';
                  const isBasement = floor === 'Basement';
                  return (
                    <div
                      key={floor}
                      className="flex items-center justify-end"
                      style={{ height: 44 }}
                    >
                      <span className={`text-[8px] font-mono font-bold tracking-wider pr-1.5 whitespace-nowrap ${
                        isRoof || isBasement ? 'text-amber-400/70' : 'text-cyan-400/60'
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
                          className={`flex items-center px-1.5 gap-1 transition-colors border-b border-border/30 last:border-b-0 ${
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
                          style={{ minHeight: 44 }}
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
                                  className={`flex items-center gap-0.5 rounded border px-1 py-0.5 text-[9px] font-mono font-semibold cursor-grab active:cursor-grabbing select-none ${
                                    dragSnapshot.isDragging
                                      ? 'shadow-lg ring-1 ring-primary opacity-90 bg-card'
                                      : statusColors[unit.status] || 'border-border text-foreground'
                                  } bg-card/80`}
                                >
                                  <span>{unitTypeIcons[unit.unit_type] || '🚐'}</span>
                                  <span>{unit.unit_name}</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {/* Personnel count if any units */}
                          {floorUnits.length > 0 && (
                            <span className="ml-auto text-[8px] font-mono text-muted-foreground/50 pr-0.5">
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
            <div className="mt-2">
              <div className="text-[8px] font-mono text-muted-foreground/40 mb-1">
                UNASSIGNED FLOOR — drag here to clear floor
              </div>
              <Droppable droppableId="__none__" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-wrap gap-1 min-h-[36px] rounded border border-dashed p-1.5 transition-colors ${
                      snapshot.isDraggingOver ? 'border-primary/60 bg-primary/10' : 'border-border/40'
                    }`}
                  >
                    {units.filter(u => !u.floor?.trim()).map((unit, idx) => (
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
                            className={`flex items-center gap-0.5 rounded border border-border px-1 py-0.5 text-[9px] font-mono cursor-grab active:cursor-grabbing select-none ${
                              dragSnapshot.isDragging ? 'shadow-lg ring-1 ring-primary bg-card' : 'bg-secondary/30 text-muted-foreground'
                            }`}
                          >
                            <span>{unitTypeIcons[unit.unit_type] || '🚐'}</span>
                            <span>{unit.unit_name}</span>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {units.filter(u => !u.floor?.trim()).length === 0 && !snapshot.isDraggingOver && (
                      <span className="text-[8px] font-mono text-muted-foreground/30">all units assigned to a floor</span>
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