import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertTriangle } from 'lucide-react';
import { getAutoAssignment } from '@/lib/statusAssignment';

const alarmLevels = [
  { value: '1st_alarm', label: '1st Alarm' },
  { value: '2nd_alarm', label: '2nd Alarm' },
  { value: '3rd_alarm', label: '3rd Alarm' },
  { value: '4th_alarm', label: '4th Alarm' },
  { value: '5th_alarm', label: '5th Alarm' },
  { value: 'task_force', label: 'Task Force' },
  { value: 'strike_team', label: 'Strike Team' },
];

const assignments = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'staging', label: 'Staging' },
  { value: 'division_a', label: 'Alpha' },
  { value: 'division_b', label: 'Bravo' },
  { value: 'division_c', label: 'Charlie' },
  { value: 'division_d', label: 'Delta' },
  { value: 'roof', label: 'Roof' },
  { value: 'interior', label: 'Interior' },
  { value: 'rit', label: 'RIT / IRIC' },
  { value: 'rehab', label: 'Rehab' },
  { value: 'water_supply', label: 'Water Supply' },
  { value: 'ventilation', label: 'Ventilation' },
  { value: 'search', label: 'Search & Rescue' },
  { value: 'medical', label: 'Medical Group' },
  { value: 'exposure', label: 'Exposure' },
];

const statuses = [
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'responding', label: 'Responding' },
  { value: 'on_scene', label: 'On Scene' },
  { value: 'working', label: 'Working' },
  { value: 'par', label: 'PAR' },
  { value: 'mayday', label: '⚠️ MAYDAY' },
  { value: 'available', label: 'Available' },
  { value: 'rehab', label: 'Rehab' },
  { value: 'out_of_service', label: 'Out of Service' },
];

export default function EditUnitDialog({ unit, open, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (unit) { setForm({ ...unit }); setConfirmDelete(false); }
  }, [unit]);

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono">{unit.unit_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-mono">Unit Name</Label>
            <Input
                value={form.unit_name || ''}
                onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                className="bg-secondary font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">Alarm Level</Label>
              <Select value={form.alarm_level || '1st_alarm'} onValueChange={(v) => setForm({ ...form, alarm_level: v })}>
                <SelectTrigger className="bg-secondary font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {alarmLevels.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Status</Label>
              <Select value={form.status} onValueChange={(v) => {
                const autoAssign = getAutoAssignment(v, form.assignment);
                const extra = {};
                if (autoAssign) extra.assignment = autoAssign;
                if (v === 'rehab' && form.status !== 'rehab') extra.rehab_time = new Date().toISOString();
                if ((v === 'on_scene' || v === 'working') && !form.on_scene_time) extra.on_scene_time = new Date().toISOString();
                setForm({ ...form, status: v, ...extra });
              }}>
                <SelectTrigger className="bg-secondary font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono">Assignment</Label>
              <Select value={form.assignment} onValueChange={(v) => {
                const extra = {};
                if (v === 'roof') extra.floor = 'Roof';
                else if (form.assignment === 'roof' && v !== 'roof') extra.floor = '';
                // Auto-set status when dragged to rehab
                if (v === 'rehab' && form.status !== 'rehab') {
                  extra.status = 'rehab';
                  extra.rehab_time = new Date().toISOString();
                }
                // Clear rehab_time when leaving rehab
                if (v !== 'rehab' && form.assignment === 'rehab') {
                  extra.rehab_time = null;
                }
                setForm({ ...form, assignment: v, ...extra });
              }}>
                <SelectTrigger className="bg-secondary font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Officer</Label>
              <Input
                value={form.officer || ''}
                onChange={(e) => setForm({ ...form, officer: e.target.value })}
                className="bg-secondary font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">Personnel</Label>
              <Input
                type="number"
                value={form.personnel_count || ''}
                onChange={(e) => setForm({ ...form, personnel_count: parseInt(e.target.value) || 0 })}
                className="bg-secondary font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-mono">Floor / Level</Label>
            <Select value={form.floor || 'none'} onValueChange={(v) => {
              const floor = v === 'none' ? '' : v;
              const extra = { floor };
              // Sync: selecting Roof floor → set assignment to roof
              if (floor === 'Roof') extra.assignment = 'roof';
              // Sync: clearing floor away from Roof → clear roof assignment
              if (floor !== 'Roof' && form.floor === 'Roof' && form.assignment === 'roof') extra.assignment = 'unassigned';
              setForm({ ...form, ...extra });
            }}>
              <SelectTrigger className="bg-secondary font-mono text-xs">
                <SelectValue placeholder="No floor assigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No floor —</SelectItem>
                <SelectItem value="Basement">Basement</SelectItem>
                <SelectItem value="1st Floor">1st Floor</SelectItem>
                <SelectItem value="2nd Floor">2nd Floor</SelectItem>
                <SelectItem value="3rd Floor">3rd Floor</SelectItem>
                <SelectItem value="4th Floor">4th Floor</SelectItem>
                <SelectItem value="5th Floor">5th Floor</SelectItem>
                <SelectItem value="6th Floor">6th Floor</SelectItem>
                <SelectItem value="7th Floor">7th Floor</SelectItem>
                <SelectItem value="8th Floor">8th Floor</SelectItem>
                <SelectItem value="Attic">Attic</SelectItem>
                <SelectItem value="Roof">Roof</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-mono">Notes</Label>
            <Input
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-secondary font-mono text-sm"
            />
          </div>
          {/* Mutual Aid toggle */}
          <div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_mutual_aid: !f.is_mutual_aid }))}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-mono transition-colors ${
                form.is_mutual_aid
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-secondary border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${form.is_mutual_aid ? 'bg-amber-400' : 'bg-muted-foreground/40'}`} />
              {form.is_mutual_aid ? 'Mutual Aid' : 'Mark as Mutual Aid'}
            </button>
          </div>

          <div className="flex gap-2">
            {form.air_time ? (
              <>
                {(() => {
                  const elapsed = (Date.now() - new Date(form.air_time).getTime()) / 1000 / 60;
                  const isOverLimit = elapsed > 20;
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      className={`text-xs ${isOverLimit ? 'animate-pulse-red' : ''}`}
                    >
                      On Air {Math.floor(elapsed)}m
                    </Button>
                  );
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSave({ ...form, air_time: null })}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear Air Time
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSave({ ...form, air_time: new Date().toISOString() })}
                className="text-xs"
              >
                Mark On Air
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSave({ ...form, last_par_time: new Date().toISOString(), status: 'par' })}
              className="text-xs"
            >
              PAR Complete
            </Button>
          </div>
        </div>
        {/* Delete confirmation banner */}
        {confirmDelete && (
          <div className="mx-1 mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs font-mono text-red-300 flex-1">
              Remove <span className="font-bold text-red-200">{unit.unit_name}</span> from this incident?
            </p>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => { onDelete(unit.id); onClose(); }}>
                Remove
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => {
              const updated = { ...form, assignment: 'unassigned', status: 'available', rehab_time: null };
              onSave(updated);
              onClose();
            }}>
              ✕ Clear Assignment
            </Button>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(form)}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}