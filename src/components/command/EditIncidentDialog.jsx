import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function EditIncidentDialog({ open, onClose, incident, onSave, isSaving = false }) {
  const [form, setForm] = useState({
    address: '',
    command_name: '',
    incident_type: 'structure_fire',
    alarm_level: '1st_alarm',
    ic_name: '',
  });

  // Populate form whenever incident changes or dialog opens
  useEffect(() => {
    if (incident && open) {
      setForm({
        address:       incident.address       || '',
        command_name:  incident.command_name  || '',
        incident_type: incident.incident_type || 'structure_fire',
        alarm_level:   incident.alarm_level   || '1st_alarm',
        ic_name:       incident.ic_name       || '',
      });
    }
  }, [incident, open]);

  const handleSave = () => {
    if (!form.address.trim()) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={isSaving ? undefined : onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Edit Incident</DialogTitle>
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
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div>
            <Label className="text-xs font-mono">Command Name</Label>
            <Input
              value={form.command_name}
              onChange={(e) => setForm({ ...form, command_name: e.target.value })}
              placeholder="Main Street Command"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.address.trim() || isSaving}>
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
