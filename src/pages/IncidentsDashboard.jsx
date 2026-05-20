import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Flame, Clock, MapPin, Shield, Users, Archive, Settings, MessageSquare, BookUser, Trash2, Phone, Camera, X, Check, Loader2 } from 'lucide-react';
import NewIncidentDialog from '@/components/command/NewIncidentDialog';
import CloseIncidentDialog from '@/components/command/CloseIncidentDialog';
import RosterLineup from '@/components/dashboard/RosterLineup';
import CameraCapture from '@/components/shared/CameraCapture';
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

const alarmLabels = {
  '1st_alarm': 'Working Fire',
  '2nd_alarm': '2nd Alarm',
  '3rd_alarm': '3rd Alarm',
  '4th_alarm': '4th Alarm',
  '5th_alarm': '5th Alarm',
  'task_force': 'Task Force',
  'strike_team': 'Strike Team',
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
  const [quickPhotos, setQuickPhotos] = useState([]); // captured but not yet attached
  const [attachingPhoto, setAttachingPhoto] = useState(null); // { file, preview }
  const [uploading, setUploading] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const queryClient = useQueryClient();

  const activeIncidents = [];  // will be populated from query below

  const handleQuickPhoto = (files) => {
    if (!files.length) return;
    const file = files[0];
    const preview = URL.createObjectURL(file);
    setAttachingPhoto({ file, preview });
  };

  const savePhotoToIncident = async (incidentId) => {
    if (!attachingPhoto) return;
    setUploading(true);
    try {
      const upload = await base44.integrations.Core.UploadFile({ file: attachingPhoto.file });
      await base44.entities.Contact.create({
        incident_id: incidentId,
        category: 'photo',
        name: `Quick Photo — ${new Date().toLocaleTimeString()}`,
        notes: upload.file_url,
      });
      setSavedNotice('Photo saved to incident.');
      setTimeout(() => setSavedNotice(''), 3000);
    } catch (e) {
      setSavedNotice('Upload failed — try again.');
      setTimeout(() => setSavedNotice(''), 3000);
    }
    setUploading(false);
    setAttachingPhoto(null);
  };

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

  const { data: activeIncidentList = [] } = useQuery({
    queryKey: ['incidents-active'],
    queryFn: () => base44.entities.Incident.filter({ status: 'active' }, '-created_date'),
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
    mutationFn: async (data) => {
      const { _template, ...incidentData } = data;
      const incident = await base44.entities.Incident.create(incidentData);
      if (_template?.units?.length > 0) {
        await base44.entities.Unit.bulkCreate(
          _template.units.map(u => ({
            ...u,
            incident_id: incident.id,
            floor: u.floor || undefined,
            on_scene_time: new Date().toISOString(),
          }))
        );
      }
      return incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-all'] });
      queryClient.invalidateQueries({ queryKey: ['unit-counts'] });
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

  const deleteIncident = useMutation({
    mutationFn: (id) => base44.entities.Incident.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-all'] });
      queryClient.invalidateQueries({ queryKey: ['unit-counts'] });
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
          <Link to="/roster">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <BookUser className="w-4 h-4" /> Roster
            </Button>
          </Link>
          <Link to="/terminology">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <MessageSquare className="w-4 h-4" /> Terminology
            </Button>
          </Link>
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

      <div className="px-6 py-6 max-w-7xl mx-auto">
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

        {/* Main content: incidents + roster sidebar */}
        <div className="flex gap-6">
          {/* Incidents List */}
          <div className="flex-1 min-w-0">
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
                            {alarmLabels[incident.alarm_level] || incident.alarm_level || 'Unknown'}
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
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <Link to={`/incident/${incident.id}`}>
                            <Button size="sm" className="text-xs gap-1" variant={incident.status === 'cleared' ? 'outline' : 'default'}>
                              {incident.status === 'cleared' ? 'View' : 'Open Board'}
                            </Button>
                          </Link>
                          <Link to={`/incident/${incident.id}/contacts`}>
                            <Button size="sm" variant="outline" className="text-xs gap-1">
                              <Phone className="w-3.5 h-3.5" /> Contacts
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs gap-1 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                            onClick={() => { if (window.confirm('Delete this incident? This cannot be undone.')) deleteIncident.mutate(incident.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        {incident.status !== 'cleared' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 w-full"
                            onClick={() => setClosingIncident(incident)}
                          >
                            <Archive className="w-3.5 h-3.5" /> Close Incident
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today's Roster Sidebar */}
          <div className="w-96 shrink-0">
            <RosterLineup />
          </div>
        </div>
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

      {/* ── Floating quick-camera FAB ── */}
      <div className="fixed bottom-6 right-6 z-50">
        {savedNotice && (
          <div className="absolute bottom-20 right-0 bg-card border border-border rounded-lg px-4 py-2.5 text-xs font-mono text-foreground shadow-lg flex items-center gap-2 whitespace-nowrap">
            <Check className="w-3.5 h-3.5 text-green-400" /> {savedNotice}
          </div>
        )}
        <div className="relative">
          <input
            type="file"
            id="fab-camera-input"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleQuickPhoto(files);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => {
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (isMobile) {
                document.getElementById('fab-camera-input').click();
              } else {
                document.getElementById('fab-camera-input').click();
              }
            }}
            className="w-16 h-16 rounded-full bg-primary shadow-2xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all border-4 border-background"
            title="Quick Photo"
          >
            <Camera className="w-7 h-7 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* ── Photo attach modal ── */}
      {attachingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
              <span className="text-sm font-mono font-bold text-foreground">Attach Photo</span>
              <button onClick={() => setAttachingPhoto(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview */}
            <div className="p-4">
              <img
                src={attachingPhoto.preview}
                alt="Captured"
                className="w-full max-h-48 object-contain rounded-lg border border-border bg-secondary/20"
              />
            </div>

            {/* Attach to incident */}
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs font-mono text-muted-foreground">Attach to an active incident:</p>
              {activeIncidentList.length === 0 ? (
                <p className="text-xs font-mono text-muted-foreground italic">No active incidents.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeIncidentList.map(inc => (
                    <button
                      key={inc.id}
                      onClick={() => savePhotoToIncident(inc.id)}
                      disabled={uploading}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors font-mono text-sm flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-foreground truncate">
                        {inc.command_name || inc.address}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {inc.address !== (inc.command_name || inc.address) ? inc.address : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {uploading && (
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                </div>
              )}
              <button
                onClick={() => setAttachingPhoto(null)}
                className="w-full text-center text-xs font-mono text-muted-foreground hover:text-foreground pt-1"
              >
                Discard photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}