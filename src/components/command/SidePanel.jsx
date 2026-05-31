import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldCheck,
  LayoutGrid,
  CheckCircle,
  Layers,
  Map,
  Siren,
  Camera,
  FlaskConical,
  Ambulance,
  Car,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMayday } from "@/contexts/MaydayContext";
import PARCountdownTimer from "./PARCountdownTimer";

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
  const [maydayActive, setMaydayActive] = useState(false);
  const navigate = useNavigate();
  const { incidentId } = useParams();
  const { state: maydayState } = useMayday();

  const incidentType = incident?.incident_type || 'structure_fire';

  const goToPanel = (tabId) => navigate(`/incident/${incidentId}/panel?tab=${tabId}`);

  // Build tab list — inject Hazmat or MCI tab right before Photos
  const TABS = useMemo(() => {
    const tabs = [...BASE_TABS];
    if (incidentType === 'hazmat') {
      tabs.splice(tabs.length - 1, 0, { id: 'hazmat', label: 'HazMat', icon: FlaskConical });
    } else if (incidentType === 'mci') {
      tabs.splice(tabs.length - 1, 0, { id: 'mci', label: 'MCI', icon: Ambulance });
    } else if (incidentType === 'vehicle_fire') {
      tabs.splice(tabs.length - 1, 0, { id: 'mva', label: 'MVA', icon: Car });
    }
    return tabs;
  }, [incidentType]);

  // When CommandBoard fires the backfill picker trigger, jump to MAYDAY panel
  useEffect(() => {
    if (maydayState.backfillPickerOpen) {
      goToPanel('mayday');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maydayState.backfillPickerOpen]);

  // Track the most recent radio log timestamp to reset PAR timer
  const lastRadioLogTime = useMemo(() => {
    if (!radioLogs?.length) return null;
    const sorted = [...radioLogs].sort(
      (a, b) => new Date(b.created_date) - new Date(a.created_date),
    );
    return sorted[0]?.created_date || null;
  }, [radioLogs]);

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

      {/* Tab bar — each tab navigates to the full-screen expanded panel */}
      <div className='flex border-b border-border shrink-0 overflow-x-auto'>
        {TABS.map(({ id, label, icon: Icon }) => {
          const isHazmat = id === 'hazmat';
          const isMCI = id === 'mci';
          return (
            <button
              key={id}
              onClick={() => goToPanel(id)}
              className={`flex-1 min-w-fit flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors whitespace-nowrap px-2
                ${isHazmat
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
          onClick={() => goToPanel('mayday')}
          className={`flex-1 min-w-fit flex flex-col items-center gap-0.5 py-2.5 px-2 text-[10px] font-mono font-semibold uppercase tracking-wider transition-all whitespace-nowrap
            ${maydayActive
              ? "text-red-600 border-b-2 border-red-500 bg-red-50 animate-pulse"
              : "text-red-500 hover:text-red-600 hover:bg-red-50 border-b-2 border-transparent"
            }`}
        >
          <Siren className='w-4 h-4' />
          MAYDAY
        </button>
      </div>

      {/* Panel body — brief prompt to tap a tab above */}
      <div className='flex-1 flex items-center justify-center p-4'>
        <p className='text-[11px] font-mono text-muted-foreground/40 tracking-wider text-center'>
          TAP A TAB TO OPEN
        </p>
      </div>
    </div>
  );
}
