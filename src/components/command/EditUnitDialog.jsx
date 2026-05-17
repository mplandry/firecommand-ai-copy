import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAutoAssignment } from '@/lib/statusAssignment';

const assignments = [
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'staging', label: 'Staging' },
  { value: 'division_a', label: 'Division A (Alpha)' },
  { value: 'division_b', label: 'Division B (Bravo)' },
  { value: 'division_c', label: 'Division C (Charlie)' },
  { value: 'division_d', label: 'Division D (Delta)' },
  { value: 'roof', label: 'Roof Division' },
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

  useEffect(() => {
    if (unit) setForm({ ...unit });
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
              <Select value={form.assignment} onValueChange={(v) => setForm({ ...form, assignment: v })}>
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
            <Select value={form.floor || 'none'} onValueChange={(v) => setForm({ ...form, floor: v === 'none' ? '' : v })}>
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
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" size="sm" onClick={() => {
            const updated = { ...form, assignment: 'unassigned', status: 'available', rehab_time: null };
            onSave(updated);
            onClose();
          }}>
            ✕ Clear Assignment
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(form)}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}