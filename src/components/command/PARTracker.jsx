import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';

export default function PARTracker({ units, onRequestPAR }) {
  const workingUnits = units.filter(u =>
    ['on_scene', 'working', 'par'].includes(u.status)
  );

  const getParStatus = (unit) => {
    if (!unit.last_par_time) return 'none';
    const diff = Date.now() - new Date(unit.last_par_time).getTime();
    if (diff < 10 * 60 * 1000) return 'good';
    if (diff < 15 * 60 * 1000) return 'warning';
    return 'overdue';
  };

  const parStyles = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    overdue: 'text-red-400',
    none: 'text-muted-foreground',
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-secondary/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-chart-1" />
          <h3 className="text-sm font-bold font-mono tracking-wider text-foreground uppercase">
            PAR Accountability
          </h3>
        </div>
        <Button size="sm" variant="outline" onClick={onRequestPAR} className="text-xs">
          Request All PAR
        </Button>
      </div>
      <div className="p-3 space-y-2">
        {workingUnits.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground/50">
            No working units
          </div>
        )}
        {workingUnits.map(unit => {
          const parStatus = getParStatus(unit);
          return (
            <div key={unit.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-secondary/30">
              <span className="font-mono text-xs font-medium text-foreground">{unit.unit_name}</span>
              <div className="flex items-center gap-2">
                {unit.last_par_time ? (
                  <span className={`text-[10px] font-mono flex items-center gap-1 ${parStyles[parStatus]}`}>
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNowStrict(new Date(unit.last_par_time), { addSuffix: true })}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">No PAR</span>
                )}
                {parStatus === 'overdue' && (
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}