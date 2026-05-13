import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Radio, Shield, Flame } from 'lucide-react';
import IncidentHeader from '@/components/command/IncidentHeader';
import DivisionColumn from '@/components/command/DivisionColumn';
import RadioInput from '@/components/command/RadioInput';
import RadioLogPanel from '@/components/command/RadioLogPanel';
import PARTracker from '@/components/command/PARTracker';
import NewIncidentDialog from '@/components/command/NewIncidentDialog';
import EditUnitDialog from '@/components/command/EditUnitDialog';
import AddUnitDialog from '@/components/command/AddUnitDialog';

const BOARD_SECTIONS = [
  ['division_a', 'division_b', 'division_c', 'division_d'],
  ['roof', 'interior', 'rit', 'rehab'],
  ['water_supply', 'ventilation', 'search', 'medical'],
  ['staging', 'exposure', 'unassigned'],
];

export default function CommandBoard() {
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const queryClient = useQueryClient();

  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.filter({ status: 'active' }, '-created_date', 1),
    initialData: [],
  });

  const activeIncident = incidents?.[0] || null;

  const { data: units } = useQuery({
    queryKey: ['units', activeIncident?.id],
    queryFn: () => activeIncident ? base44.entities.Unit.filter({ incident_id: activeIncident.id }) : [],
    enabled: !!activeIncident,
    initialData: [],
  });

  const { data: radioLogs } = useQuery({
    queryKey: ['radioLogs', activeIncident?.id],
    queryFn: () => activeIncident ? base44.entities.RadioLog.filter({ incident_id: activeIncident.id }, '-created_date', 100) : [],
    enabled: !!activeIncident,
    initialData: [],
  });

  const createIncident = useMutation({
    mutationFn: (data) => base44.entities.Incident.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setShowNewIncident(false);
    },
  });

  const createUnit = useMutation({
    mutationFn: (data) => base44.entities.Unit.create({ ...data, incident_id: activeIncident.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] }),
  });

  const updateUnit = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Unit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setEditingUnit(null);
    },
  });

  const deleteUnit = useMutation({
    mutationFn: (id) => base44.entities.Unit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setEditingUnit(null);
    },
  });

  const createRadioLog = useMutation({
    mutationFn: (data) => base44.entities.RadioLog.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['radioLogs'] }),
  });

  const handleRadioTransmission = async (message, parsed) => {
    // Create radio log entry
    await createRadioLog.mutateAsync({
      incident_id: activeIncident.id,
      message,
      timestamp: new Date().toISOString(),
      from_unit: parsed.from_unit || null,
      to_unit: parsed.to_unit || null,
      priority: parsed.priority || 'routine',
      parsed_action: parsed.summary || '',
      auto_applied: true,
    });

    // Apply actions to existing units
    if (parsed.actions?.length > 0) {
      for (const action of parsed.actions) {
        const existingUnit = units.find(
          u => u.unit_name.toLowerCase() === action.unit_name?.toLowerCase()
        );
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

    // Create new units
    if (parsed.new_units?.length > 0) {
      for (const newUnit of parsed.new_units) {
        const exists = units.find(
          u => u.unit_name.toLowerCase() === newUnit.unit_name?.toLowerCase()
        );
        if (!exists) {
          await base44.entities.Unit.create({
            incident_id: activeIncident.id,
            unit_name: newUnit.unit_name,
            unit_type: newUnit.unit_type || 'engine',
            status: newUnit.status || 'dispatched',
            assignment: newUnit.assignment || 'unassigned',
          });
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['units'] });
  };

  const handleRequestAllPAR = () => {
    const workingUnits = units.filter(u => ['on_scene', 'working', 'par'].includes(u.status));
    workingUnits.forEach(unit => {
      base44.entities.Unit.update(unit.id, { last_par_time: new Date().toISOString(), status: 'par' });
    });
    queryClient.invalidateQueries({ queryKey: ['units'] });
  };

  const handleEditUnit = (unit) => setEditingUnit(unit);

  const handleSaveUnit = (form) => {
    updateUnit.mutate({ id: form.id, data: form });
  };

  const getUnitsForAssignment = (assignment) => {
    return units.filter(u => u.assignment === assignment);
  };

  // No active incident — show start screen
  if (!activeIncident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
            <Flame className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold font-mono text-foreground mb-2">Fireground Command</h1>
          <p className="text-muted-foreground mb-8 text-sm">
            Digital tactical accountability board with radio traffic parsing
          </p>
          <Button onClick={() => setShowNewIncident(true)} size="lg" className="gap-2">
            <Shield className="w-5 h-5" />
            Start New Incident
          </Button>
          <NewIncidentDialog
            open={showNewIncident}
            onClose={() => setShowNewIncident(false)}
            onCreate={(data) => createIncident.mutate(data)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <IncidentHeader incident={activeIncident} />

      {/* Radio Input Bar */}
      <div className="px-4 py-3 bg-muted border-b border-border">
        <RadioInput
          incidentId={activeIncident.id}
          units={units}
          onTransmission={handleRadioTransmission}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Tactical Board */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold font-mono tracking-wider text-muted-foreground uppercase">
              Tactical Board
            </h2>
            <Button size="sm" variant="outline" onClick={() => setShowAddUnit(true)} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Unit
            </Button>
          </div>

          <div className="space-y-4">
            {BOARD_SECTIONS.map((row, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {row.map(assignment => (
                  <DivisionColumn
                    key={assignment}
                    assignment={assignment}
                    units={getUnitsForAssignment(assignment)}
                    onEditUnit={handleEditUnit}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border flex flex-col overflow-y-auto p-4 gap-4">
          <PARTracker units={units} onRequestPAR={handleRequestAllPAR} />
          <RadioLogPanel logs={radioLogs} />
        </div>
      </div>

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
        onSave={handleSaveUnit}
        onDelete={(id) => deleteUnit.mutate(id)}
      />
    </div>
  );
}