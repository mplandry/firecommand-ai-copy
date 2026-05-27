import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const ASSIGNMENTS = [
  'unassigned','staging','division_a','division_b','division_c','division_d',
  'roof','interior','rit','rehab','water_supply','ventilation','search','medical','exposure',
];
const STATUSES = [
  'dispatched','responding','on_scene','working','par','mayday','available','rehab','out_of_service',
];

export default function RadioLogFeedback({ log }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    correct_unit: log.from_unit || '',
    correct_assignment: '',
    correct_status: '',
    correct_summary: '',
  });

  const handleThumbsUp = async () => {
    // Save confirmed-correct entry so AI keeps this mapping in future parses
    if (log.message) {
      base44.entities.TerminologyCorrection.create({
        raw_phrase: log.message,
        correct_unit: log.from_unit || null,
        correct_assignment: log.assignment || null,
        correct_status: log.status || null,
        correct_summary: log.parsed_action || null,
        confirmed: true,
      }).catch(() => {});
    }
    setSaved(true);
  };

  const handleThumbsDown = () => {
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.TerminologyCorrection.create({
      raw_phrase: log.message,
      original_summary: log.parsed_action || '',
      correct_unit: form.correct_unit || null,
      correct_assignment: form.correct_assignment || null,
      correct_status: form.correct_status || null,
      correct_summary: form.correct_summary || null,
      confirmed: true,
    });
    setSaving(false);
    setSaved(true);
    setOpen(false);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-1 text-[9px] font-mono text-green-500 mt-1">
        <CheckCircle2 className="w-3 h-3" /> Feedback saved
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      {!open ? (
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground/50">Correct?</span>
          <button
            onClick={handleThumbsUp}
            className="text-muted-foreground/40 hover:text-green-400 transition-colors"
            title="Parsed correctly"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            onClick={handleThumbsDown}
            className="text-muted-foreground/40 hover:text-red-400 transition-colors"
            title="Needs correction"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="mt-1 bg-secondary/60 border border-border/50 rounded p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-yellow-400 uppercase tracking-wider">Correct the AI</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground/50 hover:text-foreground">
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-mono text-muted-foreground">Unit name (what unit was actually speaking/referenced?)</label>
            <input
              className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground"
              value={form.correct_unit}
              onChange={e => setForm(f => ({ ...f, correct_unit: e.target.value }))}
              placeholder="e.g. Engine 3"
            />
          </div>

          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="text-[9px] font-mono text-muted-foreground">Correct assignment</label>
              <select
                className="w-full bg-background border border-border rounded px-1 py-1 text-[10px] font-mono text-foreground"
                value={form.correct_assignment}
                onChange={e => setForm(f => ({ ...f, correct_assignment: e.target.value }))}
              >
                <option value="">— none —</option>
                {ASSIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono text-muted-foreground">Correct status</label>
              <select
                className="w-full bg-background border border-border rounded px-1 py-1 text-[10px] font-mono text-foreground"
                value={form.correct_status}
                onChange={e => setForm(f => ({ ...f, correct_status: e.target.value }))}
              >
                <option value="">— none —</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-mono text-muted-foreground">What did it actually mean?</label>
            <input
              className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] font-mono text-foreground"
              value={form.correct_summary}
              onChange={e => setForm(f => ({ ...f, correct_summary: e.target.value }))}
              placeholder="Brief description of the correct interpretation"
            />
          </div>

          <Button size="sm" className="w-full h-6 text-[10px]" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save Correction'}
          </Button>
        </div>
      )}
    </div>
  );
}