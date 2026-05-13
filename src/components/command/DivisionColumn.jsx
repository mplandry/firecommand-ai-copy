import React from 'react';
import UnitCard from './UnitCard';

const divisionLabels = {
  division_a: 'DIVISION A (ALPHA)',
  division_b: 'DIVISION B (BRAVO)',
  division_c: 'DIVISION C (CHARLIE)',
  division_d: 'DIVISION D (DELTA)',
  roof: 'ROOF DIVISION',
  interior: 'INTERIOR',
  rit: 'RIT / IRIC',
  rehab: 'REHAB',
  water_supply: 'WATER SUPPLY',
  ventilation: 'VENTILATION',
  search: 'SEARCH & RESCUE',
  medical: 'MEDICAL GROUP',
  exposure: 'EXPOSURE',
  staging: 'STAGING',
  unassigned: 'UNASSIGNED',
};

const divisionColors = {
  division_a: 'border-t-red-500',
  division_b: 'border-t-blue-500',
  division_c: 'border-t-green-500',
  division_d: 'border-t-yellow-500',
  roof: 'border-t-orange-500',
  interior: 'border-t-red-400',
  rit: 'border-t-red-600',
  rehab: 'border-t-purple-500',
  water_supply: 'border-t-cyan-500',
  ventilation: 'border-t-amber-500',
  search: 'border-t-pink-500',
  medical: 'border-t-emerald-500',
  exposure: 'border-t-indigo-500',
  staging: 'border-t-gray-500',
  unassigned: 'border-t-gray-600',
};

export default function DivisionColumn({ assignment, units, onEditUnit }) {
  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden border-t-2 ${divisionColors[assignment] || 'border-t-gray-500'}`}>
      <div className="px-3 py-2 bg-secondary/50 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase">
            {divisionLabels[assignment] || assignment}
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            {units.length}
          </span>
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[80px]">
        {units.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground/50 italic">
            No units assigned
          </div>
        )}
        {units.map(unit => (
          <UnitCard key={unit.id} unit={unit} onEdit={onEditUnit} />
        ))}
      </div>
    </div>
  );
}