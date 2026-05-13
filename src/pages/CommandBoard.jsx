import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Archive } from 'lucide-react';
import IncidentHeader from '@/components/command/IncidentHeader';
import DivisionColumn from '@/components/command/DivisionColumn';
import RadioInput from '@/components/command/RadioInput';
import RadioLogPanel from '@/components/command/RadioLogPanel';
import PARTracker from '@/components/command/PARTracker';
import EditUnitDialog from '@/components/command/EditUnitDialog';
import AddUnitDialog from '@/components/command/AddUnitDialog';
import CloseIncidentDialog from '@/components/command/CloseIncidentDialog';
import ExportIncidentPDF from '@/components/command/ExportIncidentPDF';

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
  const queryClient = useQueryClient();

  const { data: incident, isLoading: loadingIncident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: (data) => data?.[0] || null,
    enabled: !!incidentId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', incidentId],
    queryFn: () => base44.entities.Unit.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
  });

  const { data: radioLogs = [] } = useQuery({
    queryKey: ['radioLogs', incidentId],
    queryFn: () => base44.entities.RadioLog.filter({ incident_id: incidentId }, '-created_date', 100),
    enabled: !!incidentId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['department'],
    queryFn: () => base44.entities.Department.list(),
  });
  const department = departments[0] || null;

  const createUnit = useMutation({
    mutationFn: (data) => base44.entities.Unit.create({ ...data, incident_id: incidentId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units', incidentId] }),
  });

  const updateUnit = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Unit.update(id, data),
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
    mutationFn: (data) => base44.entities.RadioLog.create(data),
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
          if (action.changes.set_air_time) updateData.air_time = new Date().toISOString();
          if (action.changes.personnel_count) updateData.personnel_count = action.changes.personnel_count;
          if (action.changes.officer) updateData.officer = action.changes.officer;
          if (action.changes.status === 'on_scene' && !existingUnit.on_scene_time) {
            updateData.on_scene_time = new Date().toISOString();
          }
          if (Object.keys(updateData).length > 0) {
            await base44.entities.Unit.update(existingUnit.id, updateData);
          }
        }
      }
    }

    if (parsed.new_units?.length > 0) {
      for (const newUnit of parsed.new_units) {
        const exists = units.find(u => u.unit_name.toLowerCase() === newUnit.unit_name?.toLowerCase());
        if (!exists) {
          await base44.entities.Unit.create({
            incident_id: incidentId,
            unit_name: newUnit.unit_name,
            unit_type: newUnit.unit_type || 'engine',
            status: newUnit.status || 'dispatched',
            assignment: newUnit.assignment || 'unassigned',
          });
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
  };

  const handleRequestAllPAR = () => {
    const workingUnits = units.filter(u => ['on_scene', 'working', 'par'].includes(u.status));
    workingUnits.forEach(unit => {
      base44.entities.Unit.update(unit.id, { last_par_time: new Date().toISOString(), status: 'par' });
    });
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Board Header */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Button>
        </Link>
        <div className="flex-1">
          <IncidentHeader incident={incident} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportIncidentPDF
            incident={incident}
            units={units}
            radioLogs={radioLogs}
            department={department}
          />
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => setShowClose(true)}
            >
              <Archive className="w-3.5 h-3.5" /> Close Incident
            </Button>
          )}
        </div>
      </div>

      {/* Cleared Banner */}
      {isReadOnly && (
        <div className="bg-green-900/30 border-b border-green-700/40 px-4 py-2 text-center text-xs font-mono text-green-400">
          This incident is CLOSED — view only
        </div>
      )}

      {/* Radio Input Bar */}
      {!isReadOnly && (
        <div className="px-4 py-3 bg-muted border-b border-border">
          <RadioInput
            incidentId={incidentId}
            units={units}
            onTransmission={handleRadioTransmission}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold font-mono tracking-wider text-muted-foreground uppercase">
              Tactical Board
            </h2>
            {!isReadOnly && (
              <Button size="sm" variant="outline" onClick={() => setShowAddUnit(true)} className="gap-1 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Unit
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {BOARD_SECTIONS.map((row, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        </div>

        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-y-auto p-4 gap-4">
          <PARTracker units={units} onRequestPAR={isReadOnly ? null : handleRequestAllPAR} />
          <RadioLogPanel logs={radioLogs} />
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