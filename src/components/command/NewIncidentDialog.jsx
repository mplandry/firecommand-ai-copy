import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// Full Waltham apparatus roster
const WAL_APPARATUS = [
  { unit_name: 'WAL C2',          unit_type: 'deputy',  personnel_count: 2 },
  { unit_name: 'WAL Engine 1',    unit_type: 'engine',  personnel_count: 4 },
  { unit_name: 'WAL Engine 2',    unit_type: 'engine',  personnel_count: 4 },
  { unit_name: 'WAL Engine 3',    unit_type: 'engine',  personnel_count: 4 },
  { unit_name: 'WAL Engine 4',    unit_type: 'engine',  personnel_count: 4 },
  { unit_name: 'WAL Squad 5',     unit_type: 'squad',   personnel_count: 4 },
  { unit_name: 'WAL Engine 7',    unit_type: 'engine',  personnel_count: 4 },
  { unit_name: 'WAL Engine 8',    unit_type: 'engine',  personnel_count: 4 },
  { unit_name: 'WAL Rescue 1',    unit_type: 'rescue',  personnel_count: 4 },
  { unit_name: 'WAL Tower 1',     unit_type: 'truck',   personnel_count: 4 },
  { unit_name: 'WAL Ladder 2',    unit_type: 'truck',   personnel_count: 4 },
  { unit_name: 'WAL Ladder 3',    unit_type: 'truck',   personnel_count: 4 },
  { unit_name: 'WAL Moody Boat',  unit_type: 'other',   personnel_count: 2 },
  { unit_name: 'WAL Central Boat',unit_type: 'other',   personnel_count: 2 },
  { unit_name: 'WAL RTV',         unit_type: 'other',   personnel_count: 2 },
];

const TYPE_COLOR = {
  engine:  'text-red-400 border-red-500/40 bg-red-500/10',
  truck:   'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  rescue:  'text-blue-400 border-blue-500/40 bg-blue-500/10',
  squad:   'text-orange-400 border-orange-500/40 bg-orange-500/10',
  deputy:  'text-purple-400 border-purple-500/40 bg-purple-500/10',
  medic:   'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  other:   'text-slate-400 border-slate-500/40 bg-slate-500/10',
};

const EMPTY_FORM = { address: '', incident_type: 'structure_fire', alarm_level: '1st_alarm', ic_name: '', command_name: '' };

export default function NewIncidentDialog({ open, onClose, onCreate, isCreating = false, createError = null }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedUnits, setSelectedUnits] = useState(WAL_APPARATUS.map(u => u.unit_name));

  const toggleUnit = (unitName) => {
    setSelectedUnits(prev =>
      prev.includes(unitName) ? prev.filter(u => u !== unitName) : [...prev, unitName]
    );
  };

  const handleCreate = () => {
    if (!form.address.trim()) return;
    const commandName = form.command_name || form.address.split(' ').slice(0, 2).join(' ') + ' Command';

    const onSceneTime = new Date().toISOString();
    const units = WAL_APPARATUS.map(u =>
      selectedUnits.includes(u.unit_name)
        ? { ...u, assignment: 'unassigned', status: 'dispatched' }
        : { ...u, assignment: 'division_a', status: 'on_scene', on_scene_time: onSceneTime }
    );

    onCreate({
      ...form,
      command_name: commandName,
      status: 'active',
      started_at: new Date().toISOString(),
      _template: units.length > 0 ? { units } : null,
    });
    // Note: form is reset when dialog closes (handleClose), not here
    // so the user can see what they entered while the API call is in flight
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setSelectedUnits(WAL_APPARATUS.map(u => u.unit_name));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={isCreating ? undefined : handleClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono">New Incident</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs font-mono">Address *</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="123 Main Street"
              className="bg-secondary font-mono"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div>
            <Label className="text-xs font-mono">Command Name</Label>
            <Input
              value={form.command_name}
              onChange={(e) => setForm({ ...form, command_name: e.target.value })}
              placeholder="Auto-generated from address"
              className="bg-secondary font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Incident Type</Label>
              <Select value={form.incident_type} onValueChange={(v) => setForm({ ...form, incident_type: v })}>
                <SelectTrigger className="bg-secondary font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="structure_fire">Structure Fire</SelectItem>
                  <SelectItem value="wildland_fire">Wildland Fire</SelectItem>
                  <SelectItem value="vehicle_fire">Vehicle Fire</SelectItem>
                  <SelectItem value="hazmat">HazMat</SelectItem>
                  <SelectItem value="rescue">Rescue</SelectItem>
                  <SelectItem value="mci">MCI</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono">Alarm Level</Label>
              <Select value={form.alarm_level} onValueChange={(v) => setForm({ ...form, alarm_level: v })}>
                <SelectTrigger className="bg-secondary font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st_alarm">Working Fire</SelectItem>
                  <SelectItem value="2nd_alarm">2nd Alarm</SelectItem>
                  <SelectItem value="3rd_alarm">3rd Alarm</SelectItem>
                  <SelectItem value="4th_alarm">4th Alarm</SelectItem>
                  <SelectItem value="5th_alarm">5th Alarm</SelectItem>
                  <SelectItem value="task_force">Task Force</SelectItem>
                  <SelectItem value="strike_team">Strike Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-mono">Incident Commander</Label>
            <Input
              value={form.ic_name}
              onChange={(e) => setForm({ ...form, ic_name: e.target.value })}
              placeholder="Chief Smith"
              className="bg-secondary font-mono"
            />
          </div>

          {/* 1st Alarm Unit Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-mono">1st Alarm Units</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUnits(WAL_APPARATUS.map(u => u.unit_name))}
                  className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors"
                >
                  All
                </button>
                <span className="text-[10px] font-mono text-muted-foreground">/</span>
                <button
                  type="button"
                  onClick={() => setSelectedUnits([])}
                  className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  None
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WAL_APPARATUS.map((u) => {
                const selected = selectedUnits.includes(u.unit_name);
                const colorClass = TYPE_COLOR[u.unit_type] || TYPE_COLOR.other;
                return (
                  <button
                    key={u.unit_name}
                    type="button"
                    onClick={() => toggleUnit(u.unit_name)}
                    className={`text-[11px] font-mono px-2 py-1 rounded border transition-all ${
                      selected
                        ? colorClass
                        : 'text-muted-foreground border-border/40 bg-secondary/30 hover:border-border'
                    }`}
                  >
                    {u.unit_name.replace('WAL ', '')}
                  </button>
                );
              })}
            </div>
            {selectedUnits.length > 0 && (
              <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                {selectedUnits.length} unit{selectedUnits.length !== 1 ? 's' : ''} selected — dispatched, unassigned
              </p>
            )}
          </div>
        </div>

        {createError && (
          <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
            {createError}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.address.trim() || isCreating}>
            {isCreating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating…</>
            ) : (
              'Start Incident'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}