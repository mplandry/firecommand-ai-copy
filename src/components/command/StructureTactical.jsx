import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, ChevronDown } from 'lucide-react';

const SIDE_CONFIG = {
  division_a: { label: 'Alpha', short: 'A', color: 'border-blue-500 bg-blue-500/10 text-blue-300', ring: 'ring-blue-500' },
  division_b: { label: 'Bravo', short: 'B', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-300', ring: 'ring-yellow-500' },
  division_c: { label: 'Charlie', short: 'C', color: 'border-orange-500 bg-orange-500/10 text-orange-300', ring: 'ring-orange-500' },
  division_d: { label: 'Delta', short: 'D', color: 'border-purple-500 bg-purple-500/10 text-purple-300', ring: 'ring-purple-500' },
};

function UnitPicker({ assignment, units, allUnits, onAssign, onRemove }) {
  const [open, setOpen] = useState(false);
  const cfg = SIDE_CONFIG[assignment];

  // Units not already on a division side
  const available = allUnits.filter(u =>
    !['division_a', 'division_b', 'division_c', 'division_d'].includes(u.assignment) ||
    u.assignment === assignment
  ).filter(u => u.assignment !== assignment);

  return (
    <div className="relative">
      {/* Assigned units list */}
      <div className="flex flex-wrap gap-1 justify-center mb-1">
        {units.map(u => (
          <span
            key={u.id}
            className={`inline-flex items-center gap-0.5 text-[9px] font-mono px-1 py-0.5 rounded border ${cfg.color} cursor-pointer hover:opacity-80`}
            onClick={() => onRemove(u)}
            title="Click to remove"
          >
            {u.unit_name}
            <X className="w-2 h-2 opacity-60" />
          </span>
        ))}
      </div>

      {/* Add button */}
      {available.length > 0 && (
        <div className="relative flex justify-center">
          <button
            onClick={() => setOpen(o => !o)}
            className={`text-[8px] font-mono opacity-50 hover:opacity-100 flex items-center gap-0.5 transition-opacity ${cfg.color.split(' ')[2]}`}
          >
            + assign <ChevronDown className="w-2 h-2" />
          </button>
          {open && (
            <div className="absolute top-full mt-1 z-50 bg-popover border border-border rounded shadow-lg py-1 min-w-[100px] max-h-40 overflow-y-auto">
              {available.map(u => (
                <button
                  key={u.id}
                  className="w-full text-left px-2 py-1 text-[10px] font-mono hover:bg-secondary text-foreground"
                  onClick={() => { onAssign(u); setOpen(false); }}
                >
                  {u.unit_name}
                  <span className="ml-1 text-muted-foreground opacity-60">{u.assignment?.replace('_', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidePanel({ assignment, units, allUnits, onAssign, onRemove, className }) {
  const cfg = SIDE_CONFIG[assignment];
  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded border ${cfg.color} ${className}`}>
      <span className="text-[9px] font-bold font-mono tracking-widest uppercase opacity-70">
        {cfg.label}
      </span>
      <UnitPicker
        assignment={assignment}
        units={units}
        allUnits={allUnits}
        onAssign={onAssign}
        onRemove={onRemove}
      />
    </div>
  );
}

export default function StructureTactical({ units, onUpdateUnit }) {
  const getSide = (a) => units.filter(u => u.assignment === a);

  const handleAssign = (unit, assignment) => {
    if (onUpdateUnit) onUpdateUnit(unit, { assignment });
  };

  const handleRemove = (unit) => {
    if (onUpdateUnit) onUpdateUnit(unit, { assignment: 'unassigned' });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase mb-3">
        Structure Tactical
      </h3>

      <div className="flex flex-col items-stretch gap-1">

        {/* Charlie — top (rear) */}
        <SidePanel
          assignment="division_c"
          units={getSide('division_c')}
          allUnits={units}
          onAssign={(u) => handleAssign(u, 'division_c')}
          onRemove={handleRemove}
        />

        {/* Middle row: Bravo | Building | Delta */}
        <div className="flex items-stretch gap-1">
          <SidePanel
            assignment="division_b"
            units={getSide('division_b')}
            allUnits={units}
            onAssign={(u) => handleAssign(u, 'division_b')}
            onRemove={handleRemove}
            className="flex-1"
          />

          {/* Building footprint */}
          <div className="flex-shrink-0 w-[90px] bg-secondary/60 border-2 border-border rounded flex flex-col items-center justify-center gap-1 relative py-3">
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
              <span className="text-[7px] font-mono text-muted-foreground/50 tracking-widest">FRONT</span>
            </div>
            <div className="text-[8px] font-mono text-muted-foreground/40">▲</div>
            <div className="text-[10px] font-bold font-mono text-muted-foreground/60">BLDG</div>
            {units.filter(u => ['interior', 'roof'].includes(u.assignment)).length > 0 && (
              <div className="flex flex-wrap gap-0.5 justify-center px-1">
                {units.filter(u => ['interior', 'roof'].includes(u.assignment)).map(u => (
                  <span key={u.id} className="text-[7px] font-mono bg-red-500/20 border border-red-500/40 text-red-300 rounded px-0.5">
                    {u.unit_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <SidePanel
            assignment="division_d"
            units={getSide('division_d')}
            allUnits={units}
            onAssign={(u) => handleAssign(u, 'division_d')}
            onRemove={handleRemove}
            className="flex-1"
          />
        </div>

        {/* Alpha — bottom (front/address) */}
        <SidePanel
          assignment="division_a"
          units={getSide('division_a')}
          allUnits={units}
          onAssign={(u) => handleAssign(u, 'division_a')}
          onRemove={handleRemove}
        />

      </div>
    </div>
  );
}