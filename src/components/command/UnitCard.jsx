import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, AlertTriangle, Wind } from 'lucide-react';

const statusStyles = {
  dispatched: 'border-l-yellow-500 bg-yellow-500/5',
  responding: 'border-l-yellow-400 bg-yellow-400/5',
  on_scene: 'border-l-green-500 bg-green-500/5',
  working: 'border-l-blue-500 bg-blue-500/5',
  par: 'border-l-green-400 bg-green-400/5',
  mayday: 'border-l-red-600 bg-red-600/10',
  available: 'border-l-gray-500 bg-gray-500/5',
  rehab: 'border-l-purple-500 bg-purple-500/5',
  out_of_service: 'border-l-gray-700 bg-gray-700/5',
};

const statusBadgeColors = {
  dispatched: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  responding: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  on_scene: 'bg-green-600/20 text-green-400 border-green-600/30',
  working: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  par: 'bg-green-500/20 text-green-300 border-green-500/30',
  mayday: 'bg-red-600/30 text-red-300 border-red-500/50',
  available: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
  rehab: 'bg-purple-600/20 text-purple-400 border-purple-600/30',
  out_of_service: 'bg-gray-800/20 text-gray-500 border-gray-700/30',
};

const unitTypeIcons = {
  engine: '🚒',
  truck: '🪜',
  rescue: '🚑',
  squad: '🔧',
  battalion: '⭐',
  medic: '🏥',
  tanker: '💧',
  brush: '🌿',
  hazmat: '☣️',
  other: '🚐',
};

export default function UnitCard({ unit, onStatusChange, onEdit }) {
  const [airElapsed, setAirElapsed] = useState(null);

  useEffect(() => {
    if (!unit.air_time) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(unit.air_time).getTime();
      const m = Math.floor(diff / 60000);
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setAirElapsed(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [unit.air_time]);

  const isMayday = unit.status === 'mayday';

  return (
    <div
      className={`border-l-4 rounded-md px-3 py-2 cursor-pointer transition-all hover:brightness-110 ${statusStyles[unit.status] || 'border-l-gray-500 bg-secondary/50'} ${isMayday ? 'animate-pulse-red ring-1 ring-red-500/50' : ''}`}
      onClick={() => onEdit?.(unit)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{unitTypeIcons[unit.unit_type] || '🚐'}</span>
          <span className="font-mono font-bold text-sm text-foreground truncate">
            {unit.unit_name}
          </span>
        </div>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusBadgeColors[unit.status] || ''}`}>
          {unit.status === 'out_of_service' ? 'OOS' : unit.status?.toUpperCase().replace('_', ' ')}
        </Badge>
      </div>

      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
        {unit.personnel_count > 0 && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {unit.personnel_count}
          </span>
        )}
        {unit.floor && (
          <span className="flex items-center gap-1 font-mono text-cyan-400 font-semibold">
            ▲ {unit.floor}
          </span>
        )}
        {unit.air_time && airElapsed && (
          <span className="flex items-center gap-1 text-accent font-mono">
            <Wind className="w-3 h-3" /> {airElapsed}
          </span>
        )}
        {unit.officer && (
          <span className="truncate">{unit.officer}</span>
        )}
      </div>

      {unit.personnel?.length > 0 && (
        <div className="mt-1 text-[10px] font-mono text-muted-foreground/70 truncate">
          {unit.personnel.join(' · ')}
        </div>
      )}

      {isMayday && (
        <div className="mt-1.5 flex items-center gap-1 text-red-400 text-xs font-bold">
          <AlertTriangle className="w-3.5 h-3.5" />
          MAYDAY — MAYDAY — MAYDAY
        </div>
      )}
    </div>
  );
}