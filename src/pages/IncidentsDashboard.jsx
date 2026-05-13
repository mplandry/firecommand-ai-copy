import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Flame, Clock, MapPin, Shield, Users, Archive, Settings } from 'lucide-react';
import NewIncidentDialog from '@/components/command/NewIncidentDialog';
import CloseIncidentDialog from '@/components/command/CloseIncidentDialog';
import { formatDistanceToNow } from 'date-fns';

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

const typeLabels = {
  structure_fire: 'Structure Fire',
  wildland_fire: 'Wildland Fire',
  vehicle_fire: 'Vehicle Fire',
  hazmat: 'HazMat',
  rescue: 'Rescue',
  mci: 'MCI',
  other: 'Other',
};

export default function IncidentsDashboard() {
  const [showNew, setShowNew] = useState(false);
  const [closingIncident, setClosingIncident] = useState(null);
  const [filter, setFilter] = useState('active');
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents-all', filter],
    queryFn: () => {
      if (filter === 'active') {
        return base44.entities.Incident.filter({ status: 'active' }, '-created_date');
      } else if (filter === 'all') {
        return base44.entities.Incident.list('-created_date', 50);
      } else {
        return base44.entities.Incident.filter({ status: 'cleared' }, '-created_date', 50);
      }
    },
  });

  const { data: unitCounts = {} } = useQuery({
    queryKey: ['unit-counts'],
    queryFn: async () => {
      const allUnits = await base44.entities.Unit.list('-created_date', 500);
      return allUnits.reduce((acc, u) => {
        acc[u.incident_id] = (acc[u.incident_id] || 0) + 1;
        return acc;
      }, {});
    },
  });

  const createIncident = useMutation({
    mutationFn: (data) => base44.entities.Incident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-all'] });
      setShowNew(false);
    },
  });

  const closeIncident = useMutation({
    mutationFn: ({ id, notes }) =>
      base44.entities.Incident.update(id, { status: 'cleared', notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-all'] });
      setClosingIncident(null);
    },
  });

  const activeCount = incidents.filter(i => i.status === 'active').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-bold font-mono text-foreground tracking-wide">FIREGROUND COMMAND</h1>
            <p className="text-xs text-muted-foreground font-mono">Incident Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/settings">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <Settings className="w-4 h-4" /> Settings
            </Button>
          </Link>
          <Button onClick={() => setShowNew(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Incident
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Active Incidents</p>
            <p className="text-3xl font-bold font-mono text-red-500">
              {incidents.filter(i => i.status === 'active').length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Units Deployed</p>
            <p className="text-3xl font-bold font-mono text-accent">
              {Object.values(unitCounts).reduce((a, b) => a + b, 0)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Total Incidents</p>
            <p className="text-3xl font-bold font-mono text-foreground">{incidents.length}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-1 w-fit">
          {[['active', 'Active'], ['cleared', 'Cleared'], ['all', 'All']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-4 py-1.5 rounded-md text-sm font-mono font-medium transition-colors ${
                filter === val ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Incidents List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground font-mono text-sm">
            Loading...
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Shield className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-mono text-sm">No incidents found</p>
            <Button onClick={() => setShowNew(true)} className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Start New Incident
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge className={statusColors[incident.status] || 'bg-secondary'}>
                        {statusLabels[incident.status] || incident.status}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs">
                        {incident.alarm_level?.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {typeLabels[incident.incident_type] || incident.incident_type}
                      </span>
                    </div>
                    <h2 className="font-bold font-mono text-foreground text-lg">
                      {incident.command_name || incident.address}
                    </h2>
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" /> {incident.address}
                      </span>
                      {incident.ic_name && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Shield className="w-3.5 h-3.5" /> IC: {incident.ic_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {unitCounts[incident.id] || 0} units
                      </span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {incident.started_at
                          ? formatDistanceToNow(new Date(incident.started_at), { addSuffix: true })
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {incident.status !== 'cleared' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1"
                        onClick={() => setClosingIncident(incident)}
                      >
                        <Archive className="w-3.5 h-3.5" /> Close
                      </Button>
                    )}
                    <Link to={`/incident/${incident.id}`}>
                      <Button size="sm" className="text-xs gap-1" variant={incident.status === 'cleared' ? 'outline' : 'default'}>
                        {incident.status === 'cleared' ? 'View' : 'Open Board'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewIncidentDialog
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={(data) => createIncident.mutate(data)}
      />

      <CloseIncidentDialog
        incident={closingIncident}
        open={!!closingIncident}
        onClose={() => setClosingIncident(null)}
        onConfirm={(notes) => closeIncident.mutate({ id: closingIncident.id, notes })}
      />
    </div>
  );
}