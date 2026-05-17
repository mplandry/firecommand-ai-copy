import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Camera, Loader2, CheckCircle2, AlertTriangle, Trash2, Users, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const UNIT_TYPES = ['engine', 'truck', 'rescue', 'squad', 'deputy', 'medic', 'tanker', 'brush', 'hazmat', 'other'];
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
  const [images, setImages] = useState([]); // [{ file, preview }]
  const [isParsing, setIsParsing] = useState(false);
  const [parsedUnits, setParsedUnits] = useState(null);
  const [parseError, setParseError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const addFiles = (files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newEntries = imageFiles.map(file => ({ file, preview: URL.createObjectURL(file) }));
    setImages(prev => [...prev, ...newEntries]);
    setParsedUnits(null);
    setParseError('');
  };

  const removeImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setParsedUnits(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handleParse = async () => {
    if (images.length === 0) return;
    setIsParsing(true);
    setParseError('');

    // Upload all images in parallel
    const uploads = await Promise.all(images.map(img => base44.integrations.Core.UploadFile({ file: img.file })));
    const fileUrls = uploads.map(u => u.file_url);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a fire department roster parser. Analyze these ${fileUrls.length} daily roster sheet image(s) and extract ALL units/apparatus and their personnel assignments across all pages/sheets.

For each unit found, extract:
- unit_name: the unit designator (e.g. "Engine 1", "Truck 3", "Rescue 2", "C2", "Medic 4")
- unit_type: one of engine/truck/rescue/squad/deputy/medic/tanker/brush/hazmat/other
- officer: the officer/captain/lieutenant name if visible
- personnel: array of crew member names listed under that unit
- personnel_count: total count of personnel on that unit

Deduplicate units that appear on multiple pages (use the most complete record). If no assignment is shown, default to "staging".

Return ONLY the structured JSON with the units array.`,
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

    if (!result?.units || result.units.length === 0) {
      setParseError('No units found in the images. Try clearer photos of the roster sheet.');
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
    setImages([]);
    setParsedUnits(null);
    setParseError('');
    onClose();
  };

  const updateUnit = (idx, updated) => setParsedUnits(prev => prev.map((u, i) => i === idx ? updated : u));
  const removeUnit = (idx) => setParsedUnits(prev => prev.filter((_, i) => i !== idx));

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

        {/* Drop Zone */}
        <div
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="font-mono text-sm text-foreground font-semibold">Drop roster photos or click to browse</p>
          <p className="font-mono text-xs text-muted-foreground mt-1">Multiple pages supported — add as many photos as needed</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
        </div>

        {/* Image Previews */}
        {images.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {images.length} photo{images.length !== 1 ? 's' : ''} queued
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1 h-7"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-3 h-3" /> Add more
              </Button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-border aspect-[3/4]">
                  <img src={img.preview} alt={`Roster ${idx + 1}`} className="w-full h-full object-cover object-top" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 text-white hover:bg-black/90"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] font-mono text-center py-0.5 text-white">
                    Page {idx + 1}
                  </div>
                </div>
              ))}
            </div>

            {!parsedUnits && !isParsing && (
              <Button onClick={handleParse} className="w-full gap-2">
                <Camera className="w-4 h-4" /> Extract Units from {images.length} Photo{images.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        )}

        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground font-mono text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Reading {images.length} roster photo{images.length !== 1 ? 's' : ''} with AI...
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
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Review Extracted Units</p>
              <div className="flex gap-2 text-[10px] font-mono">
                {newCount > 0 && <span className="text-green-400">+{newCount} new</span>}
                {updateCount > 0 && <span className="text-yellow-400">~{updateCount} existing</span>}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-1.5 mb-1">
              {['Unit', 'Type', 'Assignment', 'PAX', ''].map((h, i) => (
                <span key={i} className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{h}</span>
              ))}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {parsedUnits.map((unit, idx) => (
                <div key={idx}>
                  <EditableUnitRow unit={unit} onChange={(u) => updateUnit(idx, u)} onRemove={() => removeUnit(idx)} />
                  {unit.officer && (
                    <p className="text-[10px] font-mono text-cyan-400 pl-1 mb-1">
                      Officer: {unit.officer}{unit.personnel?.length > 0 && ` · Crew: ${unit.personnel.join(', ')}`}
                    </p>
                  )}
                  {!unit.officer && unit.personnel?.length > 0 && (
                    <p className="text-[10px] font-mono text-muted-foreground pl-1 mb-1">Crew: {unit.personnel.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
            {parsedUnits.length === 0 && (
              <p className="text-xs font-mono text-muted-foreground text-center py-4">All units removed.</p>
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