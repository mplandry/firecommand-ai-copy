import React from 'react';
import { Badge } from '@/components/ui/badge';

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
  working: 'text-blue-400', on_scene: 'text-green-400',
  par: 'text-green-300', mayday: 'text-red-400',
  rehab: 'text-purple-400',
};

export default function FloorTracker({ units }) {
  const unitsWithFloor = units.filter(u => u.floor && u.floor.trim());

  // Group by floor
  const byFloor = {};
  unitsWithFloor.forEach(u => {
    if (!byFloor[u.floor]) byFloor[u.floor] = [];
    byFloor[u.floor].push(u);
  });

  // Sort floors top-to-bottom
  const sortedFloors = [
    ...FLOOR_ORDER.filter(f => byFloor[f]),
    ...Object.keys(byFloor).filter(f => !FLOOR_ORDER.includes(f)).sort(),
  ];

  if (unitsWithFloor.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-3">
        <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase mb-2">
          Floor Accountability
        </h3>
        <p className="text-xs text-muted-foreground/50 font-mono text-center py-2">
          No units assigned to a floor yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <h3 className="text-xs font-bold font-mono tracking-wider text-muted-foreground uppercase mb-3">
        Floor Accountability
      </h3>
      <div className="flex flex-col gap-1.5">
        {sortedFloors.map(floor => {
          const floorUnits = byFloor[floor];
          const hasMayday = floorUnits.some(u => u.status === 'mayday');
          return (
            <div
              key={floor}
              className={`border rounded-md px-2.5 py-2 ${hasMayday ? 'border-red-500/60 bg-red-500/5 animate-pulse' : 'border-border bg-secondary/30'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold font-mono tracking-wider uppercase ${hasMayday ? 'text-red-400' : 'text-cyan-400'}`}>
                  ▲ {floor}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {floorUnits.reduce((sum, u) => sum + (u.personnel_count || 0), 0)} personnel
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {floorUnits.map(u => (
                  <div key={u.id} className="flex items-center gap-1">
                    <span className="text-[10px]">{unitTypeIcons[u.unit_type] || '🚐'}</span>
                    <span className={`text-[10px] font-mono font-semibold ${statusColors[u.status] || 'text-foreground'}`}>
                      {u.unit_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}