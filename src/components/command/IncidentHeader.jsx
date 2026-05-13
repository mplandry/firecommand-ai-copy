import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Radio, AlertTriangle, Shield, MapPin } from 'lucide-react';

const statusColors = {
  active: 'bg-red-600 text-white',
  under_control: 'bg-yellow-600 text-white',
  overhaul: 'bg-blue-600 text-white',
  cleared: 'bg-green-700 text-white',
};

const statusLabels = {
  active: 'ACTIVE',
  under_control: 'UNDER CONTROL',
  overhaul: 'OVERHAUL',
  cleared: 'CLEARED',
};

export default function IncidentHeader({ incident, onStatusChange }) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    if (!incident?.started_at) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(incident.started_at).getTime();
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [incident?.started_at]);

  if (!incident) return null;

  return (
    <div className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold font-mono tracking-wide text-foreground uppercase">
              {incident.command_name || 'Command'}
            </h1>
          </div>
          <Badge className={statusColors[incident.status] || 'bg-secondary'}>
            {statusLabels[incident.status] || incident.status}
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground font-mono">
            {incident.alarm_level?.replace('_', ' ').toUpperCase() || '1ST ALARM'}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-mono">{incident.address}</span>
          </div>
          <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-accent" />
            <span className="font-mono text-lg font-bold text-accent tracking-wider">{elapsed}</span>
          </div>
        </div>
      </div>

      {incident.ic_name && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Radio className="w-3.5 h-3.5" />
          <span>IC: <span className="text-foreground font-medium">{incident.ic_name}</span></span>
        </div>
      )}
    </div>
  );
}