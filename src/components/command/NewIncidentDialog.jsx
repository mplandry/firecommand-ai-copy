import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Standard box assignment units for a working fire (1st alarm)
const BOX_ASSIGNMENT_UNITS = [
  { unit_name: 'Engine 1', unit_type: 'engine', assignment: 'division_a', status: 'dispatched', personnel_count: 4 },
  { unit_name: 'Engine 2', unit_type: 'engine', assignment: 'division_b', status: 'dispatched', personnel_count: 4 },
  { unit_name: 'Engine 3', unit_type: 'engine', assignment: 'water_supply', status: 'dispatched', personnel_count: 4 },
  { unit_name: 'Truck 1', unit_type: 'truck', assignment: 'interior', status: 'dispatched', personnel_count: 4 },
  { unit_name: 'Rescue 1', unit_type: 'rescue', assignment: 'rit', status: 'dispatched', personnel_count: 4 },
  { unit_name: 'Medic 1', unit_type: 'medic', assignment: 'medical', status: 'dispatched', personnel_count: 2 },
  { unit_name: 'Deputy 1', unit_type: 'deputy', assignment: 'unassigned', status: 'dispatched', personnel_count: 1 },
];

export default function NewIncidentDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    address: '',
    incident_type: 'structure_fire',
    alarm_level: '1st_alarm',
    ic_name: '',
    command_name: '',
  });

  const handleCreate = () => {
    if (!form.address.trim()) return;
    const commandName = form.command_name || form.address.split(' ').slice(0, 2).join(' ') + ' Command';

    // For working fire (1st alarm structure fire), pre-populate box assignment units
    const isWorkingFire = form.alarm_level === '1st_alarm' && form.incident_type === 'structure_fire';
    const units = isWorkingFire ? BOX_ASSIGNMENT_UNITS : [];

    onCreate({
      ...form,
      command_name: commandName,
      status: 'active',
      started_at: new Date().toISOString(),
      _template: units.length > 0 ? { units } : null,
    });

    // Reset
    setForm({ address: '', incident_type: 'structure_fire', alarm_level: '1st_alarm', ic_name: '', command_name: '' });
  };

  const handleClose = () => {
    setForm({ address: '', incident_type: 'structure_fire', alarm_level: '1st_alarm', ic_name: '', command_name: '' });
    onClose();
  };

  const isWorkingFire = form.alarm_level === '1st_alarm' && form.incident_type === 'structure_fire';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-mono">New Incident</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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

          {isWorkingFire && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <p className="text-[10px] font-mono text-primary font-semibold uppercase tracking-wider mb-1">Box Assignment — Auto-populated</p>
              <div className="flex flex-wrap gap-1">
                {BOX_ASSIGNMENT_UNITS.map((u, i) => (
                  <span key={i} className="text-[9px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                    {u.unit_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.address.trim()}>
            Start Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}