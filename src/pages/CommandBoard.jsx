import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Archive, ScanLine, ShieldCheck, Monitor, Moon, Sun, PanelRightClose, PanelRightOpen, Radio, Pencil, MicOff } from 'lucide-react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTheme } from '@/lib/ThemeContext';
import IncidentHeader from '@/components/command/IncidentHeader';
import RosterUploadDialog from '@/components/command/RosterUploadDialog';
import DivisionColumn from '@/components/command/DivisionColumn';
import { useDepartment } from '@/hooks/useDepartment';
import RadioInput from '@/components/command/RadioInput';
import EditUnitDialog from '@/components/command/EditUnitDialog';
import AddUnitDialog from '@/components/command/AddUnitDialog';
import CloseIncidentDialog from '@/components/command/CloseIncidentDialog';
import EditIncidentDialog from '@/components/command/EditIncidentDialog';
import ExportIncidentPDF from '@/components/command/ExportIncidentPDF';
import ConnectionStatus from '@/components/command/ConnectionStatus';
import SidePanel from '@/components/command/SidePanel';
import PARAlert from '@/components/command/PARAlert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { enqueue, getCached, setCached, patchCachedUnit, addCachedUnit, addCachedRadioLog } from '@/lib/offlineQueue';
import { getAutoAssignment } from '@/lib/statusAssignment';

