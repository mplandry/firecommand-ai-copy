import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Circle, Users, Wind } from 'lucide-react';

const UNIT_ICONS = {
  engine:'🚒', truck:'🪜', rescue:'🚑', squad:'🔧',
  deputy:'⭐', medic:'🏥', tanker:'💧', brush:'🌿', hazmat:'☣️', other:'🚐',
};

// Heuristic: mutual aid units often have a town prefix (CAM, ARL, LEX, BEL...)
// or notes starting with "Mutual Aid"
function isMutualAid(unit) {
  if (unit.notes?.toLowerCase().includes('mutual aid')) return true;
  if (/watertown/i.test(unit.unit_name)) return true;
  // Names like "CAM Engine 1", "ARL Ladder 1"
  const knownPrefixes = /^(CAM|ARL|LEX|BEL|NAT|NED|WAY|STO|WAL|WIN|WOB|MED|MAL|EVE|SOM|CHE|WES|NEE|FRA|MIL|MED|BRO|QUI|DEU|NEW|WAT|WTW)/i;
  const parts = unit.unit_name?.split(' ');
  if (parts?.length > 1 && knownPrefixes.test(parts[0])) return true;
  return false;
}

export default function PARChecklistDialog({ open, onClose, units, onConfirmPAR }) {
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState({});

  const { walthamUnits, mutualAidUnits } = useMemo(() => {
    const active = units.filter(u => ['on_scene', 'working', 'par', 'rehab', 'interior', 'staging'].includes(u.status) || ['on_scene','working','par','rehab'].includes(u.status));
    const mutual = active.filter(isMutualAid);
    const home   = active.filter(u => !isMutualAid(u));
    // Sort numerically by unit name (Engine 1, Engine 2, Ladder 1...)
    const sortUnits = arr => [...arr].sort((a, b) => a.unit_name.localeCompare(b.unit_name, undefined, { numeric: true }));
    return { walthamUnits: sortUnits(home), mutualAidUnits: sortUnits(mutual) };
  }, [units]);

  const allUnits = [...walthamUnits, ...mutualAidUnits];
  const checkedCount = allUnits.filter(u => checks[u.id]).length;

  const toggle = (id) => setChecks(c => ({ ...c, [id]: !c[id] }));
  const setNote = (id, val) => setNotes(n => ({ ...n, [id]: val }));

  const handleConfirm = () => {
    onConfirmPAR?.();
    setChecks({});
    setNotes({});
    onClose();
  };

  const handleClose = () => {
    setChecks({});
    setNotes({});
    onClose();
  };

  const UnitRow = ({ unit, index }) => {
    const isChecked = !!checks[unit.id];
    const personnel = unit.personnel_count || unit.personnel?.length || 0;
    return (
      <div
        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all cursor-pointer
          ${isChecked
            ? 'bg-emerald-500/10 border-emerald-500/40'
            : 'bg-secondary/30 border-border/60 hover:border-border'
          }`}
        onClick={() => toggle(unit.id)}
      >
        {/* Number */}
        <span className="text-[11px] font-mono font-bold text-muted-foreground/60 w-5 shrink-0 pt-0.5 text-right">
          {index + 1}.
        </span>

        {/* Check icon */}
        <div className="shrink-0 mt-0.5">
          {isChecked
            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
            : <Circle className="w-4 h-4 text-muted-foreground/40" />
          }
        </div>

        {/* Unit info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm leading-none">{UNIT_ICONS[unit.unit_type] || '🚐'}</span>
            <span className={`font-mono font-bold text-sm ${isChecked ? 'text-emerald-300' : 'text-foreground'}`}>
              {unit.unit_name}
            </span>
            {unit.officer && (
              <span className="text-[11px] text-muted-foreground font-mono">{unit.officer}</span>
            )}
            {personnel > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-mono text-green-400 font-bold">
                <Users className="w-3 h-3" />{personnel}
              </span>
            )}
            {unit.air_time && (
              <span className="flex items-center gap-0.5 text-[10px] font-mono text-amber-400">
                <Wind className="w-3 h-3" /> AIR
              </span>
            )}
          </div>
          {/* Notes field */}
          <div className="mt-1.5" onClick={e => e.stopPropagation()}>
            <Input
              value={notes[unit.id] || ''}
              onChange={e => setNote(unit.id, e.target.value)}
              placeholder="Notes (optional)"
              className="h-6 text-[11px] font-mono bg-background/40 border-border/40 px-2 py-0"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md w-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-widest uppercase flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            PAR Check — Unit Accountability
          </DialogTitle>
          <p className="text-[11px] font-mono text-muted-foreground">
            Click each unit when they report in. {checkedCount}/{allUnits.length} accounted for.
          </p>
        </DialogHeader>

        {/* Progress bar */}
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden shrink-0">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: allUnits.length ? `${(checkedCount / allUnits.length) * 100}%` : '0%' }}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Waltham Units */}
          {walthamUnits.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase mb-2 px-1">
                Waltham Units ({walthamUnits.length})
              </div>
              <div className="space-y-1.5">
                {walthamUnits.map((unit, i) => (
                  <UnitRow key={unit.id} unit={unit} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Mutual Aid Units */}
          {mutualAidUnits.length > 0 && (
            <div>
              <div className="text-[10px] font-mono font-bold tracking-widest text-cyan-400/70 uppercase mb-2 px-1 border-t border-border/40 pt-3">
                Mutual Aid Units ({mutualAidUnits.length})
              </div>
              <div className="space-y-1.5">
                {mutualAidUnits.map((unit, i) => (
                  <UnitRow key={unit.id} unit={unit} index={walthamUnits.length + i} />
                ))}
              </div>
            </div>
          )}

          {allUnits.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground/40 font-mono">
              No active units on scene
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose} className="font-mono text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            className={`font-mono text-xs gap-1.5 ${checkedCount === allUnits.length && allUnits.length > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Confirm PAR ({checkedCount}/{allUnits.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}