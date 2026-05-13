import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp,
  LayoutTemplate, Copy, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INCIDENT_TEMPLATES } from '@/lib/incidentTemplates';

const UNIT_TYPES = ['engine','truck','rescue','squad','battalion','medic','tanker','brush','hazmat','other'];
const UNIT_ICONS = { engine:'🚒', truck:'🪜', rescue:'🚑', squad:'🔧', battalion:'⭐', medic:'🏥', tanker:'💧', brush:'🌿', hazmat:'☣️', other:'🚐' };
const ASSIGNMENTS = [
  'staging','division_a','division_b','division_c','division_d',
  'roof','interior','rit','rehab','water_supply','ventilation','search','medical','exposure','unassigned'
];
const ASSIGNMENT_LABELS = {
  division_a:'Alpha', division_b:'Bravo', division_c:'Charlie', division_d:'Delta',
  interior:'Interior', roof:'Roof', rit:'RIT', rehab:'Rehab', staging:'Staging',
  water_supply:'Water Supply', ventilation:'Vent', search:'Search',
  medical:'Medical', exposure:'Exposure', unassigned:'Unassigned',
};
const INCIDENT_TYPES = ['structure_fire','wildland_fire','vehicle_fire','hazmat','rescue','mci','other'];
const INCIDENT_TYPE_LABELS = {
  structure_fire:'Structure Fire', wildland_fire:'Wildland Fire', vehicle_fire:'Vehicle Fire',
  hazmat:'HazMat', rescue:'Rescue', mci:'MCI', other:'Other'
};
const ALARM_LEVELS = ['1st_alarm','2nd_alarm','3rd_alarm','4th_alarm','5th_alarm','task_force','strike_team'];

const BLANK_TEMPLATE = {
  label: '', icon: '🚒', description: '', incident_type: 'structure_fire',
  alarm_level: '1st_alarm', units: []
};
const BLANK_UNIT = { unit_name: '', unit_type: 'engine', assignment: 'staging', floor: '', status: 'on_scene', personnel_count: 3 };

