import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Archive, ScanLine, ShieldCheck, Monitor } from 'lucide-react';
import IncidentHeader from '@/components/command/IncidentHeader';
import RosterUploadDialog from '@/components/command/RosterUploadDialog';
import DivisionColumn from '@/components/command/DivisionColumn';
import RadioInput from '@/components/command/RadioInput';
import EditUnitDialog from '@/components/command/EditUnitDialog';
import AddUnitDialog from '@/components/command/AddUnitDialog';
import CloseIncidentDialog from '@/components/command/CloseIncidentDialog';
import ExportIncidentPDF from '@/components/command/ExportIncidentPDF';
import ConnectionStatus from '@/components/command/ConnectionStatus';
import SidePanel from '@/components/command/SidePanel';
import PARAlert from '@/components/command/PARAlert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { enqueue, getCached, setCached, patchCachedUnit, addCachedUnit, addCachedRadioLog } from '@/lib/offlineQueue';

const BOARD_SECTIONS = [
  ['division_a', 'division_b', 'division_c', 'division_d'],
  ['roof', 'interior', 'rit', 'rehab'],
  ['water_supply', 'ventilation', 'search', 'medical'],
  ['staging', 'exposure', 'unassigned'],
];

export default function CommandBoard() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [showClose, setShowClose] = useState(false);
  const [showRosterUpload, setShowRosterUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: incident, isLoading: loadingIncident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: (data) => data?.[0] || null,
    enabled: !!incidentId,
  });

  const { isOnline, pendingCount, replaying, updatePending } = useOnlineStatus(() => {
    queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
    queryClient.invalidateQueries({ queryKey: ['radioLogs', incidentId] });
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', incidentId],
    queryFn: async () => {
      if (!navigator.onLine) return getCached(incidentId).units || [];
      const data = await base44.entities.Unit.filter({ incident_id: incidentId });
      setCached(incidentId, { units: data });
      return data;
    },
    placeholderData: () => getCached(incidentId).units || [],
    enabled: !!incidentId,
    staleTime: 30000,
  });

  const { data: radioLogs = [] } = useQuery({
    queryKey: ['radioLogs', incidentId],
    queryFn: async () => {
      if (!navigator.onLine) return getCached(incidentId).radioLogs || [];
      const data = await base44.entities.RadioLog.filter({ incident_id: incidentId }, '-created_date', 100);
      setCached(incidentId, { radioLogs: data });
      return data;
    },
    placeholderData: () => getCached(incidentId).radioLogs || [],
    enabled: !!incidentId,
    staleTime: 30000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['department'],
    queryFn: () => base44.entities.Department.list(),
  });
  const department = departments[0] || null;

  const createUnit = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data, incident_id: incidentId };
      if (!navigator.onLine) {
        const tempUnit = { ...payload, id: `offline_${Date.now()}`, created_date: new Date().toISOString() };
        enqueue({ type: 'unit_create', data: payload });
        addCachedUnit(incidentId, tempUnit);
        updatePending();
        return tempUnit;
      }
      return base44.entities.Unit.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units', incidentId] }),
  });

  const updateUnit = useMutation({
    mutationFn: async ({ id, data }) => {
      if (!navigator.onLine) {
        enqueue({ type: 'unit_update', id, data });
        patchCachedUnit(incidentId, id, data);
        updatePending();
        return data;
      }
      return base44.entities.Unit.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
      setEditingUnit(null);
    },
  });

  const deleteUnit = useMutation({
    mutationFn: (id) => base44.entities.Unit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
      setEditingUnit(null);
    },
  });

  const createRadioLog = useMutation({
    mutationFn: async (data) => {
      if (!navigator.onLine) {
        const tempLog = { ...data, id: `offline_${Date.now()}`, created_date: new Date().toISOString() };
        enqueue({ type: 'radio_log_create', data });
        addCachedRadioLog(incidentId, tempLog);
        updatePending();
        return tempLog;
      }
      return base44.entities.RadioLog.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['radioLogs', incidentId] }),
  });

  const closeIncident = useMutation({
    mutationFn: ({ notes }) => base44.entities.Incident.update(incidentId, { status: 'cleared', notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents-all'] });
      navigate('/');
    },
  });

  const handleRadioTransmission = async (message, parsed) => {
    await createRadioLog.mutateAsync({
      incident_id: incidentId,
      message,
      timestamp: new Date().toISOString(),
      from_unit: parsed.from_unit || null,
      to_unit: parsed.to_unit || null,
      priority: parsed.priority || 'routine',
      parsed_action: parsed.summary || '',
      auto_applied: true,
    });

    if (parsed.actions?.length > 0) {
      for (const action of parsed.actions) {
        const existingUnit = units.find(u => u.unit_name.toLowerCase() === action.unit_name?.toLowerCase());
        if (existingUnit && action.changes) {
          const updateData = {};
          if (action.changes.status) updateData.status = action.changes.status;
          if (action.changes.assignment) updateData.assignment = action.changes.assignment;
          if (action.changes.floor) updateData.floor = action.changes.floor;
          if (action.changes.set_air_time) updateData.air_time = new Date().toISOString();
          if (action.changes.personnel_count) updateData.personnel_count = action.changes.personnel_count;
          if (action.changes.officer) updateData.officer = action.changes.officer;
          if (action.changes.status === 'on_scene' && !existingUnit.on_scene_time) {
            updateData.on_scene_time = new Date().toISOString();
          }
          if (Object.keys(updateData).length > 0) {
            if (!navigator.onLine) {
              enqueue({ type: 'unit_update', id: existingUnit.id, data: updateData });
              patchCachedUnit(incidentId, existingUnit.id, updateData);
              updatePending();
            } else {
              await base44.entities.Unit.update(existingUnit.id, updateData);
            }
          }
        }
      }
    }

    if (parsed.new_units?.length > 0) {
      for (const newUnit of parsed.new_units) {
        const exists = units.find(u => u.unit_name.toLowerCase() === newUnit.unit_name?.toLowerCase());
        if (!exists) {
          const newUnitPayload = {
            incident_id: incidentId,
            unit_name: newUnit.unit_name,
            unit_type: newUnit.unit_type || 'engine',
            status: newUnit.status || 'dispatched',
            assignment: newUnit.assignment || 'unassigned',
          };
          if (!navigator.onLine) {
            const tempUnit = { ...newUnitPayload, id: `offline_${Date.now()}`, created_date: new Date().toISOString() };
            enqueue({ type: 'unit_create', data: newUnitPayload });
            addCachedUnit(incidentId, tempUnit);
            updatePending();
          } else {
            await base44.entities.Unit.create(newUnitPayload);
          }
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
  };

  const handleImportRoster = async (parsedUnits) => {
    for (const u of parsedUnits) {
      const existing = units.find(e => e.unit_name.toLowerCase() === u.unit_name.toLowerCase());
      const payload = {
        unit_name: u.unit_name,
        unit_type: u.unit_type,
        assignment: u.assignment,
        status: u.status || 'dispatched',
        personnel_count: u.personnel_count || null,
        officer: u.officer || null,
        personnel: u.personnel || [],
        incident_id: incidentId,
      };
      if (existing) {
        await base44.entities.Unit.update(existing.id, payload);
      } else {
        await base44.entities.Unit.create({ ...payload, on_scene_time: new Date().toISOString() });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
  };

  const handleRequestAllPAR = () => {
    const workingUnits = units.filter(u => ['on_scene', 'working', 'par'].includes(u.status));
    const parData = { last_par_time: new Date().toISOString(), status: 'par' };
    workingUnits.forEach(unit => {
      if (!navigator.onLine) { enqueue({ type: 'unit_update', id: unit.id, data: parData }); }
      else { base44.entities.Unit.update(unit.id, parData); }
    });
    if (!navigator.onLine) updatePending();
    queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
  };

  if (loadingIncident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground font-mono mb-4">Incident not found</p>
          <Link to="/"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  const isReadOnly = incident.status === 'cleared';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">

      {/* ── Top Command Bar ── */}
      <header className="shrink-0 bg-card/90 backdrop-blur border-b border-border/60 px-4 py-2.5 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <IncidentHeader incident={incident} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ConnectionStatus isOnline={isOnline} pendingCount={pendingCount} replaying={replaying} />
          <Link to={`/incident/${incidentId}/accountability`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8">
              <ShieldCheck className="w-3.5 h-3.5" /> Accountability
            </Button>
          </Link>
          <Link to={`/incident/${incidentId}/kiosk`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8">
              <Monitor className="w-3.5 h-3.5" /> Kiosk
            </Button>
          </Link>
          {!isReadOnly && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8" onClick={() => setShowRosterUpload(true)}>
              <ScanLine className="w-3.5 h-3.5" /> Roster
            </Button>
          )}
          <ExportIncidentPDF incident={incident} units={units} radioLogs={radioLogs} department={department} />
          {!isReadOnly && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-400/10 h-8" onClick={() => setShowClose(true)}>
              <Archive className="w-3.5 h-3.5" /> Close
            </Button>
          )}
        </div>
      </header>

      {/* ── Cleared Banner ── */}
      {isReadOnly && (
        <div className="shrink-0 bg-emerald-900/20 border-b border-emerald-700/30 px-4 py-1.5 text-center text-xs font-mono text-emerald-400 tracking-wider">
          ● INCIDENT CLOSED — READ ONLY
        </div>
      )}

      {/* ── Radio Input Bar ── */}
      {!isReadOnly && (
        <div className="shrink-0 px-4 py-2.5 bg-secondary/40 border-b border-border/50">
          <RadioInput incidentId={incidentId} units={units} onTransmission={handleRadioTransmission} />
        </div>
      )}

      {/* ── PAR Alert ── */}
      {!isReadOnly && (
        <PARAlert lastRadioLogTime={radioLogs[0]?.created_date} onRequestPAR={handleRequestAllPAR} isReadOnly={isReadOnly} />
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Tactical Board */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase">Tactical Board</span>
              <span className="text-[10px] font-mono text-muted-foreground/50 bg-secondary px-2 py-0.5 rounded-full">{units.length} units</span>
            </div>
            {!isReadOnly && (
              <Button size="sm" onClick={() => setShowAddUnit(true)} className="gap-1.5 text-xs h-7 px-3">
                <Plus className="w-3.5 h-3.5" /> Add Unit
              </Button>
            )}
          </div>

          {BOARD_SECTIONS.map((row, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {row.map(assignment => (
                <DivisionColumn
                  key={assignment}
                  assignment={assignment}
                  units={units.filter(u => u.assignment === assignment)}
                  onEditUnit={isReadOnly ? null : setEditingUnit}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-[460px] xl:w-[500px] shrink-0 border-l border-border/50 flex flex-col overflow-hidden bg-card/40">
          <SidePanel
            units={units}
            radioLogs={radioLogs}
            isReadOnly={isReadOnly}
            onUpdateUnit={(unit, data) => updateUnit.mutate({ id: unit.id, data })}
            onRequestPAR={handleRequestAllPAR}
            onMarkUnitPAR={(unit) => updateUnit.mutate({ id: unit.id, data: { status: 'par', last_par_time: new Date().toISOString() } })}
          />
        </div>
      </div>

      {!isReadOnly && (
        <>
          <AddUnitDialog
            open={showAddUnit}
            onClose={() => setShowAddUnit(false)}
            onCreate={(data) => {
              createUnit.mutate(data);
              setShowAddUnit(false);
            }}
          />
          <EditUnitDialog
            unit={editingUnit}
            open={!!editingUnit}
            onClose={() => setEditingUnit(null)}
            onSave={(form) => updateUnit.mutate({ id: form.id, data: form })}
            onDelete={(id) => deleteUnit.mutate(id)}
          />
          <RosterUploadDialog
            open={showRosterUpload}
            onClose={() => setShowRosterUpload(false)}
            existingUnits={units}
            onImportUnits={handleImportRoster}
          />
          <CloseIncidentDialog
            incident={incident}
            open={showClose}
            onClose={() => setShowClose(false)}
            onConfirm={(notes) => closeIncident.mutate({ notes })}
          />
        </>
      )}
    </div>
  );
}