import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, LayoutGrid, CheckCircle, Layers, Map, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ICAccountabilitySummary from '@/components/command/ICAccountabilitySummary';
import StructureTactical from '@/components/command/StructureTactical';
import PARTracker from '@/components/command/PARTracker';
import FloorTracker from '@/components/command/FloorTracker';
import SiteMap from '@/components/command/SiteMap';
import RadioLogPanel from '@/components/command/RadioLogPanel';
import MaydayCommand from '@/components/command/MaydayCommand';
import { useDepartment } from '@/hooks/useDepartment';

const TABS = [
  { id: 'ic',       label: 'IC Summary', icon: ShieldCheck },
  { id: 'tactical', label: 'Tactical',   icon: LayoutGrid  },
  { id: 'par',      label: 'PAR',        icon: CheckCircle },
  { id: 'floors',   label: 'Floors',     icon: Layers      },
  { id: 'sitemap',  label: 'Site Map',   icon: Map         },
];

export default function IncidentPanel() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'ic';
  const { specialUnits } = useDepartment();

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

  const updateUnit = async (unit, data) => {
    await base44.entities.Unit.update(unit.id, data);
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
          className={`gap-1.5 text-xs ${isMayday ? 'text-white hover:bg-red-700' : 'text-muted-foreground'}`}
          onClick={() => navigate(`/incident/${incidentId}`)}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Board
        </Button>
        <div className="flex-1">
          {incident && (
            <p className={`text-xs font-mono ${isMayday ? 'text-red-100' : 'text-muted-foreground'}`}>
              {incident.command_name || incident.address}
            </p>
          )}
        </div>

        {/* Tab bar in header */}
        <div className="flex gap-1 flex-wrap">
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
              onUpdateUnit={(unit, data) => updateUnit(unit, data)}
            />
          </div>
        )}

        {tab === 'par' && (
          <div className="max-w-2xl mx-auto p-6">
            <PARTracker
              units={units}
              onRequestPAR={() => {
                const workingUnits = units.filter(u => ['on_scene', 'working', 'par'].includes(u.status));
                workingUnits.forEach(u => base44.entities.Unit.update(u.id, { status: 'par', last_par_time: new Date().toISOString() }));
              }}
              onMarkUnitPAR={(unit) => base44.entities.Unit.update(unit.id, { status: 'par', last_par_time: new Date().toISOString() })}
            />
          </div>
        )}

        {tab === 'floors' && (
          <div className="max-w-3xl mx-auto p-6">
            <FloorTracker
              units={units}
              onUpdateUnit={(unit, data) => updateUnit(unit, data)}
              specialUnits={specialUnits}
            />
          </div>
        )}

        {tab === 'sitemap' && (
          <div className="h-[calc(100vh-57px)] flex flex-col">
            <SiteMap units={units} isReadOnly={false} />
          </div>
        )}

        {tab === 'mayday' && (
          <div className="max-w-4xl mx-auto p-6">
            <MaydayCommand />
          </div>
        )}
      </div>
    </div>
  );
}
