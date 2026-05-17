import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import UnitCard from './UnitCard';

const divisionConfig = {
  division_a:   { label: 'DIVISION A', sub: 'ALPHA',    accent: 'border-t-red-500',    dot: 'bg-red-500',    count: 'text-red-400' },
  division_b:   { label: 'DIVISION B', sub: 'BRAVO',    accent: 'border-t-blue-500',   dot: 'bg-blue-500',   count: 'text-blue-400' },
  division_c:   { label: 'DIVISION C', sub: 'CHARLIE',  accent: 'border-t-green-500',  dot: 'bg-green-500',  count: 'text-green-400' },
  division_d:   { label: 'DIVISION D', sub: 'DELTA',    accent: 'border-t-yellow-500', dot: 'bg-yellow-500', count: 'text-yellow-400' },
  roof:         { label: 'ROOF',       sub: 'DIVISION', accent: 'border-t-orange-500', dot: 'bg-orange-500', count: 'text-orange-400' },
  interior:     { label: 'INTERIOR',   sub: 'OPS',      accent: 'border-t-red-400',    dot: 'bg-red-400',    count: 'text-red-400' },
  rit:          { label: 'RIT',        sub: 'IRIC',     accent: 'border-t-red-700',    dot: 'bg-red-700',    count: 'text-red-500' },
  rehab:        { label: 'REHAB',      sub: 'SECTOR',   accent: 'border-t-violet-500', dot: 'bg-violet-500', count: 'text-violet-400' },
  water_supply: { label: 'WATER',      sub: 'SUPPLY',   accent: 'border-t-cyan-500',   dot: 'bg-cyan-500',   count: 'text-cyan-400' },
  ventilation:  { label: 'VENTILATION',sub: 'GROUP',    accent: 'border-t-amber-500',  dot: 'bg-amber-500',  count: 'text-amber-400' },
  search:       { label: 'SEARCH',     sub: '& RESCUE', accent: 'border-t-pink-500',   dot: 'bg-pink-500',   count: 'text-pink-400' },
  medical:      { label: 'MEDICAL',    sub: 'GROUP',    accent: 'border-t-emerald-500',dot: 'bg-emerald-500',count: 'text-emerald-400' },
  exposure:     { label: 'EXPOSURE',   sub: 'PROTECT',  accent: 'border-t-indigo-500', dot: 'bg-indigo-500', count: 'text-indigo-400' },
  staging:      { label: 'STAGING',    sub: 'AREA',     accent: 'border-t-slate-400',  dot: 'bg-slate-400',  count: 'text-slate-400' },
  unassigned:   { label: 'UNASSIGNED', sub: 'UNITS',    accent: 'border-t-slate-600',  dot: 'bg-slate-600',  count: 'text-slate-500' },
};

export default function DivisionColumn({ assignment, units, onEditUnit }) {
  const cfg = divisionConfig[assignment] || divisionConfig.unassigned;
  const isEmpty = units.length === 0;
  const isRITEmpty = assignment === 'rit' && isEmpty;

  return (
    <div className={`flex flex-col bg-card/80 border border-border/60 rounded-xl overflow-hidden border-t-2 ${cfg.accent} backdrop-blur-sm ${isRITEmpty ? 'border-destructive animate-flash-contrast' : ''}`}>
      {/* Header */}
      <div className="px-3 py-2.5 bg-secondary/30 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full ${cfg.dot} shrink-0`} />
          <div className="min-w-0">
            <div className="text-[11px] font-mono font-bold tracking-widest text-foreground">{cfg.label}</div>
            <div className="text-[9px] font-mono tracking-widest text-muted-foreground/60">{cfg.sub}</div>
          </div>
        </div>
        {units.length > 0 && (
          <span className={`text-xs font-mono font-bold ${cfg.count} bg-secondary rounded-md px-2 py-0.5`}>
            {units.length}
          </span>
        )}
      </div>

      {/* Units — Droppable zone */}
      <Droppable droppableId={assignment}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`p-2 space-y-1.5 min-h-[90px] flex-1 transition-colors duration-150 ${
              snapshot.isDraggingOver ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
            }`}
          >
            {units.length === 0 && !snapshot.isDraggingOver ? (
              <div className="h-full flex items-center justify-center py-6">
                <span className="text-[10px] font-mono text-muted-foreground/30 tracking-wider">CLEAR</span>
              </div>
            ) : (
              units.map((unit, index) => (
                <Draggable key={unit.id} draggableId={unit.id} index={index} isDragDisabled={!onEditUnit}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={`transition-opacity duration-150 ${dragSnapshot.isDragging ? 'opacity-80 shadow-2xl' : ''}`}
                    >
                      <UnitCard unit={unit} onEdit={onEditUnit} />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}