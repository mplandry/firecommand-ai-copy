import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import UnitCard from './UnitCard';
import RITQuickInput from './RITQuickInput';

const divisionConfig = {
  division_a:   { label: 'ALPHA',      sub: '',         accent: 'border-t-red-500',    dot: 'bg-red-500',    count: 'text-red-400' },
  division_b:   { label: 'BRAVO',      sub: '',         accent: 'border-t-blue-500',   dot: 'bg-blue-500',   count: 'text-blue-400' },
  division_c:   { label: 'CHARLIE',    sub: '',         accent: 'border-t-green-500',  dot: 'bg-green-500',  count: 'text-green-400' },
  division_d:   { label: 'DELTA',      sub: '',         accent: 'border-t-yellow-500', dot: 'bg-yellow-500', count: 'text-yellow-400' },
  roof:         { label: 'ROOF',       sub: '',         accent: 'border-t-orange-500', dot: 'bg-orange-500', count: 'text-orange-400' },
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

const STATION_GROUPS = [
  { label: 'CENTRAL ST.', units: ['WAL Engine 2', 'WAL Rescue 1', 'WAL Tower 1'] },
  { label: 'MOODY ST.',   units: ['WAL Engine 1', 'WAL Squad 5', 'WAL Ladder 2'] },
];
const LOW_PRIORITY_UNITS = ['WAL Moody Boat', 'WAL Central Boat', 'WAL RTV'];
const ALL_STATION_UNITS = STATION_GROUPS.flatMap(g => g.units);

export default function DivisionColumn({ assignment, units, onEditUnit, onUpdateUnit, allUnits = [] }) {
  const cfg = divisionConfig[assignment] || divisionConfig.unassigned;
  const isEmpty = units.length === 0;
  const isRITEmpty = assignment === 'rit' && isEmpty;

  const handleAssignToRIT = (unitId) => {
    const unit = allUnits.find(u => u.id === unitId);
    if (!unit) return;
    // If a direct update handler is available, use it to move unit to RIT immediately
    if (onUpdateUnit) {
      onUpdateUnit(unit.id, { assignment: 'rit', status: 'working' });
    } else if (onEditUnit) {
      onEditUnit({ ...unit, assignment: 'rit' });
    }
  };

  return (
    <div className={`flex flex-col bg-card/80 border border-border/60 rounded-xl overflow-hidden border-t-2 ${cfg.accent} backdrop-blur-sm ${isRITEmpty ? 'animate-flash-contrast' : ''}`}>
      {/* Header */}
      <div className="px-3 py-3 bg-secondary/30 border-b border-border/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0 ${isRITEmpty ? 'animate-pulse-red' : ''}`} />
          <div className="min-w-0">
            <div className={`text-xl font-mono font-bold tracking-widest ${isRITEmpty ? 'text-red-400' : 'text-foreground'}`}>{cfg.label}</div>
            {cfg.sub && <div className="text-[11px] font-mono tracking-widest text-muted-foreground/60">{isRITEmpty ? 'UNASSIGNED' : cfg.sub}</div>}
          </div>
        </div>
        {isRITEmpty ? (
          <span className="text-xs font-mono font-bold text-red-400 tracking-widest animate-pulse-red">NEEDED</span>
        ) : units.length > 0 && (
          <span className={`text-sm font-mono font-bold ${cfg.count} bg-secondary rounded-md px-2 py-0.5`}>
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
              <div className="h-full flex items-center justify-center py-6 px-2">
                {isRITEmpty ? (
                  <RITQuickInput units={allUnits} onAssignUnit={handleAssignToRIT} />
                ) : (
                  <span className="text-xs font-mono text-muted-foreground/30 tracking-wider">CLEAR</span>
                )}
              </div>
            ) : (() => {
              // For unassigned: render with station group labels; otherwise plain list
              if (assignment !== 'unassigned') {
                return units.map((unit, index) => (
                  <Draggable key={unit.id} draggableId={unit.id} index={index} isDragDisabled={!onEditUnit}>
                    {(dp, ds) => (
                      <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}
                        className={`transition-opacity duration-150 ${ds.isDragging ? 'opacity-80 shadow-2xl' : ''}`}>
                        <UnitCard unit={unit} onEdit={onEditUnit} />
                      </div>
                    )}
                  </Draggable>
                ));
              }

              const elements = [];
              let dragIdx = 0;

              const renderUnit = (unit) => {
                const idx = dragIdx++;
                return (
                  <Draggable key={unit.id} draggableId={unit.id} index={idx} isDragDisabled={!onEditUnit}>
                    {(dp, ds) => (
                      <div ref={dp.innerRef} {...dp.draggableProps} {...dp.dragHandleProps}
                        className={`transition-opacity duration-150 ${ds.isDragging ? 'opacity-80 shadow-2xl' : ''}`}>
                        <UnitCard unit={unit} onEdit={onEditUnit} />
                      </div>
                    )}
                  </Draggable>
                );
              };

              const stationLabel = (label) => (
                <div key={`lbl-${label}`} className="px-1 pt-2 pb-0.5">
                  <span className="text-[9px] font-mono font-bold text-muted-foreground/40 uppercase tracking-widest block border-b border-border/20 pb-0.5">
                    {label}
                  </span>
                </div>
              );

              // Render each station group
              STATION_GROUPS.forEach(group => {
                const groupUnits = group.units
                  .map(name => units.find(u => u.unit_name === name))
                  .filter(Boolean);
                if (groupUnits.length === 0) return;
                elements.push(stationLabel(group.label));
                groupUnits.forEach(u => elements.push(renderUnit(u)));
              });

              // Other units not in any station group and not low priority — sorted by number
              const otherUnits = units
                .filter(u =>
                  !ALL_STATION_UNITS.includes(u.unit_name) &&
                  !LOW_PRIORITY_UNITS.includes(u.unit_name)
                )
                .sort((a, b) => {
                  const numA = parseInt((a.unit_name.match(/\d+/) || [0])[0]);
                  const numB = parseInt((b.unit_name.match(/\d+/) || [0])[0]);
                  return numA - numB;
                });
              if (otherUnits.length > 0) {
                elements.push(stationLabel('OTHER'));
                otherUnits.forEach(u => elements.push(renderUnit(u)));
              }

              // Low priority at very bottom
              const lowUnits = LOW_PRIORITY_UNITS
                .map(name => units.find(u => u.unit_name === name))
                .filter(Boolean);
              if (lowUnits.length > 0) {
                elements.push(stationLabel('WATER / SPECIAL'));
                lowUnits.forEach(u => elements.push(renderUnit(u)));
              }

              return elements;
            })()}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}