export default function CommandBoard() {
  const { incidentId } = useParams();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [showClose, setShowClose] = useState(false);
  const { stationGroups, specialUnits, prefix: deptPrefix } = useDepartment();
  const [showEditIncident, setShowEditIncident] = useState(false);
  const [showRosterUpload, setShowRosterUpload] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [bottomSide, setBottomSide] = useState('division_a'); // Alpha is default front/address side
  const [micBlocked, setMicBlocked] = useState(false);
  const queryClient = useQueryClient();

  // Request mic permission immediately when the board loads so there's no
  // popup mid-incident. If already granted the browser resolves instantly.
  React.useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Permission granted — release the stream immediately (Speech API manages its own)
        stream.getTracks().forEach(t => t.stop());
        setMicBlocked(false);
      })
      .catch(() => setMicBlocked(true));
  }, []);

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
    staleTime: 0,
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
    staleTime: 0,
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

  const updateIncident = useMutation({
    mutationFn: (data) => base44.entities.Incident.update(incidentId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incident', incidentId] }),
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

    // Strip WAL prefix so 'WAL Engine 1' matches 'Engine 1' and vice-versa
    const normalizeUnit = (name) => (name || '').toLowerCase().replace(/^wal\s+/i, '').trim();

    if (parsed.actions?.length > 0) {
      for (const action of parsed.actions) {
        const existingUnit = units.find(u => normalizeUnit(u.unit_name) === normalizeUnit(action.unit_name));
        if (existingUnit && action.changes) {
          const updateData = {};
          if (action.changes.status) {
            updateData.status = action.changes.status;
            if (action.changes.status === 'rehab' && existingUnit.status !== 'rehab') {
              updateData.rehab_time = new Date().toISOString();
            }
            if ((action.changes.status === 'on_scene' || action.changes.status === 'working') && !existingUnit.on_scene_time) {
              updateData.on_scene_time = new Date().toISOString();
            }
            // Auto-move to the right zone if no explicit assignment in this transmission
            if (!action.changes.assignment) {
              const autoAssign = getAutoAssignment(action.changes.status, existingUnit.assignment);
              if (autoAssign) updateData.assignment = autoAssign;
            }
          }
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
        const exists = units.find(u => normalizeUnit(u.unit_name) === normalizeUnit(newUnit.unit_name));
        if (!exists) {
          const newUnitPayload = {
            incident_id: incidentId,
            unit_name: newUnit.unit_name,
            unit_type: newUnit.unit_type || 'engine',
            status: newUnit.status || 'dispatched',
            assignment: newUnit.assignment || 'unassigned',
            ...(newUnit.notes ? { notes: newUnit.notes } : {}),
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

    // Upgrade alarm level if voiced
    if (parsed.upgrade_alarm) {
      const alarmOrder = ['1st_alarm', '2nd_alarm', '3rd_alarm', '4th_alarm', '5th_alarm', 'task_force', 'strike_team'];
      const currentIdx = alarmOrder.indexOf(incident?.alarm_level);
      const newIdx = alarmOrder.indexOf(parsed.upgrade_alarm);
      if (newIdx > currentIdx) {
        updateIncident.mutate({ alarm_level: parsed.upgrade_alarm });
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

  const handleDragEnd = async (result) => {
    const { draggableId, destination } = result;
    if (!destination) return;
    const unit = units.find(u => u.id === draggableId);
    if (!unit || unit.assignment === destination.droppableId) return;

    const newAssignment = destination.droppableId;
    const now = new Date().toISOString();
    const updateData = { assignment: newAssignment };

    // Auto-status when dragged onto active tactical zones
    const workingZones = ['division_a', 'division_b', 'division_c', 'division_d', 'roof', 'interior', 'ventilation', 'search', 'water_supply', 'medical', 'exposure'];
    const onSceneZones = ['staging'];

    // Auto-set floor when dragged to roof assignment
    if (newAssignment === 'roof') {
      updateData.floor = 'Roof';
    } else if (unit.floor === 'Roof' && newAssignment !== 'roof') {
      // Clear roof floor when moved away from roof assignment
      updateData.floor = '';
    }

    if (workingZones.includes(newAssignment)) {
      updateData.status = 'working';
      if (!unit.on_scene_time) updateData.on_scene_time = now;
    } else if (onSceneZones.includes(newAssignment) && ['dispatched', 'responding'].includes(unit.status)) {
      updateData.status = 'on_scene';
      if (!unit.on_scene_time) updateData.on_scene_time = now;
    } else if (newAssignment === 'rehab') {
      updateData.status = 'rehab';
      updateData.rehab_time = now;
    } else if (newAssignment === 'rit') {
      updateData.status = 'working';
      if (!unit.on_scene_time) updateData.on_scene_time = now;
    } else if (newAssignment === 'staging') {
      updateData.status = 'available';
      updateData.rehab_time = null;
    }

    if (!navigator.onLine) {
      enqueue({ type: 'unit_update', id: unit.id, data: updateData });
      patchCachedUnit(incidentId, unit.id, updateData);
      updatePending();
    } else {
      await base44.entities.Unit.update(unit.id, updateData);
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

      {/* ── Mic blocked warning ── */}
      {micBlocked && (
        <div className="shrink-0 bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 flex items-center gap-2 text-xs font-mono text-amber-300">
          <MicOff className="w-4 h-4 shrink-0" />
          Microphone access is blocked — radio input won't work. Allow mic access in your browser settings and reload.
        </div>
      )}

      {/* ── Top Command Bar ── */}
      <header className="shrink-0 bg-card/90 backdrop-blur border-b border-border/60 px-3 py-2 flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0 h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <IncidentHeader incident={incident} onAlarmChange={(alarm) => updateIncident.mutate({ alarm_level: alarm })} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {!isReadOnly && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEditIncident(true)}
              className="h-10 w-10 text-muted-foreground hover:text-foreground"
              title="Edit Incident"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            title={theme === 'night' ? 'Switch to Day mode' : 'Switch to Night mode'}
          >
            {theme === 'night' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <ConnectionStatus isOnline={isOnline} pendingCount={pendingCount} replaying={replaying} />
          <Link to={`/incident/${incidentId}/accountability`}>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" title="Accountability">
              <ShieldCheck className="w-5 h-5" />
            </Button>
          </Link>
          <Link to={`/incident/${incidentId}/dispatch`}>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" title="Dispatch Log">
              <Radio className="w-5 h-5" />
            </Button>
          </Link>
          <Link to={`/incident/${incidentId}/kiosk`}>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" title="Kiosk">
              <Monitor className="w-5 h-5" />
            </Button>
          </Link>
          {!isReadOnly && (
            <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground" title="Roster Upload" onClick={() => setShowRosterUpload(true)}>
              <ScanLine className="w-5 h-5" />
            </Button>
          )}
          <ExportIncidentPDF incident={incident} units={units} radioLogs={radioLogs} department={department} />
          {!isReadOnly && (
            <Button variant="ghost" size="icon" className="h-10 w-10 text-red-400/70 hover:text-red-400 hover:bg-red-400/10" title="Close Incident" onClick={() => setShowClose(true)}>
              <Archive className="w-5 h-5" />
            </Button>
          )}
          {/* Side panel toggle (tablet) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidePanel(p => !p)}
            className="h-10 w-10 text-muted-foreground hover:text-foreground"
            title={showSidePanel ? 'Hide panel' : 'Show panel'}
          >
            {showSidePanel ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
          </Button>
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
        <div className="shrink-0 px-3 py-2.5 bg-secondary/40 border-b border-border/50">
          <RadioInput incidentId={incidentId} units={units} onTransmission={handleRadioTransmission} />
        </div>
      )}

      {/* ── PAR Alert ── */}
      {!isReadOnly && (
        <PARAlert lastRadioLogTime={radioLogs[0]?.created_date} onRequestPAR={handleRequestAllPAR} isReadOnly={isReadOnly} units={units} />
      )}

      {/* ── Main Content ── */}
      <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex-1 flex overflow-hidden relative">

        {/* Tactical Board */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <span className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase">Tactical Board</span>
              <span className="text-[10px] font-mono text-muted-foreground/50 bg-secondary px-2 py-0.5 rounded-full">{units.length} units</span>
            </div>
            {!isReadOnly && (
              <Button size="default" onClick={() => setShowAddUnit(true)} className="gap-1.5 text-sm h-10 px-4">
                <Plus className="w-4 h-4" /> Add Unit
              </Button>
            )}
          </div>

          {/* ── Structure Diagram with Divisions on each side ── */}
          {(() => {
            // The 4 sides. bottomSide is always rendered at bottom.
            // Opposite side goes to top. The other two go left/right.
            const sides = ['division_a', 'division_b', 'division_c', 'division_d'];
            const idx = sides.indexOf(bottomSide);
            const topSide    = sides[(idx + 2) % 4];
            const leftSide   = sides[(idx + 1) % 4];
            const rightSide  = sides[(idx + 3) % 4];

            const sideLabel = { division_a: 'Alpha', division_b: 'Bravo', division_c: 'Charlie', division_d: 'Delta' };
            const sideColor = {
              division_a: 'text-red-400',
              division_b: 'text-blue-400',
              division_c: 'text-green-400',
              division_d: 'text-yellow-400',
            };

            const divisionStaticClasses = {
              division_a: { active: 'text-red-400 bg-secondary/80 ring-1 ring-red-400/40', inactive: 'text-red-400/50 hover:text-red-400 hover:bg-secondary/50' },
              division_b: { active: 'text-blue-400 bg-secondary/80 ring-1 ring-blue-400/40', inactive: 'text-blue-400/50 hover:text-blue-400 hover:bg-secondary/50' },
              division_c: { active: 'text-green-400 bg-secondary/80 ring-1 ring-green-400/40', inactive: 'text-green-400/50 hover:text-green-400 hover:bg-secondary/50' },
              division_d: { active: 'text-yellow-400 bg-secondary/80 ring-1 ring-yellow-400/40', inactive: 'text-yellow-400/50 hover:text-yellow-400 hover:bg-secondary/50' },
            };

            const SideBtn = ({ division, position }) => {
              const isBottom = division === bottomSide;
              const posClass = {
                top:    'absolute top-1 left-1/2 -translate-x-1/2',
                bottom: 'absolute bottom-1 left-1/2 -translate-x-1/2',
                left:   'absolute left-1 top-1/2 -translate-y-1/2',
                right:  'absolute right-1 top-1/2 -translate-y-1/2',
              }[position];
              const cls = divisionStaticClasses[division];
              return (
                <button
                  onClick={() => setBottomSide(division)}
                  className={`${posClass} text-[11px] font-mono font-bold tracking-wider rounded px-1.5 py-0.5 transition-all min-w-[20px] text-center
                    ${isBottom ? cls.active : cls.inactive}`}
                  title={`Set Division ${sideLabel[division]} as front (bottom)`}
                >
                  {sideLabel[division]}
                </button>
              );
            };

            return (
              <div className="flex flex-col items-center gap-2">
                {/* Top */}
                <div className="w-full max-w-xs">
                <DivisionColumn assignment={topSide} units={units.filter(u => u.assignment === topSide)} onEditUnit={isReadOnly ? null : setEditingUnit} onUpdateUnit={isReadOnly ? null : (id, data) => updateUnit.mutate({ id, data })} allUnits={units} stationGroups={stationGroups} specialUnits={specialUnits} deptPrefix={deptPrefix} />
                </div>

                {/* Middle row */}
                <div className="w-full flex items-stretch gap-2">
                <div className="flex-1">
                  <DivisionColumn assignment={leftSide} units={units.filter(u => u.assignment === leftSide)} onEditUnit={isReadOnly ? null : setEditingUnit} onUpdateUnit={isReadOnly ? null : (id, data) => updateUnit.mutate({ id, data })} allUnits={units} stationGroups={stationGroups} specialUnits={specialUnits} deptPrefix={deptPrefix} />
                </div>

                  {/* Structure box */}
                  <div className="flex-shrink-0 w-32 flex items-center justify-center">
                    <div className="w-full aspect-square rounded-xl border-2 border-border/60 bg-secondary/30 flex flex-col items-center justify-center gap-1 relative">
                      <div className="grid grid-cols-3 gap-0.5 opacity-30">
                        {Array.from({length: 9}).map((_, i) => (
                          <div key={i} className="w-5 h-5 rounded-sm bg-foreground/60" />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground/50 mt-1 uppercase">Structure</span>
                      <SideBtn division={topSide}   position="top" />
                      <SideBtn division={bottomSide} position="bottom" />
                      <SideBtn division={leftSide}   position="left" />
                      <SideBtn division={rightSide}  position="right" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <DivisionColumn assignment={rightSide} units={units.filter(u => u.assignment === rightSide)} onEditUnit={isReadOnly ? null : setEditingUnit} onUpdateUnit={isReadOnly ? null : (id, data) => updateUnit.mutate({ id, data })} allUnits={units} stationGroups={stationGroups} specialUnits={specialUnits} deptPrefix={deptPrefix} />
                  </div>
                </div>

                {/* Bottom (front/address side) */}
                <div className="w-full max-w-xs">
                  <DivisionColumn assignment={bottomSide} units={units.filter(u => u.assignment === bottomSide)} onEditUnit={isReadOnly ? null : setEditingUnit} onUpdateUnit={isReadOnly ? null : (id, data) => updateUnit.mutate({ id, data })} allUnits={units} stationGroups={stationGroups} specialUnits={specialUnits} deptPrefix={deptPrefix} />
                </div>
              </div>
            );
          })()}

          {/* ── Operational Groups ── */}
          <div className="grid grid-cols-2 gap-2">
            {['roof', 'interior', 'rit', 'rehab', 'water_supply', 'ventilation', 'search', 'medical', 'staging', 'exposure', 'unassigned'].map(assignment => (
              <DivisionColumn
                key={assignment}
                assignment={assignment}
                units={units.filter(u => u.assignment === assignment)}
                onEditUnit={isReadOnly ? null : setEditingUnit}
                onUpdateUnit={isReadOnly ? null : (id, data) => updateUnit.mutate({ id, data })}
                allUnits={units}
                stationGroups={stationGroups}
                specialUnits={specialUnits}
                deptPrefix={deptPrefix}
              />
            ))}
          </div>
        </div>

        {/* Side Panel — slide-in overlay on tablet */}
        <div className={`
          absolute inset-y-0 right-0 z-20 w-[85vw] max-w-[480px]
          border-l border-border/50 flex flex-col overflow-hidden bg-card
          transition-transform duration-300 ease-in-out shadow-2xl
          ${showSidePanel ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <SidePanel
            units={units}
            radioLogs={radioLogs}
            isReadOnly={isReadOnly}
            onUpdateUnit={(unit, data) => updateUnit.mutate({ id: unit.id, data })}
            onRequestPAR={handleRequestAllPAR}
            onMarkUnitPAR={(unit) => updateUnit.mutate({ id: unit.id, data: { status: 'par', last_par_time: new Date().toISOString() } })}
          />
        </div>

        {/* Backdrop when side panel is open */}
        {showSidePanel && (
          <div
            className="absolute inset-0 z-10 bg-black/40"
            onClick={() => setShowSidePanel(false)}
          />
        )}
      </div>
      </DragDropContext>

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
          <EditIncidentDialog
            incident={incident}
            open={showEditIncident}
            onClose={() => setShowEditIncident(false)}
            onSave={(data) => {
              updateIncident.mutate(data, { onSuccess: () => setShowEditIncident(false) });
            }}
            isSaving={updateIncident.isPending}
          />
        </>
      )}
    </div>
  );
}