import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  LayoutGrid,
  CheckCircle,
  Layers,
  Map,
  Maximize2,
  Siren,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ICAccountabilitySummary from "./ICAccountabilitySummary";
import StructureTactical from "./StructureTactical";
import PARTracker from "./PARTracker";
import FloorTracker from "./FloorTracker";
import RadioLogPanel from "./RadioLogPanel";
import PARCountdownTimer from "./PARCountdownTimer";
import SiteMap from "./SiteMap";
import MaydayCommand from "./MaydayCommand";

const TABS = [
  { id: "ic", label: "IC Summary", icon: ShieldCheck },
  { id: "tactical", label: "Tactical", icon: LayoutGrid },
  { id: "par", label: "PAR", icon: CheckCircle },
  { id: "floors", label: "Floors", icon: Layers },
  { id: "sitemap", label: "Site Map", icon: Map },
];

export default function SidePanel({
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
      <div className='flex border-b border-border shrink-0'>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors
              ${
                activeTab === id
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-b-2 border-transparent"
              }`}
          >
            <Icon className='w-4 h-4' />
            {label}
          </button>
        ))}

        {/* MAYDAY tab — always red, always prominent */}
        <button
          onClick={() => setActiveTab("mayday")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider transition-all
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
          className='px-2 py-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-b-2 border-transparent transition-colors'
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
          />
        )}
        {activeTab === "sitemap" && (
          <SiteMap
            units={units}
            isReadOnly={isReadOnly}
            onMoveUnit={
              isReadOnly
                ? null
                : (unit, assignment) => onUpdateUnit(unit, { assignment })
            }
          />
        )}
        {activeTab === "mayday" && (
          <MaydayCommand onActiveChange={setMaydayActive} />
        )}
      </div>
    </div>
  );
}
