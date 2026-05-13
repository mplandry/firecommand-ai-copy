import React, { useState } from 'react';
import { ShieldCheck, LayoutGrid, CheckCircle, Layers } from 'lucide-react';
import ICAccountabilitySummary from './ICAccountabilitySummary';
import StructureTactical from './StructureTactical';
import PARTracker from './PARTracker';
import FloorTracker from './FloorTracker';
import RadioLogPanel from './RadioLogPanel';

const TABS = [
  { id: 'ic',       label: 'IC Summary',  icon: ShieldCheck },
  { id: 'tactical', label: 'Tactical',    icon: LayoutGrid  },
  { id: 'par',      label: 'PAR',         icon: CheckCircle },
  { id: 'floors',   label: 'Floors',      icon: Layers      },
];

export default function SidePanel({ units, radioLogs, isReadOnly, onUpdateUnit, onRequestPAR }) {
  const [activeTab, setActiveTab] = useState('ic');

  return (
    <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/50">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors
              ${activeTab === id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border-b-2 border-transparent'
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'ic' && (
          <>
            <ICAccountabilitySummary units={units} />
            <RadioLogPanel logs={radioLogs} isReadOnly={isReadOnly} />
          </>
        )}
        {activeTab === 'tactical' && (
          <StructureTactical
            units={units}
            onUpdateUnit={isReadOnly ? null : onUpdateUnit}
          />
        )}
        {activeTab === 'par' && (
          <PARTracker units={units} onRequestPAR={isReadOnly ? null : onRequestPAR} />
        )}
        {activeTab === 'floors' && (
          <FloorTracker
            units={units}
            onUpdateUnit={isReadOnly ? null : onUpdateUnit}
          />
        )}
      </div>
    </div>
  );
}