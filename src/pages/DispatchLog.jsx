import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Mic, MicOff, GripVertical, RotateCcw } from 'lucide-react';
import RadioInput from '@/components/command/RadioInput';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useDepartment } from '@/hooks/useDepartment';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const MA_TOWNS = /^(arlington|belmont|boston|cambridge|chelsea|concord|dedham|everett|framingham|lexington|lincoln|malden|medford|millis|natick|needham|newton|norwood|quincy|reading|somerville|stoneham|sudbury|watertown|wellesley|weston|woburn|worcester|arl|bel|cam|con|ded|eve|fra|lex|lin|mal|med|nat|ned|new|nor|qui|rea|som|sto|sud|wat|wel|wes|wob|wor|arm)\s/i;

function detectUnitType(name) {
  const n = name.toLowerCase();
  if (/ladder|truck|latter|tiller/.test(n)) return 'truck';
  if (/engine|pumper/.test(n))             return 'engine';
  if (/rescue/.test(n))                    return 'rescue';
  if (/squad/.test(n))                     return 'squad';
  if (/medic|amb|ems/.test(n))             return 'medic';
  if (/tanker|tender/.test(n))             return 'tanker';
  if (/brush/.test(n))                     return 'brush';
  if (/hazmat|haz/.test(n))               return 'hazmat';
  if (/chief|deputy|car|battalion/.test(n)) return 'deputy';
  return 'engine';
}

function cleanUnitName(text) {
  return text
    .replace(/\blatter\b/gi, 'Ladder').replace(/\bladder\b/gi, 'Ladder')
    .replace(/\blater\b/gi, 'Ladder').replace(/\bengine\b/gi, 'Engine')
    .replace(/\brescue\b/gi, 'Rescue').replace(/\bmedic\b/gi, 'Medic')
    .replace(/\btanker\b/gi, 'Tanker').replace(/\bbattalion\b/gi, 'Battalion')
    .replace(/\bone\b/gi, '1').replace(/\btwo\b/gi, '2').replace(/\bthree\b/gi, '3')
    .replace(/\bfour\b/gi, '4').replace(/\bfive\b/gi, '5').replace(/\bsix\b/gi, '6')
    .replace(/\bseven\b/gi, '7').replace(/\beight\b/gi, '8').replace(/\bnine\b/gi, '9')
    .replace(/\bniner\b/gi, '9').replace(/\btree\b/gi, '3').replace(/\bfower\b/gi, '4')
    .trim();
}

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

// Detect alarm level from free text — catches "strike second", "2nd alarm", "third alarm", etc.
function detectAlarmLevel(text) {
  const t = text.toLowerCase();
  if (/5th|fifth|five.?alarm/.test(t))  return '5th_alarm';
  if (/4th|fourth|four.?alarm/.test(t)) return '4th_alarm';
  if (/3rd|third|three.?alarm/.test(t)) return '3rd_alarm';
  if (/2nd|second|two.?alarm|strike/.test(t)) return '2nd_alarm';
  if (/task.?force/.test(t)) return 'task_force';
  if (/strike.?team/.test(t)) return 'strike_team';
  return null;
}

// Normalize spoken unit names: "engine one" → "Engine 1", "latter" → "Ladder", etc.
const NUMBER_WORDS_DISPATCH = {
  zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',
  six:'6',seven:'7',eight:'8',nine:'9',ten:'10',
  eleven:'11',twelve:'12',niner:'9',fower:'4',tree:'3',
};
function normalizeUnitSpeech(raw) {
  let s = raw.trim();
  s = s.replace(/\blatter\b/gi, 'Ladder').replace(/\bladder\b/gi, 'Ladder').replace(/\blater\b/gi, 'Ladder');
  s = s.replace(/\binjury\b/gi, 'Engine').replace(/\bindian\b/gi, 'Engine');
  s = s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|niner|fower|tree)\b/gi,
    m => NUMBER_WORDS_DISPATCH[m.toLowerCase()] || m);
  s = s.replace(/\b\w/g, c => c.toUpperCase());
  return s.trim();
}

