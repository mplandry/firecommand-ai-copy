import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Mic, GripVertical } from 'lucide-react';
import RadioInput from '@/components/command/RadioInput';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
  const [listening, setListening] = useState(null);

  const handleMicInput = (level) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported in this browser'); return; }

    if (listening === level) return; // already listening

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setListening(level);
    recognition.onend = () => setListening(null);
    recognition.onerror = () => setListening(null);

    recognition.onresult = (event) => {
      const raw = event.results[0]?.[0]?.transcript?.trim();
      if (raw) {
        // Normalize spoken unit name: "Engine one" → "Engine 1", etc.
        const numberWords = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
        let transcript = raw.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
          m => numberWords[m.toLowerCase()]);

        const lower = transcript.toLowerCase();
        let detectedType = 'engine';
        if (/truck|ladder|tiller/.test(lower)) detectedType = 'truck';
        else if (/rescue/.test(lower)) detectedType = 'rescue';
        else if (/medic|ems|amb/.test(lower)) detectedType = 'medic';
        else if (/squad/.test(lower)) detectedType = 'squad';
        else if (/tanker/.test(lower)) detectedType = 'tanker';
        else if (/hazmat/.test(lower)) detectedType = 'hazmat';
        else if (/brush|wildland/.test(lower)) detectedType = 'brush';
        else if (/deputy|chief|battalion/.test(lower)) detectedType = 'deputy';

        // Capitalize first letter of each word (e.g. "engine 1" → "Engine 1")
        const unitName = transcript.replace(/\b\w/g, c => c.toUpperCase());
        createUnit.mutate({ unit_name: unitName, unit_type: detectedType, alarm_level: level, status: 'dispatched', assignment: 'unassigned' });
      }
    };

    recognition.start();
  };

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
      queryClient.refetchQueries({ queryKey: ['units', incidentId] });
    },
  });

  const handleRadioTransmission = async (message, parsed) => {
    // Create new units from radio transmission
    if (parsed.new_units?.length > 0) {
      for (const newUnit of parsed.new_units) {
        const exists = units.find(u => u.unit_name.toLowerCase() === newUnit.unit_name?.toLowerCase());
        if (!exists) {
          createUnit.mutate({
            unit_name: newUnit.unit_name,
            unit_type: newUnit.unit_type || 'engine',
            alarm_level: '1st_alarm',
            status: newUnit.status || 'dispatched',
            assignment: newUnit.assignment || 'unassigned',
            ...(newUnit.notes ? { notes: newUnit.notes } : {}),
          });
        }
      }
    }

    // Update existing units from radio transmission
    if (parsed.actions?.length > 0) {
      for (const action of parsed.actions) {
        const existingUnit = units.find(u => u.unit_name.toLowerCase() === action.unit_name?.toLowerCase());
        if (existingUnit && action.changes) {
          const updateData = {};
          if (action.changes.status) updateData.status = action.changes.status;
          if (action.changes.assignment) updateData.assignment = action.changes.assignment;
          if (action.changes.floor) updateData.floor = action.changes.floor;
          if (action.changes.personnel_count) updateData.personnel_count = action.changes.personnel_count;
          if (action.changes.officer) updateData.officer = action.changes.officer;
          if (action.changes.set_air_time) updateData.air_time = new Date().toISOString();
          if (Object.keys(updateData).length > 0) {
            updateUnit.mutate({ id: existingUnit.id, data: updateData });
          }
        }
      }
    }
  };


  const unitsByAlarm = {};
  alarmLevels.forEach(level => {
    unitsByAlarm[level] = units.filter(u => u.alarm_level === level);
  });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    updateUnit.mutate({ id: draggableId, data: { alarm_level: destination.droppableId } });
  };

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
          <div className="bg-card/40 rounded-lg border border-border/60 p-4">
            <div className="mb-2">
              <h2 className="font-mono font-bold text-foreground text-sm mb-2">Radio Input</h2>
              <RadioInput incidentId={incidentId} units={units} onTransmission={handleRadioTransmission} />
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            {alarmLevels.map(level => (
              <div key={level} className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
                <div className="bg-secondary/60 border-b border-border/60 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h2 className="font-mono font-bold text-foreground text-lg">{alarmLabels[level]}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{unitsByAlarm[level].length} units</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={listening === level ? 'default' : 'outline'}
                      onClick={() => handleMicInput(level)}
                      className="gap-1.5"
                      disabled={listening !== null && listening !== level}
                    >
                      <Mic className={`w-4 h-4 ${listening === level ? 'animate-pulse' : ''}`} />
                      {listening === level ? 'Listening...' : 'Voice'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createUnit.mutate({ unit_name: 'New Unit', unit_type: 'engine', alarm_level: level })}
                      className="gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Unit
                    </Button>
                  </div>
                </div>

                <Droppable droppableId={level}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-4 space-y-3 min-h-[60px] transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5 border-primary/20' : ''}`}
                    >
                      {unitsByAlarm[level].length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-sm text-muted-foreground italic">No units dispatched at this level</p>
                      )}

                      {unitsByAlarm[level].map((unit, index) => (
                        <Draggable key={unit.id} draggableId={unit.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center gap-2 p-2 rounded-lg border group transition-shadow ${
                                snapshot.isDragging
                                  ? 'shadow-lg ring-1 ring-primary/40 bg-card border-primary/40'
                                  : newUnitId === unit.id
                                  ? 'bg-primary/10 border-primary/40'
                                  : 'bg-secondary/40 border-border/40 hover:border-border/60'
                              }`}
                            >
                              <div {...provided.dragHandleProps} className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <Input
                                ref={newUnitId === unit.id ? (ref) => {
                                  if (ref) setTimeout(() => ref.focus(), 0);
                                } : null}
                                value={editingFields[`${unit.id}_name`] !== undefined ? editingFields[`${unit.id}_name`] : unit.unit_name}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  const lower = name.toLowerCase();
                                  let detectedType = editingFields[`${unit.id}_type`] ?? unit.unit_type;
                                  if (/\b(truck|ladder|truck|lad|tiller)\b/.test(lower)) detectedType = 'truck';
                                  else if (/\b(engine|eng|pumper)\b/.test(lower)) detectedType = 'engine';
                                  else if (/\b(rescue|resc|res)\b/.test(lower)) detectedType = 'rescue';
                                  else if (/\b(medic|med|ems|amb)\b/.test(lower)) detectedType = 'medic';
                                  else if (/\b(squad|sqd)\b/.test(lower)) detectedType = 'squad';
                                  else if (/\b(tanker|tank|tnk)\b/.test(lower)) detectedType = 'tanker';
                                  else if (/\b(hazmat|haz)\b/.test(lower)) detectedType = 'hazmat';
                                  else if (/\b(brush|brsh|wildland)\b/.test(lower)) detectedType = 'brush';
                                  else if (/\b(deputy|dep|chief|bat)\b/.test(lower)) detectedType = 'deputy';
                                  setEditingFields({ ...editingFields, [`${unit.id}_name`]: name, [`${unit.id}_type`]: detectedType });
                                }}
                                onFocus={(e) => e.target.select()}
                                onBlur={() => {
                                  const updates = {};
                                  if (editingFields[`${unit.id}_name`] !== undefined && editingFields[`${unit.id}_name`] !== unit.unit_name) updates.unit_name = editingFields[`${unit.id}_name`];
                                  if (editingFields[`${unit.id}_type`] !== undefined && editingFields[`${unit.id}_type`] !== unit.unit_type) updates.unit_type = editingFields[`${unit.id}_type`];
                                  if (Object.keys(updates).length > 0) updateUnit.mutate({ id: unit.id, data: updates });
                                  setNewUnitId(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setNewUnitId(null);
                                  if (e.key === 'Enter') {
                                    const updates = {};
                                    if (editingFields[`${unit.id}_name`] !== undefined && editingFields[`${unit.id}_name`] !== unit.unit_name) updates.unit_name = editingFields[`${unit.id}_name`];
                                    if (editingFields[`${unit.id}_type`] !== undefined && editingFields[`${unit.id}_type`] !== unit.unit_type) updates.unit_type = editingFields[`${unit.id}_type`];
                                    if (Object.keys(updates).length > 0) updateUnit.mutate({ id: unit.id, data: updates });
                                    setNewUnitId(null);
                                  }
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
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => createUnit.mutate({ unit_name: '', unit_type: 'engine', alarm_level: level })}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add Unit to {alarmLabels[level]}
                      </Button>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}