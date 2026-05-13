import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AddUnitDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    unit_name: '',
    unit_type: 'engine',
    status: 'dispatched',
    assignment: 'unassigned',
    floor: '',
    personnel_count: 4,
    officer: '',
  });

  const handleCreate = () => {
    if (!form.unit_name.trim()) return;
    onCreate(form);
    setForm({ unit_name: '', unit_type: 'engine', status: 'dispatched', assignment: 'unassigned', floor: '', personnel_count: 4, officer: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono">Add Unit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-mono">Unit Name *</Label>
            <Input
              value={form.unit_name}
              onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
              placeholder="Engine 2"
              className="bg-secondary font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Type</Label>
              <Select value={form.unit_type} onValueChange={(v) => setForm({ ...form, unit_type: v })}>
                <SelectTrigger className="bg-secondary font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engine">Engine</SelectItem>
                  <SelectItem value="truck">Truck/Ladder</SelectItem>
                  <SelectItem value="rescue">Rescue</SelectItem>
                  <SelectItem value="squad">Squad</SelectItem>
                  <SelectItem value="battalion">Battalion Chief</SelectItem>
                  <SelectItem value="medic">Medic</SelectItem>
                  <SelectItem value="tanker">Tanker</SelectItem>
                  <SelectItem value="brush">Brush</SelectItem>
                  <SelectItem value="hazmat">HazMat</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-mono">Personnel Count</Label>
              <Input
                type="number"
                value={form.personnel_count}
                onChange={(e) => setForm({ ...form, personnel_count: parseInt(e.target.value) || 0 })}
                className="bg-secondary font-mono"
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
            <Label className="text-xs font-mono">Officer</Label>
            <Input
              value={form.officer}
              onChange={(e) => setForm({ ...form, officer: e.target.value })}
              placeholder="Lt. Johnson"
              className="bg-secondary font-mono"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.unit_name.trim()}>Add Unit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}