// ── Inline unit row editor ────────────────────────────────────────────────────
function UnitRow({ unit, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-1.5 items-center py-1.5 border-b border-border/40 last:border-0">
      <span className="text-base leading-none pl-1">{UNIT_ICONS[unit.unit_type] || '🚐'}</span>
      <input
        className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground w-full"
        value={unit.unit_name}
        onChange={e => onChange({ ...unit, unit_name: e.target.value })}
        placeholder="Unit name"
      />
      <Select value={unit.unit_type} onValueChange={v => onChange({ ...unit, unit_type: v })}>
        <SelectTrigger className="bg-secondary text-[10px] font-mono h-7 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UNIT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs font-mono capitalize">{t}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={unit.assignment} onValueChange={v => onChange({ ...unit, assignment: v })}>
        <SelectTrigger className="bg-secondary text-[10px] font-mono h-7 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNMENTS.map(a => <SelectItem key={a} value={a} className="text-xs font-mono">{ASSIGNMENT_LABELS[a]}</SelectItem>)}
        </SelectContent>
      </Select>
      <input
        className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground w-14 text-center"
        value={unit.floor || ''}
        onChange={e => onChange({ ...unit, floor: e.target.value })}
        placeholder="Floor"
        title="Floor / level"
      />
      <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors px-1">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Template form (create / edit) ─────────────────────────────────────────────
function TemplateForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(initial || BLANK_TEMPLATE);

  const updateUnit = (i, updated) => setForm(f => ({ ...f, units: f.units.map((u, idx) => idx === i ? updated : u) }));
  const removeUnit = (i) => setForm(f => ({ ...f, units: f.units.filter((_, idx) => idx !== i) }));
  const addUnit = () => setForm(f => ({ ...f, units: [...f.units, { ...BLANK_UNIT }] }));

  return (
    <div className="bg-card border border-primary/30 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
        <span className="text-sm font-bold font-mono text-primary uppercase tracking-wider">
          {initial?.id ? 'Edit Template' : 'New Template'}
        </span>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Name + icon */}
        <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
          <div>
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Icon</label>
            <input
              className="mt-0.5 w-14 bg-secondary border border-border rounded px-2 py-1.5 text-xl text-center font-mono"
              value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              maxLength={2}
            />
          </div>
          <div>
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Template Name *</label>
            <input
              className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Commercial Alarm"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Description</label>
          <input
            className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Short scenario description"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Incident Type</label>
            <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
              <SelectTrigger className="mt-0.5 bg-secondary h-8 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs font-mono">{INCIDENT_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Alarm Level</label>
            <Select value={form.alarm_level} onValueChange={v => setForm(f => ({ ...f, alarm_level: v }))}>
              <SelectTrigger className="mt-0.5 bg-secondary h-8 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALARM_LEVELS.map(l => <SelectItem key={l} value={l} className="text-xs font-mono">{l.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Units */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Units</label>
            <Button size="sm" variant="outline" onClick={addUnit} className="h-6 px-2 text-[10px] gap-1">
              <Plus className="w-3 h-3" /> Add Unit
            </Button>
          </div>

          {form.units.length === 0 && (
            <div className="text-center py-6 text-xs font-mono text-muted-foreground/50 border border-dashed border-border rounded-lg">
              No units yet — add some above
            </div>
          )}

          {/* Column hints */}
          {form.units.length > 0 && (
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-1.5 mb-1 px-1">
              {['', 'Unit Name', 'Type', 'Assignment', 'Floor', ''].map((h, i) => (
                <span key={i} className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{h}</span>
              ))}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {form.units.map((unit, i) => (
              <UnitRow key={i} unit={unit} onChange={u => updateUnit(i, u)} onRemove={() => removeUnit(i)} />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} className="text-xs">Cancel</Button>
        <Button
          onClick={() => onSave(form)}
          disabled={!form.label.trim() || isSaving}
          className="gap-1.5 text-xs"
        >
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving…' : 'Save Template'}
        </Button>
      </div>
    </div>
  );
}

// ── Template card (read view) ─────────────────────────────────────────────────
function TemplateCard({ template, onEdit, onDelete, onDuplicate, isBuiltIn }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`bg-card border rounded-lg overflow-hidden transition-colors ${isBuiltIn ? 'border-border/50 opacity-80' : 'border-border hover:border-primary/30'}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <span className="text-2xl leading-none">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold font-mono text-sm text-foreground">{template.label}</span>
            {isBuiltIn && (
              <span className="text-[9px] font-mono bg-secondary/80 text-muted-foreground border border-border px-1.5 py-0.5 rounded">Built-in</span>
            )}
          </div>
          {template.description && (
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{template.description}</div>
          )}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(template.units || []).slice(0, 5).map((u, i) => (
              <span key={i} className="text-[9px] font-mono bg-secondary px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                {u.unit_name}
              </span>
            ))}
            {(template.units || []).length > 5 && (
              <span className="text-[9px] font-mono text-muted-foreground">+{template.units.length - 5} more</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Preview units"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onDuplicate} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Duplicate">
            <Copy className="w-3.5 h-3.5" />
          </button>
          {!isBuiltIn && (
            <>
              <button onClick={onEdit} className="p-1.5 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 bg-secondary/20">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 gap-y-1">
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider col-span-1"></span>
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Unit</span>
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Assignment</span>
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Floor</span>
            {(template.units || []).map((u, i) => (
              <React.Fragment key={i}>
                <span className="text-sm leading-none">{UNIT_ICONS[u.unit_type] || '🚐'}</span>
                <span className="font-mono text-xs font-semibold text-foreground">{u.unit_name}</span>
                <span className="font-mono text-xs text-muted-foreground">{ASSIGNMENT_LABELS[u.assignment] || u.assignment}</span>
                <span className="font-mono text-xs text-cyan-400">{u.floor || '—'}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TemplateManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: savedTemplates = [], isLoading } = useQuery({
    queryKey: ['incident-templates'],
    queryFn: () => base44.entities.IncidentTemplate.list('-created_date', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IncidentTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incident-templates'] }); setShowForm(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IncidentTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incident-templates'] }); setEditingTemplate(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.IncidentTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incident-templates'] }),
  });

  const handleSave = (form) => {
    const payload = {
      label: form.label,
      icon: form.icon || '🚒',
      description: form.description || '',
      incident_type: form.incident_type,
      alarm_level: form.alarm_level,
      units: form.units,
    };
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDuplicate = (template) => {
    const { id, created_date, updated_date, created_by, ...rest } = template;
    createMutation.mutate({ ...rest, label: `${rest.label} (copy)` });
  };

  const handleDuplicateBuiltIn = (template) => {
    createMutation.mutate({
      label: `${template.label} (copy)`,
      icon: template.icon,
      description: template.description,
      incident_type: template.incident_type,
      alarm_level: template.alarm_level,
      units: template.units,
    });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-2.5 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Button>
        </Link>
        <LayoutTemplate className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold font-mono tracking-wider text-foreground uppercase flex-1">
          Template Manager
        </span>
        <Button
          size="sm"
          onClick={() => { setEditingTemplate(null); setShowForm(true); }}
          className="gap-1.5 text-xs"
          disabled={showForm}
        >
          <Plus className="w-3.5 h-3.5" /> New Template
        </Button>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">
        {/* New / edit form */}
        {(showForm || editingTemplate) && (
          <TemplateForm
            initial={editingTemplate}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
            isSaving={isSaving}
          />
        )}

        {/* Saved custom templates */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider">Custom Templates</h2>
            {savedTemplates.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {savedTemplates.length}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="text-center py-8 text-xs font-mono text-muted-foreground">Loading…</div>
          )}

          {!isLoading && savedTemplates.length === 0 && !showForm && (
            <div className="text-center py-10 border border-dashed border-border rounded-lg space-y-2">
              <LayoutTemplate className="w-8 h-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm font-mono text-muted-foreground">No custom templates yet.</p>
              <p className="text-xs font-mono text-muted-foreground/60">Create one above, or duplicate a built-in template to get started.</p>
            </div>
          )}

          <div className="space-y-3">
            {savedTemplates.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                isBuiltIn={false}
                onEdit={() => { setShowForm(false); setEditingTemplate(t); }}
                onDelete={() => deleteMutation.mutate(t.id)}
                onDuplicate={() => handleDuplicate(t)}
              />
            ))}
          </div>
        </section>

        {/* Built-in templates (read-only, duplicatable) */}
        <section>
          <h2 className="text-xs font-bold font-mono text-foreground uppercase tracking-wider mb-3">Built-in Templates</h2>
          <div className="space-y-3">
            {INCIDENT_TEMPLATES.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                isBuiltIn={true}
                onEdit={() => {}}
                onDelete={() => {}}
                onDuplicate={() => handleDuplicateBuiltIn(t)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}