// Score how well a spoken phrase matches a unit name
function unitSpeechScore(input, unitName) {
  const a = input.toLowerCase().trim();
  const b = unitName.toLowerCase().trim();
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 80;
  const aS = a.replace(/^(wal|wall)\s*/i, '');
  const bS = b.replace(/^(wal|wall)\s*/i, '');
  if (aS && bS && (bS.includes(aS) || aS.includes(bS))) return 70;
  const aToks = new Set(a.split(/\s+/));
  const bToks = b.split(/\s+/);
  const overlap = bToks.filter(t => aToks.has(t)).length;
  return overlap * 20;
}

export default function DispatchLog() {
  const { incidentId } = useParams();
  const queryClient = useQueryClient();
  const { allUnits: deptUnits, apparatusGroups } = useDepartment();
  const levelRefs = useRef({});     // DOM refs for each alarm level section
  const unitsRef  = useRef([]);     // always-current units list for async mic handlers
  const stagingRecogRef = useRef(null); // recognition instance for per-level staging mic
  const [editingFields, setEditingFields] = useState({});
  const [newUnitId, setNewUnitId] = useState(null);
  const [listening, setListening] = useState(null);
  const [pickerLevel, setPickerLevel] = useState(null); // which level has the unassigned picker open
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitMic, setNewUnitMic] = useState(false);
  const newUnitInputRef = useRef(null);
  const newUnitRecogRef = useRef(null);
  // Tracks the alarm level that will be applied to the next unit(s) added via
  // the top RadioInput or per-level Voice button. Defaults to 1st alarm and
  // bumps automatically when an alarm upgrade is spoken or typed.
  const [activeLevel, setActiveLevel] = useState('1st_alarm');

  // Keep units ref always current so async mic handlers don't use stale closures
  const { data: _units } = useQuery({ queryKey: ['units', incidentId], enabled: false });
  // (actual units query is declared below — we just need the ref update)

  // Auto-scroll to the active alarm level section when it changes
  useEffect(() => {
    const el = levelRefs.current[activeLevel];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [activeLevel]);

  // Stop any staging mic when activeLevel changes (user struck a new alarm)
  const stopStagingMic = () => {
    if (stagingRecogRef.current) {
      try { stagingRecogRef.current.stop(); } catch {}
      stagingRecogRef.current = null;
    }
    setListening(null);
  };

  const setActiveLevelAndScroll = (level) => {
    stopStagingMic();
    setActiveLevel(level);
  };

  // Continuous per-level staging mic — listens for unit names, stages them one by one
  const handleMicInput = (level) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Speech recognition not supported in this browser'); return; }

    // Second tap = stop
    if (listening === level) {
      stopStagingMic();
      return;
    }

    stopStagingMic();
    setActiveLevel(level);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setListening(level);
    recognition.onend = () => { stagingRecogRef.current = null; setListening(null); };
    recognition.onerror = () => { stagingRecogRef.current = null; setListening(null); };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;

        // Try all alternatives, pick the one that best matches a known unit
        let bestTranscript = event.results[i][0].transcript;
        let bestScore = 0;
        const currentUnits = unitsRef.current;
        for (let j = 0; j < event.results[i].length; j++) {
          const t = event.results[i][j].transcript;
          const norm = normalizeUnitSpeech(t);
          for (const u of currentUnits) {
            const s = Math.max(unitSpeechScore(norm, u.unit_name), unitSpeechScore(t, u.unit_name));
            if (s > bestScore) { bestScore = s; bestTranscript = t; }
          }
        }

        const transcript = normalizeUnitSpeech(bestTranscript);

        // Check for alarm level upgrade
        const upgraded = detectAlarmLevel(transcript);
        if (upgraded) {
          setActiveLevel(upgraded);
          continue;
        }

        // Try to match against unalarmed units in the incident
        const unalarmed = currentUnits.filter(u => !u.alarm_level && u.assignment === 'unassigned');
        let bestMatch = null;
        let topScore = 0;
        for (const u of unalarmed) {
          const s = Math.max(unitSpeechScore(transcript, u.unit_name), unitSpeechScore(bestTranscript, u.unit_name));
          if (s > topScore) { topScore = s; bestMatch = u; }
        }

        if (bestMatch && topScore >= 20) {
          // Stage a known unit
          updateUnit.mutate({ id: bestMatch.id, data: { alarm_level: level, status: 'staging', assignment: 'staging' } });
          logUnitDispatch(bestMatch.unit_name, level, null);
        } else {
          // New / mutual aid unit — create as staging
          const lower = transcript.toLowerCase();
          let detectedType = 'engine';
          if (/truck|ladder/.test(lower)) detectedType = 'truck';
          else if (/rescue/.test(lower)) detectedType = 'rescue';
          else if (/medic|ems/.test(lower)) detectedType = 'medic';
          else if (/squad/.test(lower)) detectedType = 'squad';
          else if (/tanker/.test(lower)) detectedType = 'tanker';
          else if (/hazmat/.test(lower)) detectedType = 'hazmat';
          else if (/brush/.test(lower)) detectedType = 'brush';
          else if (/deputy|chief|battalion/.test(lower)) detectedType = 'deputy';
          createUnit.mutate({
            unit_name: transcript,
            unit_type: detectedType,
            alarm_level: level,
            status: 'staging',
            assignment: 'staging',
            is_mutual_aid: MA_TOWNS.test(transcript),
          });
          logUnitDispatch(transcript, level, null);
        }
      }
    };

    stagingRecogRef.current = recognition;
    recognition.start();
  };

  const { data: incident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: (data) => data?.[0] || null,
    enabled: !!incidentId,
  });

  // Sync active level with the incident's current alarm level on load
  useEffect(() => {
    if (incident?.alarm_level) setActiveLevel(incident.alarm_level);
  }, [incident?.alarm_level]);

  const { data: units = [] } = useQuery({
    queryKey: ['units', incidentId],
    queryFn: () => base44.entities.Unit.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
  });

  // Keep unitsRef current for async mic handlers
  useEffect(() => { unitsRef.current = units; }, [units]);

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

  // Log a dispatch entry for a unit added at a specific alarm level
  const logUnitDispatch = (unitName, level, address) => {
    const ALARM_LOG_LABELS = {
      '1st_alarm': '1ST ALARM', '2nd_alarm': '2ND ALARM', '3rd_alarm': '3RD ALARM',
      '4th_alarm': '4TH ALARM', '5th_alarm': '5TH ALARM',
      'task_force': 'TASK FORCE', 'strike_team': 'STRIKE TEAM',
    };
    base44.entities.RadioLog.create({
      incident_id: incidentId,
      message: `${unitName} — DISPATCHED (${ALARM_LOG_LABELS[level] || level.toUpperCase()}) → ${address || ''}`,
      timestamp: new Date().toISOString(),
      from_unit: unitName,
      to_unit: 'COMMAND',
      priority: 'routine',
      parsed_action: `${unitName} dispatched at ${alarmLabels[level] || level}`,
      auto_applied: true,
    }).catch(() => {}); // non-blocking
  };

  const handleRadioTransmission = async (message, parsed) => {
    // Check for alarm level upgrade — bump activeLevel first so new units get the right tag
    const upgradedLevel = parsed.upgrade_alarm || detectAlarmLevel(message);
    if (upgradedLevel) {
      setActiveLevel(upgradedLevel);
    }
    const levelForNewUnits = upgradedLevel || activeLevel;

    // Create new units from radio transmission
    if (parsed.new_units?.length > 0) {
      for (const newUnit of parsed.new_units) {
        const exists = units.find(u => u.unit_name.toLowerCase() === newUnit.unit_name?.toLowerCase());
        if (!exists) {
          createUnit.mutate({
            unit_name: newUnit.unit_name,
            unit_type: newUnit.unit_type || 'engine',
            alarm_level: levelForNewUnits,
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

  // Units in the incident with no alarm level yet — available/unassigned pool
  const unalarmedUnits = units.filter(u => (!u.alarm_level || u.alarm_level === '') && u.assignment === 'unassigned');

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
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-mono font-bold text-foreground text-sm">Radio Input</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Next units →</span>
                  <select
                    value={activeLevel}
                    onChange={(e) => setActiveLevelAndScroll(e.target.value)}
                    className="text-xs font-mono font-bold rounded border border-primary/40 bg-primary/10 text-primary px-2 py-1 cursor-pointer"
                  >
                    {alarmLevels.map(l => (
                      <option key={l} value={l}>{alarmLabels[l]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <RadioInput incidentId={incidentId} units={units} onTransmission={handleRadioTransmission} />
              <p className="text-[10px] font-mono text-muted-foreground/50 mt-1.5">
                Say "strike second alarm", "3rd alarm companies", etc. to switch levels automatically
              </p>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            {alarmLevels.map(level => (
              <div
                key={level}
                ref={el => { levelRefs.current[level] = el; }}
                className={`rounded-lg border bg-card/40 overflow-hidden transition-all ${
                  level === activeLevel ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border/60'
                }`}
              >
                <div className={`border-b border-border/60 px-4 py-3 flex items-center justify-between ${
                  level === activeLevel ? 'bg-primary/10' : 'bg-secondary/60'
                }`}>
                  <div>
                    <h2 className={`font-mono font-bold text-lg ${level === activeLevel ? 'text-primary' : 'text-foreground'}`}>{alarmLabels[level]}</h2>
                    <p className="text-xs text-muted-foreground mt-1">{unitsByAlarm[level].length} units{level === activeLevel ? ' — active level' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={listening === level ? 'default' : 'outline'}
                      onClick={() => handleMicInput(level)}
                      className={`gap-1.5 ${listening === level ? 'bg-red-500 hover:bg-red-600 border-red-500' : ''}`}
                      disabled={listening !== null && listening !== level}
                    >
                      <Mic className={`w-4 h-4 ${listening === level ? 'animate-pulse' : ''}`} />
                      {listening === level ? '⏹ Stop' : '🎙 Stage Units'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPickerLevel(pickerLevel === level ? null : level)}
                      className="gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Unit
                    </Button>
                  </div>
                </div>

                {/* Unit picker panel */}
                {pickerLevel === level && (() => {
                  // All dept units are already in the incident — picker is for mutual aid only
                  const remainingGroups = [];

                  const isMutualAid = MA_TOWNS.test(newUnitName);

                  const addDeptUnit = (deptUnit) => {
                    createUnit.mutate({
                      unit_name: deptUnit.unit_name,
                      unit_type: deptUnit.unit_type,
                      personnel_count: deptUnit.personnel_count,
                      alarm_level: level,
                      status: 'dispatched',
                      assignment: 'unassigned',
                    });
                    logUnitDispatch(deptUnit.unit_name, level, incident?.address);
                    setPickerLevel(null);
                  };

                  const submitNewUnit = () => {
                    const name = newUnitName.trim();
                    if (!name) return;
                    createUnit.mutate({
                      unit_name: name,
                      unit_type: detectUnitType(name),
                      alarm_level: level,
                      status: 'dispatched',
                      assignment: 'unassigned',
                      is_mutual_aid: MA_TOWNS.test(name),
                    });
                    logUnitDispatch(name, level, incident?.address);
                    setNewUnitName('');
                    setPickerLevel(null);
                  };

                  const toggleMic = () => {
                    if (newUnitMic) {
                      newUnitRecogRef.current?.stop();
                      setNewUnitMic(false);
                      return;
                    }
                    if (!SpeechRecognition) return;
                    const r = new SpeechRecognition();
                    r.lang = 'en-US';
                    r.interimResults = false;
                    r.maxAlternatives = 1;
                    r.onstart = () => setNewUnitMic(true);
                    r.onend = () => setNewUnitMic(false);
                    r.onerror = () => setNewUnitMic(false);
                    r.onresult = (e) => {
                      const raw = e.results[0][0].transcript;
                      const cleaned = cleanUnitName(raw);
                      setNewUnitName(cleaned);
                      setTimeout(() => newUnitInputRef.current?.focus(), 100);
                    };
                    newUnitRecogRef.current = r;
                    r.start();
                  };

                  return (
                    <div className="border-b border-border/60 bg-secondary/20 px-4 py-3 space-y-3">

                      {/* Remaining dept units, grouped by station */}
                      {remainingGroups.length > 0 && (
                        <div className="space-y-2">
                          {remainingGroups.map(group => (
                            <div key={group.label}>
                              <p className="text-[9px] font-mono font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">{group.label}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {group.units.map(u => (
                                  <button
                                    key={u.unit_name}
                                    onClick={() => addDeptUnit(u)}
                                    className="text-xs font-mono px-2.5 py-1 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                  >
                                    {u.unit_name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
{/* dept units are now pre-populated — picker is mutual aid / new unit only */}

                      {/* New / mutual aid unit input */}
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-1.5">Add mutual aid or new unit</p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              ref={newUnitInputRef}
                              value={newUnitName}
                              onChange={e => setNewUnitName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') submitNewUnit(); if (e.key === 'Escape') { setPickerLevel(null); setNewUnitName(''); }}}
                              placeholder="e.g. Newton Engine 5, ARL Ladder 1"
                              className={`font-mono text-sm h-9 ${isMutualAid ? 'border-amber-500/50 bg-amber-500/5' : 'bg-secondary'}`}
                              autoFocus
                            />
                            {isMutualAid && (
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">MA</span>
                            )}
                          </div>
                          {SpeechRecognition && (
                            <button
                              type="button"
                              onClick={toggleMic}
                              className={`shrink-0 w-9 h-9 rounded-md border flex items-center justify-center transition-colors ${
                                newUnitMic
                                  ? 'bg-red-500/20 border-red-500/60 text-red-400 animate-pulse'
                                  : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {newUnitMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </button>
                          )}
                          <Button size="sm" className="h-9 shrink-0" onClick={submitNewUnit} disabled={!newUnitName.trim()}>
                            Add
                          </Button>
                          <Button size="sm" variant="ghost" className="h-9 shrink-0 text-muted-foreground" onClick={() => { setPickerLevel(null); setNewUnitName(''); }}>
                            Cancel
                          </Button>
                        </div>
                        {newUnitMic && <p className="text-xs font-mono text-primary animate-pulse mt-1">Listening… say the unit name</p>}
                      </div>
                    </div>
                  );
                })()}

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
                                unit.status === 'on_scene'  ? 'bg-green-500/20 text-green-400' :
                                unit.status === 'staging'   ? 'bg-amber-500/20 text-amber-400' :
                                unit.status === 'mayday'    ? 'bg-red-500/20 text-red-400' :
                                unit.status === 'rehab'     ? 'bg-yellow-500/20 text-yellow-400' :
                                unit.status === 'available' ? 'bg-slate-500/20 text-slate-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {unit.status}
                              </span>
                              {/* Return to unassigned pool — only for staging/dispatched/available, not on_scene/working */}
                              {!['on_scene','working','par','mayday','rehab'].includes(unit.status) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Return to unassigned pool"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => updateUnit.mutate({ id: unit.id, data: { alarm_level: null, status: 'available' } })}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </Button>
                              )}
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

                      {/* Unalarmed pool — show at bottom of active alarm level only */}
                      {level === activeLevel && unalarmedUnits.length > 0 && (
                        <div className="pt-2 border-t border-amber-500/20 mt-2">
                          <p className="text-[9px] font-mono font-bold text-amber-400/70 uppercase tracking-widest mb-1.5">
                            Tap or say to stage → {alarmLabels[level]}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {unalarmedUnits.map(u => (
                              <button
                                key={u.id}
                                onClick={() => {
                                  updateUnit.mutate({ id: u.id, data: { alarm_level: level, status: 'staging', assignment: 'staging' } });
                                  logUnitDispatch(u.unit_name, level, incident?.address);
                                }}
                                className="text-xs font-mono px-2.5 py-1 rounded border border-amber-500/30 bg-amber-500/5 text-amber-400/70 hover:border-amber-500/60 hover:bg-amber-500/15 hover:text-amber-300 transition-colors"
                              >
                                {u.unit_name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

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