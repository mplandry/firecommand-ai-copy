import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, Sun, Moon, Camera, Upload, Loader2, AlertTriangle,
  Plus, Trash2, Users, Edit2, Check, X, Copy, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UNIT_TYPES = ['engine','truck','rescue','squad','deputy','medic','tanker','brush','hazmat','other'];
const UNIT_ICONS = {
  engine:'', truck:'', rescue:'', squad:'',
  battalion:'', medic:'', tanker:'', brush:'', hazmat:'', other:'',
};

const TODAY = format(new Date(), 'yyyy-MM-dd');

// Personnel stored as "Name|Position" strings e.g. "Smith J.|E100"
const encodePerson = (name, position) => position ? `${name}|${position}` : name;
const decodePerson = (str) => {
  const [name, position] = (str || '').split('|');
  return { name: name?.trim() || '', position: position?.trim() || '' };
};

// ── Person row in edit mode ───────────────────────────────────────────────────
function PersonRow({ value, onChange, onRemove, placeholder, posPlaceholder }) {
  const { name, position } = decodePerson(value);
  return (
    <div className="flex gap-2 items-center">
      <input
        className="flex-1 bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
        value={name}
        onChange={e => onChange(encodePerson(e.target.value, position))}
        placeholder={placeholder || 'Name'}
      />
      <input
        className="w-24 bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground text-center"
        value={position}
        onChange={e => onChange(encodePerson(name, e.target.value))}
        placeholder={posPlaceholder || '100'}
      />
      <button onClick={onRemove} className="p-1.5 text-muted-foreground hover:text-red-400 rounded">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Roster card (view + edit) ─────────────────────────────────────────────────
function RosterRow({ entry, onSave, onDelete, isNew }) {
  const [editing, setEditing] = useState(!!isNew);

  // Parse stored officer as "Name|Position"
  const { name: officerName, position: officerPos } = decodePerson(entry.officer || '');

  // Form state
  const [officerStr, setOfficerStr] = useState(entry.officer || '');
  const [unitName, setUnitName] = useState(entry.unit_name || '');
  const [unitType, setUnitType] = useState(entry.unit_type || 'engine');
  const [crew, setCrew] = useState(entry.personnel || []);
  const [notes, setNotes] = useState(entry.notes || '');

  const totalPAX = 1 + crew.length; // officer + crew

  const addCrewMember = () => setCrew(c => [...c, '']);

  const save = () => {
    onSave({
      unit_name: unitName,
      unit_type: unitType,
      officer: officerStr,
      personnel: crew.filter(p => decodePerson(p).name),
      personnel_count: 1 + crew.filter(p => decodePerson(p).name).length,
      notes,
    });
    setEditing(false);
  };

  const cancel = () => {
    if (isNew) { onDelete(); return; }
    setOfficerStr(entry.officer || '');
    setUnitName(entry.unit_name || '');
    setUnitType(entry.unit_type || 'engine');
    setCrew(entry.personnel || []);
    setNotes(entry.notes || '');
    setEditing(false);
  };

  // ── VIEW ──
  if (!editing) {
    return (
      <div className="group border border-border rounded-xl bg-card hover:border-primary/30 transition-colors overflow-hidden">
        {/* Unit header */}
        <div className="flex items-center justify-between px-4 py-3 bg-secondary/40 border-b border-border/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{UNIT_ICONS[entry.unit_type] || ''}</span>
            <div>
              <div className="font-mono text-lg font-black text-foreground tracking-wide">{entry.unit_name}</div>
              <div className="text-[10px] font-mono text-muted-foreground capitalize">{entry.unit_type}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-green-900/30 border border-green-700/30 rounded-lg px-2.5 py-1 text-center">
              <div className="text-sm font-mono font-black text-green-400">{totalPAX > 1 ? totalPAX : entry.personnel_count || '—'}</div>
              <div className="text-[9px] font-mono text-green-600 uppercase">total</div>
            </div>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(true)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded hover:bg-secondary/60">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded hover:bg-secondary/60">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Personnel rows */}
        <div className="divide-y divide-border/30">
          {/* Officer row */}
          {entry.officer ? (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-cyan-950/20">
              <div className="w-20 shrink-0 flex items-center gap-1.5">
                <span className="text-[9px] font-mono font-bold text-cyan-500 uppercase tracking-widest bg-cyan-900/40 border border-cyan-700/30 rounded px-1.5 py-0.5">
                  {entry.unit_type === 'deputy' ? 'Deputy' : 'Officer'}
                </span>
                {officerPos && (
                  <span className="text-[9px] font-mono text-cyan-600/70">{officerPos}</span>
                )}
              </div>
              <span className="text-sm font-mono font-semibold text-cyan-300">{officerName || entry.officer}</span>
            </div>
          ) : (
            <div className="px-4 py-2.5 text-xs font-mono text-muted-foreground/40 italic">No officer assigned</div>
          )}

          {/* Crew rows */}
          {entry.personnel?.length > 0 ? entry.personnel.map((p, i) => {
            const { name, position } = decodePerson(p);
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/10 transition-colors">
                <div className="w-20 shrink-0 flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold text-muted-foreground uppercase tracking-widest bg-secondary/60 border border-border/50 rounded px-1.5 py-0.5">
                    {entry.unit_type === 'deputy' ? 'Aide' : 'FF'}
                  </span>
                  {position && (
                    <span className="text-[9px] font-mono text-muted-foreground/60">{position}</span>
                  )}
                </div>
                <span className="text-sm font-mono text-foreground">{name || p}</span>
              </div>
            );
          }) : (
            <div className="px-4 py-2.5 text-xs font-mono text-muted-foreground/40 italic">No crew listed</div>
          )}
        </div>

        {entry.notes && (
          <div className="px-4 py-2 bg-secondary/20 border-t border-border/30">
            <p className="text-[10px] font-mono text-muted-foreground/70">{entry.notes}</p>
          </div>
        )}
      </div>
    );
  }

  // ── EDIT ──
  return (
    <div className="border border-primary/30 rounded-xl bg-primary/5 overflow-hidden col-span-full">
      <div className="px-4 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-primary uppercase tracking-wider">
          {isNew ? 'New Unit' : `Editing ${unitName}`}
        </span>
        <button onClick={cancel} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Unit info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Unit Name *</label>
            <input
              className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
              value={unitName}
              onChange={e => setUnitName(e.target.value)}
              placeholder="e.g. Engine 1"
            />
          </div>
          <div>
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Unit Type</label>
            <Select value={unitType} onValueChange={setUnitType}>
              <SelectTrigger className="mt-0.5 bg-secondary h-8 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs font-mono capitalize">{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Officer */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[9px] font-mono text-cyan-500 uppercase tracking-wider font-bold">Officer</label>
            <span className="text-[9px] font-mono text-muted-foreground">Name · Position (e.g. E100)</span>
          </div>
          <PersonRow
            value={officerStr}
            onChange={setOfficerStr}
            placeholder="Captain Smith"
            posPlaceholder="E100"
          />
        </div>

        {/* Crew */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider font-bold">Firefighters</label>
            <span className="text-[9px] font-mono text-muted-foreground">Name · Position (e.g. 101)</span>
          </div>
          <div className="space-y-2">
            {crew.map((p, i) => (
              <PersonRow
                key={i}
                value={p}
                onChange={v => setCrew(c => c.map((x, j) => j === i ? v : x))}
                onRemove={() => setCrew(c => c.filter((_, j) => j !== i))}
                placeholder={`Firefighter ${i + 1}`}
                posPlaceholder={`${101 + i}`}
              />
            ))}
            <button
              onClick={addCrewMember}
              className="w-full border border-dashed border-border/60 rounded-lg py-2 text-xs font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Firefighter
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Notes</label>
          <input
            className="mt-0.5 w-full bg-secondary border border-border rounded px-2 py-1.5 text-sm font-mono text-foreground"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={save} disabled={!unitName.trim()} className="gap-1.5 text-xs">
            <Check className="w-3.5 h-3.5" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="text-xs text-muted-foreground gap-1.5">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Photo upload + parse panel ─────────────────────────────────────────────────
function PhotoImportPanel({ onParsed, onClose }) {
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    setImageFiles(prev => [...prev, ...imgs]);
    setImagePreviews(prev => [...prev, ...imgs.map(f => URL.createObjectURL(f))]);
    setParseError('');
  };

  const removeImage = (i) => {
    setImageFiles(prev => prev.filter((_, j) => j !== i));
    setImagePreviews(prev => prev.filter((_, j) => j !== i));
  };

  const handleParse = async () => {
    if (!imageFiles.length) return;
    setIsParsing(true);
    setParseError('');

    // Upload all images in parallel
    const uploads = await Promise.all(imageFiles.map(f => base44.integrations.Core.UploadFile({ file: f })));
    const fileUrls = uploads.map(u => u.file_url);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a fire department daily roster parser. Analyze these roster sheet images (may be multiple pages) and extract ALL units and their personnel.

CRITICAL RULES:
1. UNIT NAME = the apparatus name only (e.g. "Engine 1", "Engine 2", "Ladder 2", "Tower 1", "Rescue 1", "Squad 5", "C2", "C3", "Moody Boat", "Central Boat", "RTV"). NEVER include riding position numbers in the unit name.
2. RIDING POSITIONS = the 3-digit numbers (100, 101, 102, 200, etc.) next to personnel names. These are seat/position codes, NOT part of the unit name.
3. The OFFICER is the first person listed for a unit (Captain, Lieutenant, or most senior rank). Store their riding position code separately.
4. PERSONNEL = all crew members listed under that unit besides the officer. Each person may have a riding position number next to their name — store it with the person as "Name|PositionCode" (e.g. "James Vanaria|101").
5. Command officers: C1 = Fire Chief, unit_type: "deputy". C2/C3/C4 = Deputy Chiefs, unit_type: "deputy". H1/H2 = special non-vehicle officer positions, unit_type: "other".
6. Boats, marine units = unit_type: "other". RTV = unit_type: "other". 6A = a pickup truck, unit_type: "other".
7. Do NOT split the same unit into multiple entries. Merge all personnel for a given unit name onto one entry.

For each unit extract:
- unit_name: apparatus name only (e.g. "Engine 1", "Ladder 2", "C2", "Tower 1")
- unit_type: engine/truck/rescue/squad/battalion/medic/tanker/brush/hazmat/other
- officer: officer name string (e.g. "Damon Ferranti") - just the name, no position code
- personnel: array of crew member strings in format "Name|PositionCode" or just "Name" if no position visible
- personnel_count: total headcount including officer

Combine across all pages. Return every unit found.`,
      file_urls: fileUrls,
      response_json_schema: {
        type: 'object',
        properties: {
          units: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                unit_name: { type: 'string' },
                unit_type: { type: 'string', enum: ['engine','truck','rescue','squad','deputy','medic','tanker','brush','hazmat','other'] },
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
      setParseError('No units found in these images. Try clearer, well-lit photos of the roster.');
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
          <Camera className="w-3.5 h-3.5 text-primary" /> Import from Photos
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        {/* Drop zone — always visible so user can add more photos */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-5 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
          onDragOver={e => e.preventDefault()}
        >
          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-sm font-mono text-foreground font-semibold">
            {imageFiles.length === 0 ? 'Drop roster photos or tap to browse' : 'Add more pages'}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Select multiple pages at once or add one by one</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => handleFiles(e.target.files)} />
        </div>

        {/* Previews */}
        {imagePreviews.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0">
                <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-cover object-top" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                ><X className="w-3 h-3" /></button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-center text-[9px] font-mono text-white py-0.5">
                  Page {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Reading {imageFiles.length} page{imageFiles.length > 1 ? 's' : ''} with AI…
          </div>
        )}
        {parseError && (
          <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded px-3 py-2 text-xs font-mono text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {parseError}
          </div>
        )}
        {!isParsing && imageFiles.length > 0 && (
          <Button onClick={handleParse} className="w-full gap-2 text-sm">
            <Camera className="w-4 h-4" /> Extract Units from {imageFiles.length} Page{imageFiles.length > 1 ? 's' : ''} with AI
          </Button>
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
  const [isCopying, setIsCopying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      if (!existing) {
        await base44.entities.Roster.create(payload);
      }
      // skip units that already exist — don't overwrite
    }
    queryClient.invalidateQueries({ queryKey: qKey });
    setShowPhotoImport(false);
  }, [entries, shift, date, queryClient, qKey]);

  const totalPersonnel = entries.reduce((s, e) => {
    return s + (e.personnel?.length || e.personnel_count || 0);
  }, 0);

  const handleDeleteRoster = useCallback(async () => {
    setIsDeleting(true);
    for (const e of entries) {
      await base44.entities.Roster.delete(e.id);
    }
    queryClient.invalidateQueries({ queryKey: qKey });
    setIsDeleting(false);
    setConfirmDelete(false);
  }, [entries, queryClient, qKey]);

  const handleCopyLastRoster = useCallback(async () => {
    setIsCopying(true);
    // Find the most recent roster for same shift before current date
    const allRecent = await base44.entities.Roster.filter({ shift }, '-shift_date', 50);
    const lastEntries = allRecent.filter(e => e.shift_date < date);
    if (!lastEntries.length) { setIsCopying(false); return; }
    // Get entries from the most recent date found
    const lastDate = lastEntries[0].shift_date;
    const toCopy = lastEntries.filter(e => e.shift_date === lastDate);
    for (const e of toCopy) {
      const exists = entries.find(x => x.unit_name.toLowerCase() === e.unit_name.toLowerCase());
      if (!exists) {
        await base44.entities.Roster.create({
          unit_name: e.unit_name, unit_type: e.unit_type || 'engine',
          officer: e.officer || '', personnel: e.personnel || [],
          personnel_count: e.personnel_count || null, notes: e.notes || '',
          shift, shift_date: date,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: qKey });
    setIsCopying(false);
  }, [shift, date, entries, queryClient, qKey]);

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
            {entries.length > 0 && !confirmDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                className="gap-1.5 text-xs text-red-400 border-red-800/50 hover:bg-red-950/40 hover:text-red-300"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Roster
              </Button>
            )}
            {confirmDelete && (
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-700/50 rounded-lg px-3 py-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                <span className="text-[11px] font-mono text-red-300">Delete all {entries.length} units?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-6 px-2 text-[10px] font-mono gap-1"
                  onClick={handleDeleteRoster}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Yes, delete'}
                </Button>
                <button onClick={() => setConfirmDelete(false)} className="text-red-400/60 hover:text-red-300 text-sm">✕</button>
              </div>
            )}
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
                setTempNewEntry({ unit_name: '', unit_type: 'engine', officer: '|E100', personnel: ['|101', '|102'], personnel_count: null, notes: '' });
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
            {shift === 'day' ? 'Day Shift' : 'Night Shift'} — {format(new Date(date + 'T12:00:00'), 'MMMM d, yyyy')}
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
            <p className="text-xs font-mono text-muted-foreground/60">Import from a photo, add units manually, or copy the last roster.</p>
            <Button size="sm" variant="outline" onClick={handleCopyLastRoster} disabled={isCopying} className="gap-1.5 text-xs mx-auto">
              {isCopying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              Copy Last Roster
            </Button>
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