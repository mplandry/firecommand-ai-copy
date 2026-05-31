import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Plus, Trash2, User, Ambulance, Camera, X, ChevronDown, ChevronUp, Users, Mic, MicOff, Loader2 } from 'lucide-react';

const WORKER_URL = 'https://anthripic-proxy.mplandry77.workers.dev';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Parse spoken patient info into structured fields via AI
async function parsePatientSpeech(transcript, hospitals) {
  const resp = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Parse this spoken patient information from an MVA scene into structured fields.

Spoken: "${transcript}"

Extract:
- name: full name in "First Last" format (e.g. "John Smith")
- sex: "male", "female", or "unknown"
- dob: date of birth in YYYY-MM-DD format (interpret spoken dates like "March 15 1985" → "1985-03-15")
- severity: one of "minor", "moderate", "critical", "deceased"
- hospital: best match from this list: ${hospitals.join(', ')}
- notes: any other info (injuries, restrained, airbag, etc.)

Return ONLY valid JSON. Use null for any field not mentioned.
{"name":null,"sex":null,"dob":null,"severity":null,"hospital":null,"notes":null}`
      }]
    })
  });
  const data = await resp.json();
  const text = (data.content || []).map(b => b.text || '').join('');
  const match = text.replace(/```json/g,'').replace(/```/g,'').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON');
  return JSON.parse(match[0]);
}

// Hook: dictate patient info with mic → AI parse → returns parsed fields
function usePatientDictation(onParsed, hospitals) {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const recRef = useRef(null);

  const start = () => {
    if (!SpeechRecognition) { setError('Speech not supported in this browser'); return; }
    setError('');
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      setProcessing(true);
      try {
        const parsed = await parsePatientSpeech(transcript, hospitals);
        onParsed(parsed);
      } catch {
        setError('Could not parse — try again');
      } finally {
        setProcessing(false);
      }
    };
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'Mic blocked — allow access in browser settings' : `Mic error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
  };

  const stop = () => { recRef.current?.stop(); setListening(false); };

  return { listening, processing, error, start, stop };
}

const MAKES_MODELS = {
  'Toyota':     ['Camry','Corolla','RAV4','Tacoma','Prius','Highlander','4Runner','Tundra','Sienna'],
  'Honda':      ['Accord','Civic','CR-V','Pilot','Odyssey','Ridgeline','HR-V','Passport'],
  'Ford':       ['F-150','Explorer','Escape','Mustang','Edge','Bronco','Ranger','Expedition','Transit'],
  'Chevrolet':  ['Silverado','Equinox','Malibu','Traverse','Colorado','Tahoe','Suburban','Corvette','Camaro','Blazer','Trax','Spark','Sonic','Bolt'],
  'Nissan':     ['Altima','Sentra','Rogue','Pathfinder','Frontier','Titan','Murano'],
  'Jeep':       ['Wrangler','Grand Cherokee','Cherokee','Compass','Gladiator'],
  'RAM':        ['1500','2500','3500','ProMaster'],
  'GMC':        ['Sierra','Yukon','Terrain','Acadia','Canyon'],
  'Dodge':      ['Charger','Challenger','Durango','Grand Caravan'],
  'Hyundai':    ['Elantra','Sonata','Tucson','Santa Fe','Palisade','Kona'],
  'Kia':        ['K5','Sorento','Sportage','Soul','Telluride','Forte'],
  'Subaru':     ['Outback','Forester','Impreza','Crosstrek','Ascent','Legacy'],
  'Volkswagen': ['Jetta','Passat','Tiguan','Atlas','Golf'],
  'BMW':        ['3 Series','5 Series','X3','X5','X1'],
  'Mercedes':   ['C-Class','E-Class','GLC','GLE','Sprinter'],
  'Audi':       ['A4','A6','Q5','Q7','Q3'],
  'Lexus':      ['ES','RX','IS','GX','NX'],
  'Tesla':      ['Model 3','Model Y','Model S','Model X','Cybertruck'],
  'Mazda':      ['CX-5','CX-9','Mazda3','Mazda6'],
  'Subaru':     ['Outback','Forester','Impreza','Crosstrek'],
  'Other':      [],
};

