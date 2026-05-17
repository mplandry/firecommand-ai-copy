import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, ChevronLeft, LayoutTemplate } from 'lucide-react';
import { INCIDENT_TEMPLATES } from '@/lib/incidentTemplates';

const ASSIGNMENT_LABELS = {
  division_a: 'Alpha', division_b: 'Bravo', division_c: 'Charlie', division_d: 'Delta',
  interior: 'Interior', roof: 'Roof', rit: 'RIT', rehab: 'Rehab',
  staging: 'Staging', water_supply: 'Water Supply', ventilation: 'Vent',
  search: 'Search', medical: 'Medical', exposure: 'Exposure', unassigned: 'Unassigned',
};

function TemplateCard({ template, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(template.id)}
      className={`w-full text-left rounded-lg border p-3 transition-all ${
        selected === template.id
          ? 'border-primary bg-primary/10 ring-1 ring-primary'
          : 'border-border bg-secondary/30 hover:border-primary/40 hover:bg-secondary/50'
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-mono font-bold text-sm text-foreground">{template.label}</div>
          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{template.description}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {template.units.slice(0, 4).map((u, i) => (
              <span key={i} className="text-[9px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                {u.unit_name}
              </span>
            ))}
            {template.units.length > 4 && (
              <span className="text-[9px] font-mono text-muted-foreground">+{template.units.length - 4} more</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function TemplatePreview({ template }) {
  if (!template) return null;
  return (
    <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Units to be created</p>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {template.units.map((u, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-foreground font-semibold w-20 shrink-0">{u.unit_name}</span>
            <span className="text-muted-foreground">{ASSIGNMENT_LABELS[u.assignment] || u.assignment}</span>
            {u.floor && <span className="text-cyan-400 ml-auto shrink-0">▲ {u.floor}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewIncidentDialog({ open, onClose, onCreate }) {
  const [step, setStep] = useState('template'); // 'template' | 'details'
  const [selectedTemplateId, setSelectedTemplateId] = useState('__blank');
  const [form, setForm] = useState({
    address: '',
    incident_type: 'structure_fire',
    alarm_level: '1st_alarm',
    ic_name: '',
    command_name: '',
  });

  const { data: savedTemplates = [] } = useQuery({
    queryKey: ['incident-templates'],
    queryFn: () => base44.entities.IncidentTemplate.list('-created_date', 100),
    enabled: open,
  });

  // Saved templates get a prefixed id to avoid collision with built-ins
  const allTemplates = [
    ...savedTemplates.map(t => ({ ...t, _saved: true })),
    ...INCIDENT_TEMPLATES,
  ];

  const selectedTemplate = allTemplates.find(t => t.id === selectedTemplateId) || null;

  const handleNext = () => {
    if (selectedTemplate) {
      setForm(f => ({
        ...f,
        incident_type: selectedTemplate.incident_type,
        alarm_level: selectedTemplate.alarm_level,
      }));
    }
    setStep('details');
  };

  const handleCreate = () => {
    if (!form.address.trim()) return;
    const commandName = form.command_name || form.address.split(' ').slice(0, 2).join(' ') + ' Command';
    onCreate({
      ...form,
      command_name: commandName,
      status: 'active',
      started_at: new Date().toISOString(),
      _template: selectedTemplate || null,
    });
    // Reset
    setStep('template');
    setSelectedTemplateId('__blank');
    setForm({ address: '', incident_type: 'structure_fire', alarm_level: '1st_alarm', ic_name: '', command_name: '' });
  };

  const handleClose = () => {
    setStep('template');
    setSelectedTemplateId('__blank');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            {step === 'template' ? (
              <><LayoutTemplate className="w-4 h-4 text-primary" /> Choose a Response Template</>
            ) : (
              'New Incident Details'
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'template' && (
          <div>
            {/* No template option */}
            <button
              onClick={() => setSelectedTemplateId('__blank')}
              className={`w-full text-left rounded-lg border p-3 mb-3 transition-all ${
                selectedTemplateId === '__blank'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border bg-secondary/30 hover:border-primary/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <div>
                  <div className="font-mono font-bold text-sm text-foreground">Blank Incident</div>
                  <div className="text-[10px] text-muted-foreground font-mono">Start with no pre-loaded units</div>
                </div>
              </div>
            </button>

            {savedTemplates.length > 0 && (
              <div className="mb-3">
                <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Custom Templates</p>
                <div className="grid grid-cols-1 gap-2">
                  {savedTemplates.map(t => (
                    <TemplateCard key={t.id} template={t} selected={selectedTemplateId} onSelect={setSelectedTemplateId} />
                  ))}
                </div>
              </div>
            )}
            <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Built-in Templates</p>
            <div className="grid grid-cols-1 gap-2">
              {INCIDENT_TEMPLATES.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  selected={selectedTemplateId}
                  onSelect={setSelectedTemplateId}
                />
              ))}
            </div>

            {selectedTemplate && <TemplatePreview template={selectedTemplate} />}
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            {selectedTemplate && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                <span>{selectedTemplate.icon}</span>
                <span className="text-xs font-mono text-primary font-semibold">{selectedTemplate.label} template</span>
                <span className="text-[10px] text-muted-foreground ml-1">· {selectedTemplate.units.length} units will be created</span>
              </div>
            )}
            <div>
              <Label className="text-xs font-mono">Address *</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Main Street"
                className="bg-secondary font-mono"
                autoFocus
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
        )}

        <DialogFooter>
          {step === 'template' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleNext}
                disabled={!selectedTemplateId}
                className="gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('template')} className="gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button onClick={handleCreate} disabled={!form.address.trim()}>
                Start Incident
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}