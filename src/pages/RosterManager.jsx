import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, Sun, Moon, Camera, Upload, Loader2, AlertTriangle,
  Plus, Trash2, Save, Users, ChevronDown, ChevronUp, Edit2, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UNIT_TYPES = ['engine','truck','rescue','squad','battalion','medic','tanker','brush','hazmat','other'];
const UNIT_ICONS = {
  engine:'🚒', truck:'🪜', rescue:'🚑', squad:'🔧',
  battalion:'⭐', medic:'🏥', tanker:'💧', brush:'🌿', hazmat:'☣️', other:'🚐',
};

const TODAY = format(new Date(), 'yyyy-MM-dd');

// ── Inline-editable row ────────────────────────────────────────────────────────
function RosterRow({ entry, onSave, onDelete, isNew }) {
  const [editing, setEditing] = useState(!!isNew);
  const [form, setForm] = useState({ ...entry });

  const save = () => {
    onSave(form);
    setEditing(false);
  };
  const cancel = () => {
    if (isNew) { onDelete(); return; }
    setForm({ ...entry });
    setEditing(false);
  };

  const totalPAX = form.personnel?.length
    ? form.personnel.length
    : (form.personnel_count || 0);

  if (!editing) {
    return (
      <div className="group border border-border rounded-xl bg-card hover:border-primary/30 transition-colors overflow-hidden">
        {/* Unit header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{UNIT_ICONS[entry.unit_type] || '🚐'}</span>
            <div>
              <div className="font-mono text-base font-black text-foreground tracking-wide">{entry.unit_name}</div>
              <div className="text-[10px] font-mono text-muted-foreground capitalize">{entry.unit_type}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-green-400">{totalPAX > 0 ? `${totalPAX} FF` : '—'}</div>
              <div className="text-[10px] font-mono text-muted-foreground">personnel</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-secondary/60">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded hover:bg-secondary/60">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        {/* Personnel list */}
        <div className="px-4 py-3 space-y-1.5">
          {entry.officer && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest w-14 shrink-0">Officer</span>
              <span className="text-sm font-mono font-semibold text-cyan-400">{entry.officer}</span>
              <span className="text-[9px] bg-cyan-900/30 border border-cyan-700/30 text-cyan-500 font-mono rounded px-1.5 py-0.5">OIC</span>
            </div>
          )}
          {entry.personnel?.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest w-14 shrink-0 pt-0.5">Crew</span>
              <div className="flex flex-wrap gap-1.5">
                {entry.personnel.map((name, i) => (
                  <span key={i} className="text-xs font-mono bg-secondary/70 border border-border/70 text-foreground rounded-md px-2 py-0.5">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!entry.officer && (!entry.personnel || entry.personnel.length === 0) && (
            <p className="text-xs font-mono text-muted-foreground/50 italic">No personnel listed</p>
          )}
          {entry.notes && (
            <p className="text-[10px] font-mono text-muted-foreground/70 border-t border-border/30 pt-1.5 mt-1.5">{entry.notes}</p>
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  const personnelStr = form.personnel?.join(', ') || '';

  return (
    <div className="px-3 py-3 border-b border-primary/20 bg-primary/5 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Unit Name *</label>
          <input
            className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
            value={form.unit_name}
            onChange={e => setForm(f => ({ ...f, unit_name: e.target.value }))}
            placeholder="e.g. Engine 1"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Unit Type</label>
          <Select value={form.unit_type} onValueChange={v => setForm(f => ({ ...f, unit_type: v }))}>
            <SelectTrigger className="mt-0.5 bg-secondary h-8 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs font-mono capitalize">{UNIT_ICONS[t]} {t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Officer / Captain</label>
          <input
            className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
            value={form.officer || ''}
            onChange={e => setForm(f => ({ ...f, officer: e.target.value }))}
            placeholder="Captain Smith"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Personnel Count</label>
          <input
            type="number" min={0} max={20}
            className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
            value={form.personnel_count || ''}
            onChange={e => setForm(f => ({ ...f, personnel_count: parseInt(e.target.value) || null }))}
            placeholder="3"
          />
        </div>
      </div>
      <div>
        <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
          Crew Names <span className="normal-case opacity-60">(comma-separated)</span>
        </label>
        <input
          className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
          value={personnelStr}
          onChange={e => setForm(f => ({ ...f, personnel: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
          placeholder="Smith J., Jones R., Brown T."
        />
      </div>
      {form.personnel?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {form.personnel.map((name, i) => (
            <span key={i} className="text-[10px] font-mono bg-secondary/80 text-foreground border border-border rounded px-1.5 py-0.5">
              {name}
            </span>
          ))}
        </div>
      )}
      <div>
        <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Notes</label>
        <input
          className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
          value={form.notes || ''}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Optional notes..."
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={save} disabled={!form.unit_name.trim()} className="gap-1.5 text-xs">
          <Check className="w-3.5 h-3.5" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} className="text-xs text-muted-foreground gap-1.5">
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Photo upload + parse panel ─────────────────────────────────────────────────
function PhotoImportPanel({ onParsed, onClose }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file?.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setParseError('');
  };

  const handleParse = async () => {
    if (!imageFile) return;
    setIsParsing(true);
    setParseError('');

    const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a fire department roster parser. Analyze this daily roster sheet image and extract all units/apparatus and their personnel.

For each unit found, extract:
- unit_name: the unit designator (e.g. "Engine 1", "Truck 3", "Rescue 2", "Battalion 1", "Medic 4")
- unit_type: one of engine/truck/rescue/squad/battalion/medic/tanker/brush/hazmat/other
- officer: the officer/captain/lieutenant name if visible
- personnel: array of ALL crew member names listed for that unit (not including the officer)
- personnel_count: total count of ALL personnel on unit including officer

Return all units you can find. If you cannot identify any units, return an empty units array.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          units: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                unit_name: { type: 'string' },
                unit_type: { type: 'string', enum: ['engine','truck','rescue','squad','battalion','medic','tanker','brush','hazmat','other'] },
                officer: { type: 'string' },
                personnel: { type: 'array', items: { type: 'string' } },
                personnel_count: { type: 'number' },
              },
              required: ['unit_name', 'unit_type'],
            },
          },
        },
        required: ['units'],
      },
    });

    setIsParsing(false);

    if (!result?.units?.length) {
      setParseError('No units found in this image. Try a clearer, well-lit photo of the roster.');
      return;
    }

    onParsed(result.units.map(u => ({
      unit_name: u.unit_name,
      unit_type: u.unit_type || 'engine',
      officer: u.officer || '',
      personnel: u.personnel || [],
      personnel_count: u.personnel_count || (u.personnel?.length) || null,
      notes: '',
    })));
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <div className="px-3 py-2.5 bg-secondary/40 border-b border-border flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-primary" /> Import from Photo
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        {!imagePreview ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={e => e.preventDefault()}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-mono text-foreground font-semibold">Drop roster photo or tap to browse</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-1">JPG, PNG, HEIC — take a photo of the printed sheet</p>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={imagePreview} alt="Roster" className="w-full max-h-52 object-cover object-top" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
              ><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {!isParsing && (
              <Button onClick={handleParse} className="w-full gap-2 text-sm">
                <Camera className="w-4 h-4" /> Extract Units with AI
              </Button>
            )}
            {isParsing && (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground font-mono text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Reading roster with AI…
              </div>
            )}
            {parseError && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded px-3 py-2 text-xs font-mono text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {parseError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function RosterManager() {
  const [shift, setShift] = useState('day');
  const [date, setDate] = useState(TODAY);
  const [showPhotoImport, setShowPhotoImport] = useState(false);
  const [tempNewEntry, setTempNewEntry] = useState(null);
  const queryClient = useQueryClient();

  const qKey = ['roster', shift, date];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => base44.entities.Roster.filter({ shift, shift_date: date }, 'unit_name', 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Roster.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Roster.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Roster.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  });

  const handleSave = useCallback((form, existingId) => {
    const payload = {
      unit_name: form.unit_name,
      unit_type: form.unit_type || 'engine',
      officer: form.officer || '',
      personnel: form.personnel || [],
      personnel_count: form.personnel_count || form.personnel?.length || null,
      notes: form.notes || '',
      shift,
      shift_date: date,
    };
    if (existingId) {
      updateMutation.mutate({ id: existingId, data: payload });
    } else {
      createMutation.mutate(payload);
      setTempNewEntry(null);
    }
  }, [shift, date, createMutation, updateMutation]);

  const handlePhotoImport = useCallback(async (units) => {
    for (const u of units) {
      const existing = entries.find(e => e.unit_name.toLowerCase() === u.unit_name.toLowerCase());
      const payload = {
        unit_name: u.unit_name,
        unit_type: u.unit_type || 'engine',
        officer: u.officer || '',
        personnel: u.personnel || [],
        personnel_count: u.personnel_count || u.personnel?.length || null,
        notes: '',
        shift,
        shift_date: date,
      };
      if (existing) {
        await base44.entities.Roster.update(existing.id, payload);
      } else {
        await base44.entities.Roster.create(payload);
      }
    }
    queryClient.invalidateQueries({ queryKey: qKey });
    setShowPhotoImport(false);
  }, [entries, shift, date, queryClient, qKey]);

  const totalPersonnel = entries.reduce((s, e) => {
    return s + (e.personnel?.length || e.personnel_count || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-2.5 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Button>
        </Link>
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold font-mono tracking-wider text-foreground uppercase">
          Roster Manager
        </span>
      </div>

      {/* Shift + Date controls */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Shift toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setShift('day')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold transition-colors ${
                shift === 'day'
                  ? 'bg-accent/20 text-accent border-r border-border'
                  : 'text-muted-foreground hover:bg-secondary/40 border-r border-border'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Day Shift
            </button>
            <button
              onClick={() => setShift('night')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold transition-colors ${
                shift === 'night'
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/40'
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Night Shift
            </button>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Date:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1.5 text-xs font-mono text-foreground"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Stats */}
            {entries.length > 0 && (
              <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                <span><span className="text-foreground font-bold">{entries.length}</span> units</span>
                <span><span className="text-green-400 font-bold">{totalPersonnel}</span> FF</span>
              </div>
            )}

            {/* Actions */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPhotoImport(s => !s)}
              className={`gap-1.5 text-xs ${showPhotoImport ? 'border-primary text-primary' : 'text-muted-foreground'}`}
            >
              <Camera className="w-3.5 h-3.5" /> Import Photo
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTempNewEntry({ unit_name: '', unit_type: 'engine', officer: '', personnel: [], personnel_count: null, notes: '' });
              }}
              className="gap-1.5 text-xs"
              disabled={!!tempNewEntry}
            >
              <Plus className="w-3.5 h-3.5" /> Add Unit
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Photo import panel */}
        {showPhotoImport && (
          <PhotoImportPanel
            onParsed={handlePhotoImport}
            onClose={() => setShowPhotoImport(false)}
          />
        )}

        {/* Shift label */}
        <div className="flex items-center gap-2 pb-1">
          <div className={`w-2 h-2 rounded-full ${shift === 'day' ? 'bg-accent' : 'bg-primary'}`} />
          <span className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-wider">
            {shift === 'day' ? '☀️ Day Shift' : '🌙 Night Shift'} — {format(new Date(date + 'T12:00:00'), 'MMMM d, yyyy')}
          </span>
        </div>

        {/* Temp new entry */}
        {tempNewEntry && (
          <RosterRow
            entry={tempNewEntry}
            isNew
            onSave={(form) => handleSave(form, null)}
            onDelete={() => setTempNewEntry(null)}
          />
        )}

        {/* Roster cards */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading roster…
          </div>
        )}
        {!isLoading && entries.length === 0 && !tempNewEntry && (
          <div className="text-center py-16 space-y-3">
            <Users className="w-8 h-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm font-mono text-muted-foreground">No roster entries for this shift.</p>
            <p className="text-xs font-mono text-muted-foreground/60">Import from a photo or add units manually.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(entry => (
            <RosterRow
              key={entry.id}
              entry={entry}
              onSave={(form) => handleSave(form, entry.id)}
              onDelete={() => deleteMutation.mutate(entry.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}