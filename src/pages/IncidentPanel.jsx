import React, { useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ShieldCheck, LayoutGrid, CheckCircle, Layers,
  Map, Siren, Camera, FlaskConical, Ambulance,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ICAccountabilitySummary from '@/components/command/ICAccountabilitySummary';
import StructureTactical from '@/components/command/StructureTactical';
import PARTracker from '@/components/command/PARTracker';
import FloorTracker from '@/components/command/FloorTracker';
import SiteMap from '@/components/command/SiteMap';
import RadioLogPanel from '@/components/command/RadioLogPanel';
import MaydayCommand from '@/components/command/MaydayCommand';
import PhotoPanel from '@/components/command/PhotoPanel';
import HazmatPanel from '@/components/command/HazmatPanel';
import MCIPanel from '@/components/command/MCIPanel';
import { useDepartment } from '@/hooks/useDepartment';

const BASE_TABS = [
  { id: 'ic',       label: 'IC Summary', icon: ShieldCheck },
  { id: 'tactical', label: 'Tactical',   icon: LayoutGrid  },
  { id: 'par',      label: 'PAR',        icon: CheckCircle },
  { id: 'floors',   label: 'Floors',     icon: Layers      },
  { id: 'sitemap',  label: 'Site Map',   icon: Map         },
  { id: 'photos',   label: 'Photos',     icon: Camera      },
];

export default function IncidentPanel() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'ic';
  const { specialUnits, dept } = useDepartment();
  const queryClient = useQueryClient();

  const { data: units = [] } = useQuery({
    queryKey: ['units', incidentId],
    queryFn: () => base44.entities.Unit.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const { data: radioLogs = [] } = useQuery({
    queryKey: ['radioLogs', incidentId],
    queryFn: () => base44.entities.RadioLog.filter({ incident_id: incidentId }, '-created_date', 100),
    enabled: !!incidentId,
    staleTime: 15000,
    refetchInterval: 15000,
  });

  const { data: incident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: (d) => d?.[0] || null,
    enabled: !!incidentId,
  });

  const incidentType = incident?.incident_type || 'structure_fire';

  // Dynamic tab list — inject Hazmat or MCI tab before Photos
  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (incidentType === 'hazmat') {
      tabs.splice(tabs.length - 1, 0, { id: 'hazmat', label: 'HazMat', icon: FlaskConical });
    } else if (incidentType === 'mci') {
      tabs.splice(tabs.length - 1, 0, { id: 'mci', label: 'MCI', icon: Ambulance });
    }
    return tabs;
  }, [incidentType]);

  // Mutation with cache invalidation so tactical board refreshes immediately
  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Unit.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units', incidentId] }),
  });

  const onUpdateUnit = (unit, data) => {
    const id = unit?.id ?? unit;
    updateUnitMutation.mutate({ id, data });
  };

  // Same status promotion logic as SidePanel / CommandBoard
  const handleMoveUnit = (unit, assignment) => {
    const data = { assignment };
    const now = new Date().toISOString();

    if (assignment === 'rehab' && unit.status !== 'rehab') {
      data.status = 'rehab';
      data.rehab_time = now;
    } else if (
      ['interior', 'roof', 'search', 'ventilation'].includes(assignment) &&
      ['dispatched', 'responding', 'on_scene', 'staging'].includes(unit.status)
    ) {
      data.status = 'working';
      if (!unit.on_scene_time) data.on_scene_time = now;
    } else if (
      ['division_a', 'division_b', 'division_c', 'division_d',
       'water_supply', 'rit', 'exposure', 'medical',
       'corner_ab', 'corner_ad', 'corner_bc', 'corner_cd'].includes(assignment) &&
      ['dispatched', 'responding', 'staging'].includes(unit.status)
    ) {
      data.status = 'on_scene';
      if (!unit.on_scene_time) data.on_scene_time = now;
    } else if (assignment === 'staging') {
      if (unit.status === 'dispatched' || unit.status === 'responding') {
        data.status = 'staging';
      }
    }

    onUpdateUnit(unit, data);
  };

  const isMayday = tab === 'mayday';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className={`border-b px-4 py-3 flex items-center gap-3 shrink-0 transition-colors ${
        isMayday ? 'bg-red-600 border-red-700' : 'bg-card border-border'
      }`}>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 text-xs shrink-0 ${isMayday ? 'text-white hover:bg-red-700' : 'text-muted-foreground'}`}
          onClick={() => navigate(`/incident/${incidentId}`)}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Board
        </Button>
        <div className="flex-1 min-w-0">
          {incident && (
            <p className={`text-xs font-mono truncate ${isMayday ? 'text-red-100' : 'text-muted-foreground'}`}>
              {incident.command_name || incident.address}
            </p>
          )}
        </div>

        {/* Tab bar in header */}
        <div className="flex gap-1 flex-wrap justify-end">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSearchParams({ tab: id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold uppercase tracking-wider transition-colors
                ${tab === id
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : isMayday
                    ? 'text-red-100 hover:text-white hover:bg-red-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}

          {/* MAYDAY tab — always red */}
          <button
            onClick={() => setSearchParams({ tab: 'mayday' })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold uppercase tracking-wider transition-colors
              ${isMayday
                ? 'bg-white text-red-600 border border-white'
                : 'text-red-500 hover:text-red-600 hover:bg-red-50 border border-red-200'
              }`}
          >
            <Siren className="w-3.5 h-3.5" />
            MAYDAY
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'ic' && (
          <div className="max-w-4xl mx-auto p-6 space-y-4">
            <ICAccountabilitySummary units={units} />
            <RadioLogPanel logs={radioLogs} isReadOnly />
          </div>
        )}

        {tab === 'tactical' && (
          <div className="max-w-2xl mx-auto p-6">
            <StructureTactical
              units={units}
              onUpdateUnit={onUpdateUnit}
            />
          </div>
        )}

        {tab === 'par' && (
          <div className="max-w-2xl mx-auto p-6">
            <PARTracker
              units={units}
              onRequestPAR={() => {
                const workingUnits = units.filter(u => ['on_scene', 'working', 'par'].includes(u.status));
                workingUnits.forEach(u => onUpdateUnit(u, { status: 'par', last_par_time: new Date().toISOString() }));
              }}
              onMarkUnitPAR={(unit) => onUpdateUnit(unit, { status: 'par', last_par_time: new Date().toISOString() })}
            />
          </div>
        )}

        {tab === 'floors' && (
          <div className="max-w-3xl mx-auto p-6">
            <FloorTracker
              units={units}
              onUpdateUnit={onUpdateUnit}
              specialUnits={specialUnits}
            />
          </div>
        )}

        {tab === 'sitemap' && (
          <div className="h-[calc(100vh-57px)] flex flex-col">
            <SiteMap
              units={units}
              isReadOnly={false}
              incidentId={incidentId}
              onMoveUnit={handleMoveUnit}
            />
          </div>
        )}

        {tab === 'photos' && (
          <div className="max-w-4xl mx-auto p-6">
            <PhotoPanel isReadOnly={false} />
          </div>
        )}

        {tab === 'hazmat' && (
          <div className="max-w-4xl mx-auto p-6">
            <HazmatPanel isReadOnly={false} />
          </div>
        )}

        {tab === 'mci' && (
          <div className="max-w-4xl mx-auto p-6">
            <MCIPanel units={units} isReadOnly={false} />
          </div>
        )}

        {tab === 'mayday' && (
          <div className="max-w-4xl mx-auto p-6">
            <MaydayCommand
              units={units}
              onUpdateUnit={onUpdateUnit}
              deptName={dept?.name || 'Fire Department'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
