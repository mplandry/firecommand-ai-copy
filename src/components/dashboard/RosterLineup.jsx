import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

const unitTypeLabel = {
  engine: 'ENG', truck: 'TRK', rescue: 'RSC', squad: 'SQD',
  deputy: 'DEP', medic: 'MED', tanker: 'TNK', brush: 'BRS',
  hazmat: 'HZM', other: 'OTH',
};

const unitTypeColor = {
  engine:  'text-red-400 bg-red-500/10 border-red-500/30',
  truck:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  rescue:  'text-blue-400 bg-blue-500/10 border-blue-500/30',
  squad:   'text-orange-400 bg-orange-500/10 border-orange-500/30',
  deputy:  'text-purple-400 bg-purple-500/10 border-purple-500/30',
  medic:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  tanker:  'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  brush:   'text-lime-400 bg-lime-500/10 border-lime-500/30',
  hazmat:  'text-amber-400 bg-amber-500/10 border-amber-500/30',
  other:   'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

function getCurrentShift() {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'day' : 'night';
}

function UnitRow({ entry }) {
  const [expanded, setExpanded] = React.useState(false);
  const typeColor = unitTypeColor[entry.unit_type] || unitTypeColor.other;
  const crew = entry.personnel || [];
  const total = entry.personnel_count || crew.length || 0;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 px-3 py-2.5 bg-secondary/20 cursor-pointer hover:bg-secondary/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${typeColor}`}>
          {unitTypeLabel[entry.unit_type] || 'OTH'}
        </span>
        <span className="font-mono font-bold text-sm text-foreground flex-1 truncate">{entry.unit_name}</span>
        {entry.officer && (
          <span className="text-xs font-mono text-muted-foreground truncate hidden sm:block max-w-[140px]">
            {entry.officer_rank ? `${entry.officer_rank} ` : ''}{entry.officer}
          </span>
        )}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{total}</span>
          {crew.length > 0 && (
            expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-card border-t border-border/40 flex flex-col gap-2.5">
           {entry.officer && (
             <div className="flex items-center gap-3">
               <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider w-14 shrink-0">Officer</span>
               <span className="text-sm font-mono text-foreground">
                 {entry.officer_rank ? `${entry.officer_rank} ` : ''}{entry.officer}
               </span>
             </div>
           )}
           {crew.length > 0 ? (
             crew.map((name, i) => (
               <div key={i} className="flex items-center gap-3">
                 <span className="text-[10px] font-mono text-muted-foreground w-14 shrink-0">FF {i + 1}</span>
                 <span className="text-sm font-mono text-foreground">{name}</span>
               </div>
             ))
           ) : (
             <p className="text-xs font-mono text-muted-foreground italic">No personnel listed</p>
           )}
           {entry.notes && (
             <p className="text-xs font-mono text-muted-foreground mt-2 border-t border-border/40 pt-2">{entry.notes}</p>
           )}
        </div>
      )}
    </div>
  );
}

export default function RosterLineup() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const shift = getCurrentShift();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['roster-lineup', today, shift],
    queryFn: () => base44.entities.Roster.filter({ shift_date: today, shift }, 'unit_name', 100),
    refetchInterval: 60000,
  });

  const shiftLabel = shift === 'day' ? 'DAY SHIFT' : 'NIGHT SHIFT';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-secondary/20">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-mono font-bold text-sm tracking-wider text-foreground">TODAY'S ROSTER</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 tracking-wider">
            {shiftLabel}
          </span>
          <span className="text-xs font-mono text-muted-foreground">{format(new Date(), 'MMM d')}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <p className="text-xs font-mono text-muted-foreground text-center py-6">Loading roster...</p>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs font-mono text-muted-foreground">No roster set for today's {shift} shift</p>
          </div>
        ) : (
          entries.map(entry => <UnitRow key={entry.id} entry={entry} />)
        )}
      </div>

      {entries.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-secondary/10 flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">
            {entries.length} units · {entries.reduce((s, e) => s + (e.personnel_count || e.personnel?.length || 0), 0)} personnel
          </span>
        </div>
      )}
    </div>
  );
}