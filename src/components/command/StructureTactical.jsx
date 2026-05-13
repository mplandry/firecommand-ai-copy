import React from 'react';
import { Badge } from '@/components/ui/badge';

const SIDE_CONFIG = {
  division_a: { label: 'Alpha', short: 'A', position: 'bottom', color: 'border-blue-500 bg-blue-500/10 text-blue-300' },
  division_b: { label: 'Bravo', short: 'B', position: 'left',   color: 'border-yellow-500 bg-yellow-500/10 text-yellow-300' },
  division_c: { label: 'Charlie', short: 'C', position: 'top',  color: 'border-orange-500 bg-orange-500/10 text-orange-300' },
  division_d: { label: 'Delta', short: 'D',  position: 'right', color: 'border-purple-500 bg-purple-500/10 text-purple-300' },
};

function SideUnits({ assignment, units }) {
  const cfg = SIDE_CONFIG[assignment];
  const sideUnits = units.filter(u => u.assignment === assignment);

  return (
    <div className={`flex flex-col items-center gap-1 p-2 min-h-[60px] min-w-[80px] rounded border ${cfg.color}`}>
      <span className="text-[10px] font-bold font-mono tracking-widest uppercase opacity-70">
        {cfg.short} — {cfg.label}
      </span>
      <div className="flex flex-wrap gap-1 justify-center">
        {sideUnits.length === 0 ? (
          <span className="text-[9px] opacity-30 font-mono">empty</span>
        ) : (
          sideUnits.map(u => (
            <Badge key={u.id} variant="outline" className={`text-[9px] font-mono px-1 py-0 ${cfg.color} border`}>
              {u.unit_name}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

export default function StructureTactical({ units }) {
  const aSide = units.filter(u => u.assignment === 'division_a');
  const bSide = units.filter(u => u.assignment === 'division_b');
  const cSide = units.filter(u => u.assignment === 'division_c');
  const dSide = units.filter(u => u.assignment === 'division_d');

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase mb-3">
        Structure Tactical
      </h3>

      {/* Grid: C (top), B left, building center, D right, A (bottom) */}
      <div className="flex flex-col items-center gap-1">

        {/* C Side — Charlie (Rear / top) */}
        <SideUnits assignment="division_c" units={units} />

        {/* Middle row: B | Building | D */}
        <div className="flex items-center gap-1 w-full justify-center">
          <SideUnits assignment="division_b" units={units} />

          {/* Building footprint */}
          <div className="flex-1 max-w-[140px] min-w-[100px] aspect-square bg-secondary/60 border-2 border-border rounded flex flex-col items-center justify-center gap-1 relative">
            {/* Address side marker */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
              <span className="text-[8px] font-mono text-muted-foreground/50 tracking-widest">FRONT</span>
            </div>
            {/* Compass */}
            <div className="text-center">
              <div className="text-[9px] font-mono text-muted-foreground/40">▲</div>
              <div className="text-xs font-bold font-mono text-muted-foreground/50">BLDG</div>
            </div>

            {/* Interior / roof units as small dots */}
            {units.filter(u => ['interior','roof'].includes(u.assignment)).length > 0 && (
              <div className="flex flex-wrap gap-0.5 justify-center px-1 max-w-full">
                {units.filter(u => ['interior','roof'].includes(u.assignment)).map(u => (
                  <span key={u.id} className="text-[8px] font-mono bg-red-500/20 border border-red-500/40 text-red-300 rounded px-0.5">
                    {u.unit_name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <SideUnits assignment="division_d" units={units} />
        </div>

        {/* A Side — Alpha (Front / address side) */}
        <SideUnits assignment="division_a" units={units} />

        {/* Legend */}
        <div className="flex gap-2 flex-wrap justify-center mt-1">
          {Object.entries(SIDE_CONFIG).map(([key, cfg]) => (
            <span key={key} className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cfg.color}`}>
              {cfg.short} = {cfg.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}