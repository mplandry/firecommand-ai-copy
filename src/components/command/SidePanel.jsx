import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  LayoutGrid,
  CheckCircle,
  Layers,
  Map,
  Maximize2,
  Siren,
  Camera,
  FlaskConical,
  Ambulance,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDepartment } from "@/hooks/useDepartment";
import { useMayday } from "@/contexts/MaydayContext";
import ICAccountabilitySummary from "./ICAccountabilitySummary";
import StructureTactical from "./StructureTactical";
import PARTracker from "./PARTracker";
import FloorTracker from "./FloorTracker";
import RadioLogPanel from "./RadioLogPanel";
import PARCountdownTimer from "./PARCountdownTimer";
import SiteMap from "./SiteMap";
import MaydayCommand from "./MaydayCommand";
import PhotoPanel from "./PhotoPanel";
import HazmatPanel from "./HazmatPanel";
import MCIPanel from "./MCIPanel";

const BASE_TABS = [
  { id: "ic",      label: "IC",      icon: ShieldCheck },
  { id: "tactical",label: "Tactical",icon: LayoutGrid  },
  { id: "par",     label: "PAR",     icon: CheckCircle },
  { id: "floors",  label: "Floors",  icon: Layers      },
  { id: "sitemap", label: "Map",     icon: Map         },
  { id: "photos",  label: "Photos",  icon: Camera      },
];

export default function SidePanel({
  incident,
  units,
  radioLogs,
  isReadOnly,
  onUpdateUnit,
  onRequestPAR,
  onMarkUnitPAR,
}) {
  const [activeTab, setActiveTab] = useState("ic");
  const [maydayActive, setMaydayActive] = useState(false);
  const navigate = useNavigate();
  const { incidentId } = useParams();
  const { specialUnits, dept } = useDepartment();
  const { state: maydayState } = useMayday();

  const incidentType = incident?.incident_type || 'structure_fire';

  // Build tab list — inject Hazmat or MCI tab right before Photos
  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (incidentType === 'hazmat') {
      tabs.splice(tabs.length - 1, 0, { id: 'hazmat', label: 'HazMat', icon: FlaskConical });
    } else if (incidentType === 'mci') {
      tabs.splice(tabs.length - 1, 0, { id: 'mci', label: 'MCI', icon: Ambulance });
    }
    return tabs;
  }, [incidentType]);

  // When CommandBoard fires the backfill picker trigger, jump to MAYDAY tab
  useEffect(() => {
    if (maydayState.backfillPickerOpen) {
      setActiveTab("mayday");
    }
  }, [maydayState.backfillPickerOpen]);

  // Auto-switch to hazmat/mci tab when incident type changes
  useEffect(() => {
    if (incidentType === 'hazmat') setActiveTab('hazmat');
    else if (incidentType === 'mci') setActiveTab('mci');
  }, [incidentType]);

  // Track the most recent radio log timestamp to reset PAR timer
  const lastRadioLogTime = useMemo(() => {
    if (!radioLogs?.length) return null;
    const sorted = [...radioLogs].sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date),
    );
    return sorted[0]?.created_date || null;
  }, [radioLogs]);

  const isMayday = activeTab === "mayday";

  return (
    <div className='flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/50'>
      {/* PAR Countdown — always visible above tabs */}
      {!isReadOnly && (
        <PARCountdownTimer
          lastRadioLogTime={lastRadioLogTime}
          onRequestPAR={onRequestPAR}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Tab bar */}
      <div className='flex border-b border-border shrink-0 overflow-x-auto'>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isHazmat = id === 'hazmat';
          const isMCI = id === 'mci';
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 min-w-fit flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors whitespace-nowrap px-2
                ${activeTab === id
                  ? isHazmat
                    ? "text-orange-400 border-b-2 border-orange-400 bg-orange-400/5"
                    : isMCI
                      ? "text-blue-400 border-b-2 border-blue-400 bg-blue-400/5"
                      : "text-primary border-b-2 border-primary bg-primary/5"
                  : isHazmat
                    ? "text-orange-400/70 hover:text-orange-400 hover:bg-orange-400/5 border-b-2 border-transparent"
                    : isMCI
                      ? "text-blue-400/70 hover:text-blue-400 hover:bg-blue-400/5 border-b-2 border-transparent"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-b-2 border-transparent"
                }`}
            >
              <Icon className='w-4 h-4' />
              {label}
            </button>
          );
        })}

        {/* MAYDAY tab — always red, always prominent */}
        <button
          onClick={() => setActiveTab("mayday")}
          className={`flex-1 min-w-fit flex flex-col items-center gap-0.5 py-2.5 px-2 text-[10px] font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap
            ${
              isMayday
                ? "text-white bg-red-600 border-b-2 border-red-600"
                : maydayActive
                  ? "text-red-600 border-b-2 border-red-500 bg-red-50 animate-pulse"
                  : "text-red-500 hover:text-red-600 hover:bg-red-50 border-b-2 border-transparent"
            }`}
        >
          <Siren className='w-4 h-4' />
          MAYDAY
        </button>

        <button
          onClick={() =>
            navigate(`/incident/${incidentId}/panel?tab=${activeTab}`)
          }
          className='px-2 py-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-b-2 border-transparent transition-colors shrink-0'
          title='Expand to full page'
        >
          <Maximize2 className='w-3.5 h-3.5' />
        </button>
      </div>

      {/* Panel content */}
      <div className='flex-1 overflow-y-auto p-3 space-y-3'>
        {activeTab === "ic" && (
          <>
            <ICAccountabilitySummary units={units} />
            <RadioLogPanel logs={radioLogs} isReadOnly={isReadOnly} />
          </>
        )}
        {activeTab === "tactical" && (
          <StructureTactical
            units={units}
            onUpdateUnit={isReadOnly ? null : onUpdateUnit}
          />
        )}
        {activeTab === "par" && (
          <PARTracker
            units={units}
            onRequestPAR={isReadOnly ? null : onRequestPAR}
            onMarkUnitPAR={isReadOnly ? null : onMarkUnitPAR}
          />
        )}
        {activeTab === "floors" && (
          <FloorTracker
            units={units}
            onUpdateUnit={isReadOnly ? null : onUpdateUnit}
            specialUnits={specialUnits}
          />
        )}
        {activeTab === "sitemap" && (
          <SiteMap
            units={units}
            isReadOnly={isReadOnly}
            incidentId={incidentId}
            onMoveUnit={
              isReadOnly
                ? null
                : (unit, assignment) => {
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
                  }
            }
          />
        )}
        {activeTab === "photos" && (
          <PhotoPanel isReadOnly={isReadOnly} />
        )}
        {/* Hazmat panel — only for hazmat incidents */}
        {activeTab === "hazmat" && (
          <HazmatPanel isReadOnly={isReadOnly} />
        )}
        {/* MCI panel — only for MCI incidents */}
        {activeTab === "mci" && (
          <MCIPanel units={units} isReadOnly={isReadOnly} />
        )}
        {/* Always mounted to preserve LIPS/checklist state across tab switches */}
        <div className={activeTab === "mayday" ? "" : "hidden"}>
          <MaydayCommand
            onActiveChange={setMaydayActive}
            units={units}
            onUpdateUnit={isReadOnly ? null : onUpdateUnit}
            deptName={dept?.name || 'Fire Department'}
          />
        </div>
      </div>
    </div>
  );
}