const COLORS  = ['White','Black','Silver','Gray','Red','Blue','Green','Yellow','Orange','Brown','Beige','Purple','Gold','Maroon','Navy','Other'];
const STATES  = ['MA','RI','NY','CT','NH','VT','ME','NJ','PA','FL','CA','TX','Other'];
const HOSPITALS = [
  'Lahey Clinic (Trauma I)',
  'Newton-Wellesley',
  'Mount Auburn',
  'Beth Israel Deaconess',
  'Mass General',
  'Boston Medical Center',
  'Tufts Medical',
  "Brigham & Women's",
  'Cambridge Hospital',
  'Other',
];
const SEVERITY = [
  { value: 'minor',    label: 'Minor',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'moderate', label: 'Moderate', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'critical', label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { value: 'deceased', label: 'Deceased', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
];

let nextVid = 1;
let nextPid = 1;

const emptyVehicle = () => ({
  id: nextVid++,
  state: 'MA', plate: '', vin: '', year: '', make: '', model: '', color: '', insurance: '',
  occupants: '',
  expanded: true,
});

// ── Patient row with dictation support ────────────────────────────────────────
function PatientRow({ p, label, onUpdate, onRemove, driverTaken }) {
  const { listening, processing, error, start, stop } = usePatientDictation((parsed) => {
    if (parsed.name     !== null) onUpdate('name',     parsed.name);
    if (parsed.sex      !== null) onUpdate('sex',      parsed.sex);
    if (parsed.dob      !== null) onUpdate('dob',      parsed.dob);
    if (parsed.severity !== null) onUpdate('severity', parsed.severity);
    if (parsed.hospital !== null) onUpdate('hospital', parsed.hospital);
    if (parsed.notes    !== null) onUpdate('notes',    parsed.notes);
  }, HOSPITALS);

  const sev = SEVERITY.find(s => s.value === p.severity) || SEVERITY[0];

  return (
    <div className="px-4 py-3 bg-card/20">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-xs font-mono font-bold text-muted-foreground">{label}</span>
        {/* Position dropdown */}
        <Select value={p.position} onValueChange={v => onUpdate('position', v)}>
          <SelectTrigger className={`h-6 text-[10px] font-mono w-36 border transition-colors ${
            p.position === 'Driver'
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
              : 'bg-secondary/60 border-border/40 text-muted-foreground'
          }`}>
            <SelectValue placeholder="Position…" />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map(pos => (
              <SelectItem
                key={pos}
                value={pos}
                disabled={pos === 'Driver' && driverTaken && p.position !== 'Driver'}
              >
                {pos === 'Driver' && driverTaken && p.position !== 'Driver' ? 'Driver (assigned)' : pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${sev.color}`}>{sev.label}</span>
        {/* Dictate button */}
        {SpeechRecognition && (
          <button
            onClick={listening ? stop : start}
            disabled={processing}
            title={listening ? 'Stop recording' : 'Dictate patient info'}
            className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
              listening
                ? 'bg-green-500/20 text-green-400 border-green-500/40 animate-pulse'
                : processing
                  ? 'bg-secondary/40 text-muted-foreground border-border/40'
                  : 'bg-secondary/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border'
            }`}
          >
            {processing
              ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Parsing…</>
              : listening
                ? <><MicOff className="w-2.5 h-2.5" /> Stop</>
                : <><Mic className="w-2.5 h-2.5" /> Dictate</>
            }
          </button>
        )}
        <button onClick={onRemove} className="ml-auto text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[10px] text-red-400 font-mono mb-1">{error}</p>}
      {listening && <p className="text-[10px] text-green-400 font-mono mb-1 animate-pulse">Listening… e.g. "John Smith male born June 3 1990 moderate Lahey"</p>}

      <div className="grid grid-cols-3 gap-2 mb-2">
        <Input value={p.name} onChange={e => onUpdate('name', e.target.value)}
          placeholder="First Last" className="h-8 text-xs font-mono bg-secondary/60" />
        <Select value={p.sex} onValueChange={v => onUpdate('sex', v)}>
          <SelectTrigger className="h-8 text-xs font-mono bg-secondary/60"><SelectValue placeholder="Sex…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Input type="date" value={p.dob} onChange={e => onUpdate('dob', e.target.value)}
            className="h-8 text-xs font-mono bg-secondary/60" />
          {p.dob && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-primary pointer-events-none">
              Age {Math.floor((Date.now() - new Date(p.dob)) / 31557600000)}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select value={p.severity} onValueChange={v => onUpdate('severity', v)}>
          <SelectTrigger className="h-8 text-xs font-mono bg-secondary/60"><SelectValue /></SelectTrigger>
          <SelectContent>{SEVERITY.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={p.hospital} onValueChange={v => onUpdate('hospital', v)}>
          <SelectTrigger className="h-8 text-xs font-mono bg-secondary/60"><SelectValue placeholder="Hospital…" /></SelectTrigger>
          <SelectContent>{HOSPITALS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={p.notes} onChange={e => onUpdate('notes', e.target.value)}
          placeholder="Injuries, restrained…" className="h-8 text-xs font-mono bg-secondary/60" />
      </div>
    </div>
  );
}

const POSITIONS = ['Driver', 'Front Passenger', 'Middle Passenger', 'Rear Passenger', 'Unknown'];

const emptyPatient = (vehicleId) => ({
  id: nextPid++,
  vehicleId,
  position: '',
  name: '', severity: 'minor', sex: '', dob: '', hospital: '', notes: '',
});

const DEFAULT = { vehicles: [], patients: [] };

export default function MVAPanel({ incidentId }) {
  const [data, setData]   = useState(DEFAULT);
  const [photos, setPhotos] = useState([]);
  const [saved, setSaved]  = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!incidentId) return;
    const raw = localStorage.getItem(`mva_${incidentId}`);
    if (raw) { try { setData(JSON.parse(raw)); } catch {} }
  }, [incidentId]);

  const persist = (next) => {
    setData(next);
    if (incidentId) {
      localStorage.setItem(`mva_${incidentId}`, JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  // ── Vehicle ops ──────────────────────────────────────────────────────────────
  const addVehicle = () => persist({ ...data, vehicles: [...data.vehicles, emptyVehicle()] });

  const removeVehicle = (vid) => persist({
    vehicles: data.vehicles.filter(v => v.id !== vid),
    patients: data.patients.filter(p => p.vehicleId !== vid),
  });

  const setVehicle = (vid, field, val) => persist({
    ...data,
    vehicles: data.vehicles.map(v =>
      v.id !== vid ? v : { ...v, [field]: val, ...(field === 'make' ? { model: '' } : {}) }
    ),
  });

  const toggleVehicle = (vid) => persist({
    ...data,
    vehicles: data.vehicles.map(v => v.id === vid ? { ...v, expanded: !v.expanded } : v),
  });

  // Create patient records for a vehicle based on occupant count
  const createPatients = (vid) => {
    const vehicle = data.vehicles.find(v => v.id === vid);
    if (!vehicle) return;
    const count = parseInt(vehicle.occupants) || 0;
    if (count < 1) return;
    // Remove existing patients for this vehicle and recreate
    const existing = data.patients.filter(p => p.vehicleId !== vid);
    const newPatients = Array.from({ length: count }, () => emptyPatient(vid));
    persist({ ...data, patients: [...existing, ...newPatients] });
  };

  // ── Patient ops ──────────────────────────────────────────────────────────────
  const setPatient = (pid, field, val) => persist({
    ...data,
    patients: data.patients.map(p => p.id === pid ? { ...p, [field]: val } : p),
  });

  const removePatient = (pid) => persist({
    ...data,
    patients: data.patients.filter(p => p.id !== pid),
  });

  const addUnassignedPatient = () => persist({
    ...data,
    patients: [...data.patients, emptyPatient(null)],
  });

  // ── Photos ────────────────────────────────────────────────────────────────────
  const handleCamera = (e) => {
    Array.from(e.target.files).forEach(f =>
      setPhotos(prev => [...prev, { id: Date.now() + Math.random(), url: URL.createObjectURL(f) }])
    );
    e.target.value = '';
  };

  // ── Summary counts ────────────────────────────────────────────────────────────
  const totalPatients = data.patients.length;
  const critCount = data.patients.filter(p => p.severity === 'critical').length;

  return (
    <div className="space-y-6 p-4 max-w-5xl mx-auto">

      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm font-mono">
          <span className="text-muted-foreground">
            <span className="text-foreground font-bold">{data.vehicles.length}</span> vehicle{data.vehicles.length !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">
            <span className="text-foreground font-bold">{totalPatients}</span> patient{totalPatients !== 1 ? 's' : ''}
            {critCount > 0 && <span className="text-red-400 ml-1">· {critCount} critical</span>}
          </span>
        </div>
        {saved && <span className="text-xs font-mono text-emerald-400">✓ Auto-saved</span>}
      </div>

      {/* ── VEHICLES + LINKED PATIENTS ──────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" /> Vehicles
          </h2>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addVehicle}>
            <Plus className="w-3 h-3" /> Add Vehicle
          </Button>
        </div>

        {data.vehicles.length === 0 && (
          <p className="text-muted-foreground text-xs italic py-2">No vehicles recorded — tap Add Vehicle</p>
        )}

        {data.vehicles.map((v, vIdx) => {
          const vPatients = data.patients.filter(p => p.vehicleId === v.id);
          return (
            <div key={v.id} className="border border-border/60 rounded-xl overflow-hidden">

              {/* Vehicle header */}
              <div className="bg-secondary/40 px-4 py-3 flex items-center gap-3">
                <button onClick={() => toggleVehicle(v.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                  {v.expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="font-mono font-bold text-sm text-foreground">Vehicle {vIdx + 1}</span>
                  {(v.make || v.plate) && (
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      {[v.state && v.plate ? `${v.state} ${v.plate}` : v.plate, v.color, v.year, v.make, v.model].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {vPatients.length > 0 && (
                    <span className="ml-auto shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {vPatients.length} patient{vPatients.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
                <button onClick={() => removeVehicle(v.id)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {v.expanded && (
                <div className="p-4 space-y-3 bg-card/30">
                  {/* Plate + State */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">State</label>
                      <Select value={v.state} onValueChange={val => setVehicle(v.id, 'state', val)}>
                        <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Plate Number</label>
                      <Input value={v.plate} onChange={e => setVehicle(v.id, 'plate', e.target.value.toUpperCase())}
                        placeholder={v.state !== 'Other' ? `${v.state} plate…` : 'Plate number'}
                        className="h-9 text-sm font-mono bg-secondary/60 mt-1" />
                    </div>
                  </div>

                  {/* Year / Make / Model / Color */}
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Year</label>
                      <Input value={v.year} onChange={e => setVehicle(v.id, 'year', e.target.value)}
                        placeholder="2022" className="h-9 text-sm font-mono bg-secondary/60 mt-1" maxLength={4} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Make</label>
                      <Select value={v.make} onValueChange={val => setVehicle(v.id, 'make', val)}>
                        <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1"><SelectValue placeholder="Make…" /></SelectTrigger>
                        <SelectContent>{Object.keys(MAKES_MODELS).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Model</label>
                      {v.make && v.make !== 'Other' && MAKES_MODELS[v.make]?.length > 0 ? (
                        <>
                          <Select value={MAKES_MODELS[v.make].includes(v.model) ? v.model : ''} onValueChange={val => setVehicle(v.id, 'model', val)}>
                            <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>{MAKES_MODELS[v.make].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input value={v.model} onChange={e => setVehicle(v.id, 'model', e.target.value)}
                            placeholder="Or type model…" className="h-8 text-xs font-mono bg-secondary/60 mt-1" />
                        </>
                      ) : (
                        <Input value={v.model} onChange={e => setVehicle(v.id, 'model', e.target.value)}
                          placeholder="Model…" className="h-9 text-sm font-mono bg-secondary/60 mt-1" />
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Color</label>
                      <Select value={v.color} onValueChange={val => setVehicle(v.id, 'color', val)}>
                        <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1"><SelectValue placeholder="Color…" /></SelectTrigger>
                        <SelectContent>{COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* VIN + Insurance */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">VIN</label>
                      <Input value={v.vin} onChange={e => setVehicle(v.id, 'vin', e.target.value.toUpperCase())}
                        placeholder="17-character VIN" className="h-9 text-sm font-mono bg-secondary/60 mt-1" maxLength={17} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Insurance</label>
                      <Input value={v.insurance} onChange={e => setVehicle(v.id, 'insurance', e.target.value)}
                        placeholder="Company / Policy #" className="h-9 text-sm font-mono bg-secondary/60 mt-1" />
                    </div>
                  </div>

                  {/* Occupant count → generate patients */}
                  <div className="flex items-end gap-3 pt-1 border-t border-border/40 mt-2">
                    <div className="w-32">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1">
                        <Users className="w-3 h-3" /> Occupants
                      </label>
                      <Input
                        type="number" min="1" max="20"
                        value={v.occupants}
                        onChange={e => setVehicle(v.id, 'occupants', e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-9 gap-1.5 text-xs"
                      disabled={!v.occupants || parseInt(v.occupants) < 1}
                      onClick={() => createPatients(v.id)}
                    >
                      <User className="w-3.5 h-3.5" />
                      {vPatients.length > 0 ? 'Regenerate Patient Logs' : 'Create Patient Logs'}
                    </Button>
                    {vPatients.length > 0 && (
                      <span className="text-xs font-mono text-muted-foreground">{vPatients.length} log{vPatients.length !== 1 ? 's' : ''} created</span>
                    )}
                  </div>
                </div>
              )}

              {/* Patient records for this vehicle */}
              {vPatients.length > 0 && (
                <div className="border-t border-border/40 divide-y divide-border/30">
                  {vPatients.map((p, pIdx) => {
                    const driverTaken = vPatients.some(op => op.id !== p.id && op.position === 'Driver');
                    return (
                      <PatientRow
                        key={p.id}
                        p={p}
                        label={`V${vIdx + 1} · Patient ${pIdx + 1}`}
                        onUpdate={(field, val) => setPatient(p.id, field, val)}
                        onRemove={() => removePatient(p.id)}
                        driverTaken={driverTaken}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* ── UNASSIGNED PATIENTS ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono font-bold flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" /> Additional Patients
          </h2>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addUnassignedPatient}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>
        {data.patients.filter(p => !p.vehicleId).map((p, idx) => (
          <PatientRow
            key={p.id}
            p={p}
            label={`Patient ${idx + 1}`}
            onUpdate={(field, val) => setPatient(p.id, field, val)}
            onRemove={() => removePatient(p.id)}
          />
        ))}
      </section>

      {/* ── SCENE PHOTOS ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono font-bold flex items-center gap-2">
            <Camera className="w-4 h-4 text-primary" /> Scene Photos
          </h2>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => cameraRef.current?.click()}>
            <Camera className="w-3 h-3" /> Take Photo
          </Button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            className="hidden" onChange={handleCamera} />
        </div>
        {photos.length === 0 && <p className="text-muted-foreground text-xs italic py-2">No photos yet</p>}
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative rounded-xl overflow-hidden border border-border/40 aspect-square">
              <img src={photo.url} alt="Scene" className="w-full h-full object-cover" />
              <button onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}
                className="absolute top-1 right-1 bg-black/70 rounded-full p-1 text-white hover:bg-black/90">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
