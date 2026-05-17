import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const alarmLevels = [
  '1st_alarm', '2nd_alarm', '3rd_alarm', '4th_alarm', '5th_alarm', 'task_force', 'strike_team'
];

const alarmLabels = {
  '1st_alarm': '1st Alarm',
  '2nd_alarm': '2nd Alarm',
  '3rd_alarm': '3rd Alarm',
  '4th_alarm': '4th Alarm',
  '5th_alarm': '5th Alarm',
  'task_force': 'Task Force',
  'strike_team': 'Strike Team',
};

const unitTypes = [
  'engine', 'truck', 'rescue', 'squad', 'deputy', 'medic', 'tanker', 'brush', 'hazmat', 'other'
];

export default function DispatchLog() {
  const { incidentId } = useParams();
  const queryClient = useQueryClient();
  const [editingFields, setEditingFields] = useState({});
  const [newUnitId, setNewUnitId] = useState(null);

  const { data: incident } = useQuery({
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

  const updateUnit = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Unit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
    },
  });

  const deleteUnit = useMutation({
    mutationFn: (id) => base44.entities.Unit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units', incidentId] }),
  });

  const createUnit = useMutation({
    mutationFn: (data) => base44.entities.Unit.create({ ...data, incident_id: incidentId }),
    onSuccess: (newUnit) => {
      setNewUnitId(newUnit.id);
      queryClient.invalidateQueries({ queryKey: ['units', incidentId] });
    },
  });

  const unitsByAlarm = {};
  alarmLevels.forEach(level => {
    unitsByAlarm[level] = units.filter(u => u.alarm_level === level);
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={`/incident/${incidentId}`}>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Dispatch Log</h1>
            {incident && <p className="text-sm text-muted-foreground font-mono">{incident.address}</p>}
          </div>
        </div>

        <div className="space-y-6">
          {alarmLevels.map(level => (
            <div key={level} className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
              <div className="bg-secondary/60 border-b border-border/60 px-4 py-3">
                <h2 className="font-mono font-bold text-foreground text-lg">{alarmLabels[level]}</h2>
                <p className="text-xs text-muted-foreground mt-1">{unitsByAlarm[level].length} units</p>
              </div>

              <div className="p-4 space-y-3">
                {unitsByAlarm[level].length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No units dispatched at this level</p>
                ) : (
                  unitsByAlarm[level].map(unit => (
                    <div key={unit.id} className={`flex items-center gap-2 p-2 rounded-lg border ${newUnitId === unit.id ? 'bg-primary/10 border-primary/40' : 'bg-secondary/40 border-border/40 hover:border-border/60'} group`}>
                      <Input
                        ref={newUnitId === unit.id ? (ref) => ref?.focus() : null}
                        value={editingFields[`${unit.id}_name`] !== undefined ? editingFields[`${unit.id}_name`] : unit.unit_name}
                        onChange={(e) => setEditingFields({ ...editingFields, [`${unit.id}_name`]: e.target.value })}
                        onBlur={() => {
                          if (editingFields[`${unit.id}_name`] && editingFields[`${unit.id}_name`] !== unit.unit_name) {
                            updateUnit.mutate({ id: unit.id, data: { unit_name: editingFields[`${unit.id}_name`] } });
                          }
                          setNewUnitId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setNewUnitId(null);
                        }}
                        className="bg-background font-mono text-sm flex-1 h-8"
                        placeholder="Unit name"
                      />
                      <Select 
                        value={editingFields[`${unit.id}_type`] !== undefined ? editingFields[`${unit.id}_type`] : unit.unit_type}
                        onValueChange={(v) => {
                          setEditingFields({ ...editingFields, [`${unit.id}_type`]: v });
                          updateUnit.mutate({ id: unit.id, data: { unit_type: v } });
                        }}
                      >
                        <SelectTrigger className="w-28 bg-background font-mono text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {unitTypes.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className={`text-xs font-mono px-2 py-1 rounded-full whitespace-nowrap ${
                        unit.status === 'on_scene' ? 'bg-green-500/20 text-green-400' :
                        unit.status === 'mayday' ? 'bg-red-500/20 text-red-400' :
                        unit.status === 'rehab' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {unit.status}
                      </span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteUnit.mutate(unit.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => createUnit.mutate({ unit_name: 'New Unit', unit_type: 'engine', alarm_level: level })}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Unit to {alarmLabels[level]}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}