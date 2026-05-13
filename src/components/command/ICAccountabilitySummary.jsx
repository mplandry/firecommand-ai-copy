import React from 'react';
import { Users, Layers, AlertTriangle, Wind, ShieldCheck } from 'lucide-react';

const ACTIVE_STATUSES = ['on_scene', 'working', 'par', 'rehab'];

const STATUS_COLORS = {
  working:  'text-blue-400',
  on_scene: 'text-green-400',
  par:      'text-green-300',
  rehab:    'text-purple-400',
  mayday:   'text-red-400',
};

export default function ICAccountabilitySummary({ units }) {
  // ── Personnel totals ─────────────────────────────────────────────────────
  const activeUnits = units.filter(u => ACTIVE_STATUSES.includes(u.status));
  const maydayUnits = units.filter(u => u.status === 'mayday');

  const totalPersonnel = units.reduce((sum, u) => {
    const fromList  = u.personnel?.length || 0;
    const fromCount = u.personnel_count   || 0;
    return sum + (fromList > 0 ? fromList : fromCount);
  }, 0);

  const activePersonnel = activeUnits.reduce((sum, u) => {
    const fromList  = u.personnel?.length || 0;
    const fromCount = u.personnel_count   || 0;
    return sum + (fromList > 0 ? fromList : fromCount);
  }, 0);

  const onAirUnits = units.filter(u => u.air_time);

  // ── Units by floor ───────────────────────────────────────────────────────
  const floorMap = {};
  units.forEach(u => {
    if (!u.floor) return;
    if (!floorMap[u.floor]) floorMap[u.floor] = [];
    floorMap[u.floor].push(u);
  });

  const floorOrder = ['Basement', 'Lobby', '1st Floor', '2nd Floor', '3rd Floor',
                       '4th Floor', '5th Floor', 'Roof'];
  const sortedFloors = Object.keys(floorMap).sort((a, b) => {
    const ai = floorOrder.indexOf(a);
    const bi = floorOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // ── Status breakdown ─────────────────────────────────────────────────────
  const statusTally = {};
  units.forEach(u => {
    if (!u.status) return;
    statusTally[u.status] = (statusTally[u.status] || 0) + 1;
  });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-secondary/50 border-b border-border flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold font-mono tracking-wider text-foreground uppercase">
          IC Accountability
        </h3>
      </div>

      {/* MAYDAY banner */}
      {maydayUnits.length > 0 && (
        <div className="px-4 py-2 bg-red-600/20 border-b border-red-500/40 flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-red-300">
            MAYDAY — {maydayUnits.map(u => u.unit_name).join(', ')}
          </span>
        </div>
      )}

      <div className="p-3 space-y-4">
        {/* Personnel totals */}
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Total Personnel" value={totalPersonnel} color="text-foreground" icon={<Users className="w-3.5 h-3.5" />} />
          <StatBox label="Active" value={activePersonnel} color="text-green-400" icon={<Users className="w-3.5 h-3.5" />} />
          <StatBox label="On Air" value={onAirUnits.length} color="text-accent" icon={<Wind className="w-3.5 h-3.5" />} suffix="units" />
        </div>

        {/* Floor tally */}
        {sortedFloors.length > 0 && (
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Units by Floor
            </p>
            <div className="space-y-1">
              {sortedFloors.map(floor => {
                const floorUnits = floorMap[floor];
                const floorPersonnel = floorUnits.reduce((sum, u) => {
                  const fromList  = u.personnel?.length || 0;
                  const fromCount = u.personnel_count   || 0;
                  return sum + (fromList > 0 ? fromList : fromCount);
                }, 0);
                const hasMayday = floorUnits.some(u => u.status === 'mayday');
                return (
                  <div key={floor} className={`flex items-center justify-between px-2.5 py-1.5 rounded ${hasMayday ? 'bg-red-600/15 border border-red-500/30' : 'bg-secondary/40'}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {hasMayday && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                      <span className="font-mono text-xs font-semibold text-cyan-400 shrink-0">▲ {floor}</span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {floorUnits.map(u => u.unit_name).join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {floorUnits.length} unit{floorUnits.length !== 1 ? 's' : ''}
                      </span>
                      {floorPersonnel > 0 && (
                        <span className="text-[10px] font-mono text-green-400 font-semibold">
                          {floorPersonnel} FF
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status breakdown */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
            Unit Status Breakdown
          </p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(statusTally).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between px-2 py-1 rounded bg-secondary/30">
                <span className={`text-[10px] font-mono ${STATUS_COLORS[status] || 'text-muted-foreground'}`}>
                  {status.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="text-xs font-bold font-mono text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color, icon, suffix }) {
  return (
    <div className="bg-secondary/40 rounded-lg px-2 py-2 text-center">
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-mono">
        {icon} {suffix || label}
      </div>
    </div>
  );
}