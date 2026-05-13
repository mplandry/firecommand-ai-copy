import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

export default function CloseIncidentDialog({ incident, open, onClose, onConfirm }) {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes);
    setNotes('');
  };

  if (!incident) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            Close Incident
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are closing <span className="text-foreground font-semibold">{incident.command_name || incident.address}</span>.
            All unit data and radio logs will be archived.
          </p>
          <div>
            <Label className="text-xs font-mono">Closing Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fire knocked down, all units released..."
              className="bg-secondary font-mono text-sm mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-accent text-accent-foreground hover:bg-accent/90">
            Close Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}