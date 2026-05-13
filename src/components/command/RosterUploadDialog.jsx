import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Camera, Loader2, CheckCircle2, AlertTriangle, Trash2, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const UNIT_TYPES = ['engine', 'truck', 'rescue', 'squad', 'battalion', 'medic', 'tanker', 'brush', 'hazmat', 'other'];
const ASSIGNMENTS = [
  'unassigned', 'staging', 'division_a', 'division_b', 'division_c', 'division_d',
  'roof', 'interior', 'rit', 'rehab', 'water_supply', 'ventilation', 'search', 'medical', 'exposure',
];
const ASSIGNMENT_LABELS = {
  division_a: 'Alpha', division_b: 'Bravo', division_c: 'Charlie', division_d: 'Delta',
  interior: 'Interior', roof: 'Roof', rit: 'RIT', rehab: 'Rehab',
  staging: 'Staging', water_supply: 'Water Supply', ventilation: 'Vent',
  search: 'Search', medical: 'Medical', exposure: 'Exposure', unassigned: 'Unassigned',
};

function EditableUnitRow({ unit, onChange, onRemove }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1.5 items-center py-1.5 border-b border-border/40 last:border-0">
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
        <SelectTrigger className="bg-secondary text-[10px] font-mono h-7 w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSIGNMENTS.map(a => <SelectItem key={a} value={a} className="text-xs font-mono">{ASSIGNMENT_LABELS[a]}</SelectItem>)}
        </SelectContent>
      </Select>
      <input
        type="number"
        min={1} max={20}
        className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground w-14 text-center"
        value={unit.personnel_count || ''}
        onChange={e => onChange({ ...unit, personnel_count: parseInt(e.target.value) || null })}
        placeholder="PAX"
        title="Personnel count"
      />
      <button onClick={onRemove} className="text-muted-foreground hover:text-red-400 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function RosterUploadDialog({ open, onClose, existingUnits, onImportUnits }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedUnits, setParsedUnits] = useState(null);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setParsedUnits(null);
    setParseError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleParse = async () => {
    if (!imageFile) return;
    setIsParsing(true);
    setParseError('');

    const { file_url } = await base44.integrations.Core.UploadFile({ file: imageFile });

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a fire department roster parser. Analyze this daily roster sheet image and extract all units/apparatus and their personnel assignments.

For each unit found, extract:
- unit_name: the unit designator (e.g. "Engine 1", "Truck 3", "Rescue 2", "Battalion 1", "Medic 4")
- unit_type: one of engine/truck/rescue/squad/battalion/medic/tanker/brush/hazmat/other
- officer: the officer/captain/lieutenant name if visible
- personnel: array of crew member names listed under that unit
- personnel_count: total count of personnel on that unit

If no assignment is shown on the roster, default to "staging".

Return ONLY the structured JSON with the units array. If you cannot identify any units, return an empty array.`,
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

    if (!result?.units || result.units.length === 0) {
      setParseError('No units found in the image. Try a clearer photo of the roster sheet.');
      setIsParsing(false);
      return;
    }

    const mapped = result.units.map(u => ({
      unit_name: u.unit_name,
      unit_type: u.unit_type || 'engine',
      officer: u.officer || '',
      personnel: u.personnel || [],
      personnel_count: u.personnel_count || (u.personnel?.length) || null,
      assignment: 'staging',
      status: 'dispatched',
      _isNew: !existingUnits.some(e => e.unit_name.toLowerCase() === u.unit_name.toLowerCase()),
    }));

    setParsedUnits(mapped);
    setIsParsing(false);
  };

  const handleImport = async () => {
    if (!parsedUnits) return;
    setIsImporting(true);
    await onImportUnits(parsedUnits);
    setIsImporting(false);
    handleClose();
  };

  const handleClose = () => {
    setImageFile(null);
    setImagePreview(null);
    setParsedUnits(null);
    setParseError('');
    onClose();
  };

  const updateUnit = (idx, updated) => {
    setParsedUnits(prev => prev.map((u, i) => i === idx ? updated : u));
  };
  const removeUnit = (idx) => {
    setParsedUnits(prev => prev.filter((_, i) => i !== idx));
  };

  const newCount = parsedUnits?.filter(u => u._isNew).length || 0;
  const updateCount = parsedUnits ? parsedUnits.length - newCount : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Upload Daily Roster Sheet
          </DialogTitle>
        </DialogHeader>

        {/* Upload Zone */}
        {!imagePreview ? (
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-mono text-sm text-foreground font-semibold">Drop roster photo or click to browse</p>
            <p className="font-mono text-xs text-muted-foreground mt-1">Supports JPG, PNG, HEIC — take a photo of the printed sheet</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Image Preview */}
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={imagePreview} alt="Roster" className="w-full max-h-48 object-cover object-top" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); setParsedUnits(null); }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Parse button */}
            {!parsedUnits && !isParsing && (
              <Button onClick={handleParse} className="w-full gap-2" disabled={isParsing}>
                <Camera className="w-4 h-4" /> Extract Units from Roster
              </Button>
            )}

            {isParsing && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground font-mono text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Reading roster sheet with AI...
              </div>
            )}

            {parseError && (
              <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2 text-xs font-mono text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {parseError}
              </div>
            )}

            {/* Parsed Units Review */}
            {parsedUnits && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Review Extracted Units
                  </p>
                  <div className="flex gap-2 text-[10px] font-mono">
                    {newCount > 0 && <span className="text-green-400">+{newCount} new</span>}
                    {updateCount > 0 && <span className="text-yellow-400">~{updateCount} existing</span>}
                  </div>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1.5 mb-1 px-0">
                  {['Unit', 'Type', 'Assignment', 'PAX', ''].map((h, i) => (
                    <span key={i} className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{h}</span>
                  ))}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {parsedUnits.map((unit, idx) => (
                    <div key={idx}>
                      <EditableUnitRow
                        unit={unit}
                        onChange={(updated) => updateUnit(idx, updated)}
                        onRemove={() => removeUnit(idx)}
                      />
                      {unit.officer && (
                        <p className="text-[10px] font-mono text-cyan-400 pl-1 mb-1">
                          Officer: {unit.officer}
                          {unit.personnel?.length > 0 && ` · Crew: ${unit.personnel.join(', ')}`}
                        </p>
                      )}
                      {!unit.officer && unit.personnel?.length > 0 && (
                        <p className="text-[10px] font-mono text-muted-foreground pl-1 mb-1">
                          Crew: {unit.personnel.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {parsedUnits.length === 0 && (
                  <p className="text-xs font-mono text-muted-foreground text-center py-4">All units removed.</p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {parsedUnits && parsedUnits.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting} className="gap-2">
              {isImporting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                : <><Users className="w-4 h-4" /> Import {parsedUnits.length} Unit{parsedUnits.length !== 1 ? 's' : ''}</>
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}