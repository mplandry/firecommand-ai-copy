import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Loader2 } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const defaultPersonnel = {
  engine: 3, truck: 3, rescue: 3, squad: 3,
  deputy: 1, medic: 2, tanker: 3, brush: 3,
  hazmat: 3, other: 3,
};

// Guess unit type from spoken name
function detectUnitType(name) {
  const n = name.toLowerCase();
  if (/engine|eng/.test(n))                    return 'engine';
  if (/truck|ladder|lad/.test(n))              return 'truck';
  if (/rescue|res/.test(n))                    return 'rescue';
  if (/squad/.test(n))                         return 'squad';
  if (/medic|amb|ems/.test(n))                 return 'medic';
  if (/tanker|tender/.test(n))                 return 'tanker';
  if (/brush/.test(n))                         return 'brush';
  if (/hazmat|haz/.test(n))                    return 'hazmat';
  if (/chief|deputy|car|battalion|bat/.test(n)) return 'deputy';
  return null;
}

// Clean up common speech-to-text mishears for unit names
function cleanUnitName(text) {
  return text
    .replace(/\bniner\b/gi, '9')
    .replace(/\btree\b/gi, '3')
    .replace(/\bfower\b/gi, '4')
    .replace(/\bto\b/gi, '2')
    .replace(/\bfor\b/gi, '4')
    .trim();
}

export default function AddUnitDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    unit_name: '',
    unit_type: 'engine',
    status: 'dispatched',
    assignment: 'unassigned',
    floor: '',
    personnel_count: 3,
    officer: '',
  });
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState('');
  const recognitionRef = useRef(null);

  const handleCreate = () => {
    if (!form.unit_name.trim()) return;
    onCreate(form);
    setForm({ unit_name: '', unit_type: 'engine', status: 'dispatched', assignment: 'unassigned', floor: '', personnel_count: 3, officer: '' });
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (!SpeechRecognition) {
      setMicError('Speech not supported in this browser.');
      return;
    }
    setMicError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error !== 'no-speech') setMicError('Mic error: ' + e.error);
    };
    recognition.onresult = (event) => {
      const raw = event.results[0][0].transcript;
      const cleaned = cleanUnitName(raw);
      const detectedType = detectUnitType(cleaned);
      setForm(f => ({
        ...f,
        unit_name: cleaned,
        ...(detectedType ? {
          unit_type: detectedType,
          personnel_count: defaultPersonnel[detectedType] ?? f.personnel_count,
        } : {}),
      }));
    };
    recognition.start();
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
            <div className="flex gap-2">
              <Input
                value={form.unit_name}
                onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                placeholder="e.g. Engine 2, ARL Ladder 1"
                className="bg-secondary font-mono"
              />
              <button
                type="button"
                onClick={toggleMic}
                title={isListening ? 'Stop listening' : 'Speak unit name'}
                className={`shrink-0 w-10 h-10 rounded-md border flex items-center justify-center transition-colors ${
                  isListening
                    ? 'bg-red-500/20 border-red-500/60 text-red-400 animate-pulse'
                    : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                }`}
              >
                {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            {micError && <p className="text-xs text-red-400 font-mono mt-1">{micError}</p>}
            {isListening && <p className="text-xs text-primary font-mono mt-1 animate-pulse">Listening… say the unit name</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Type</Label>
              <Select value={form.unit_type} onValueChange={(v) => setForm({ ...form, unit_type: v, personnel_count: defaultPersonnel[v] ?? 3 })}>
                <SelectTrigger className="bg-secondary font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engine">Engine</SelectItem>
                  <SelectItem value="truck">Truck/Ladder</SelectItem>
                  <SelectItem value="rescue">Rescue</SelectItem>
                  <SelectItem value="squad">Squad</SelectItem>
                  <SelectItem value="deputy">Deputy / Chief</SelectItem>
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