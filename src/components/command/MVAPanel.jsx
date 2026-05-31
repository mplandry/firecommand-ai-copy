import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Plus, Trash2, User, Ambulance, Camera, X, ChevronDown, ChevronUp, Users, Mic, MicOff, Loader2, ExternalLink, Search, Phone, MapPin, ScanLine } from 'lucide-react';

// ── Insurance company website lookup ─────────────────────────────────────────
const INSURANCE_SITES = {
  'geico':            'geico.com',
  'progressive':      'progressive.com',
  'state farm':       'statefarm.com',
  'allstate':         'allstate.com',
  'usaa':             'usaa.com',
  'liberty mutual':   'libertymutual.com',
  'nationwide':       'nationwide.com',
  'travelers':        'travelers.com',
  'farmers':          'farmers.com',
  'american family':  'amfam.com',
  'erie':             'erieinsurance.com',
  'auto-owners':      'auto-owners.com',
  'metlife':          'metlife.com',
  'aaa':              'aaa.com',
  'amica':            'amica.com',
  'arbella':          'arbella.com',
  'plymouth rock':    'plymouthrock.com',
  'commerce':         'commerceinsurance.com',
  'safety insurance': 'safetyinsurance.com',
  'mapfre':           'mapfreinsurance.com',
  'hanover':          'hanover.com',
  'peerless':         'peerlessinsurance.com',
  'bristol west':     'bristolwest.com',
  'metropolitan':     'metlife.com',
  'hartford':         'thehartford.com',
};

async function lookupInsurance(company, city) {
  const resp = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `What is the claims phone number and address for ${company} insurance${city ? ` in ${city}` : ''}?

Return ONLY valid JSON:
{"phone": "claims phone number or main number", "address": "street address, city, state zip or null if unknown"}

Use null if you don't have reliable information. For major insurers (Geico, State Farm, Progressive, Allstate, etc.) return their national claims number.`
      }]
    })
  });
  const data = await resp.json();
  const text = (data.content || []).map(b => b.text || '').join('');
  const match = text.replace(/```json/g,'').replace(/```/g,'').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON');
  return JSON.parse(match[0]);
}

function getInsuranceLink(company, city) {
  if (!company || !city) return null;
  const key = company.toLowerCase().trim();
  const site = Object.entries(INSURANCE_SITES).find(([k]) => key.includes(k));
  if (site) return `https://www.${site[1]}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`${company} insurance ${city}`)}`;
}

const WORKER_URL = 'https://anthripic-proxy.mplandry77.workers.dev';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── Document scanner helpers ──────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function scanDocumentWithAI(base64, mediaType, prompt) {
  const resp = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: prompt }
        ]
      }]
    })
  });
  const data = await resp.json();
  const text = (data.content || []).map(b => b.text || '').join('');
  const match = text.replace(/```json/g,'').replace(/```/g,'').trim().match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  return JSON.parse(match[0]);
}

async function parseRegistrationScan(base64, mediaType) {
  return scanDocumentWithAI(base64, mediaType, `This is a vehicle registration document or registration sticker. Extract all visible fields.

Return ONLY valid JSON — use null for anything not visible:
{"plate":"","state":"","vin":"","year":"","make":"","model":"","insuranceCompany":""}

Rules:
- plate: license plate number, uppercase, no spaces
- state: 2-letter state abbreviation (e.g. "MA")
- vin: 17-character VIN if visible
- year: 4-digit model year
- make: vehicle manufacturer (e.g. "Toyota", "Ford")
- model: vehicle model (e.g. "Camry", "F-150")
- insuranceCompany: insurance company name if shown on registration`);
}

async function parseIDScan(base64, mediaType) {
  return scanDocumentWithAI(base64, mediaType, `This is a driver's license or state ID. Extract the fields.

Return ONLY valid JSON — use null for anything not visible:
{"name":"","dob":"","sex":""}

Rules:
- name: "First Last" format from the license
- dob: date of birth as YYYY-MM-DD
- sex: "male" or "female" based on the M/F field on the ID`);
}

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
        content: `You are parsing spoken patient information collected at an MVA scene by a firefighter.
The speaker says the info in natural order — typically first name, last name, sex, date of birth, severity, hospital.

Spoken transcript: "${transcript}"

Rules:
- name: First name then last name, "First Last" format. The first two words that sound like a person's name are likely first and last name.
- sex: listen for "male", "female", "man", "woman", "guy", "lady", "he", "she" — return "male" or "female" or "unknown"
- dob: spoken as "born [date]", "date of birth [date]", "DOB [date]", or just a date. Convert to YYYY-MM-DD. Examples: "March 15 1985"→"1985-03-15", "6/3/90"→"1990-06-03", "January 5th 1992"→"1992-01-05". For 2-digit years: 00-30 = 2000s, 31-99 = 1900s.
- severity: "minor", "moderate", "critical", or "deceased". Also accept: "stable"→"minor", "serious"→"moderate", "critical"→"critical", "DOA"/"dead"→"deceased"
- hospital: best match from: ${hospitals.join(', ')}. "Lahey" matches "Lahey Clinic", "Mass General" or "MGH" matches "Mass General", etc.
- notes: anything else (injuries, restrained, airbag deployed, unconscious, etc.)

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

// Hook: dictate patient info — keeps mic open until user taps Stop
function usePatientDictation(onParsed, hospitals) {
  const [listening, setListening]     = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [interim, setInterim]         = useState('');
  const [accumulated, setAccumulated] = useState('');
  const [error, setError]             = useState('');
  const recRef        = useRef(null);
  const transcriptRef = useRef('');
  const manualStop    = useRef(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const boot = () => {
    if (manualStop.current) return;
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = !isIOS;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let final = '', inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else inter += t;
      }
      if (final) {
        transcriptRef.current += (transcriptRef.current ? ' ' : '') + final;
        setAccumulated(transcriptRef.current);
        setInterim('');
      } else {
        setInterim(inter);
      }
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech') return;
      setError(e.error === 'not-allowed'
        ? 'Mic blocked — allow access in browser settings'
        : `Mic error: ${e.error}`);
      setListening(false);
      manualStop.current = true;
    };

    rec.onend = () => {
      setInterim('');
      if (!manualStop.current) {
        setTimeout(boot, 50); // fast restart to minimize gap
      }
    };

    recRef.current = rec;
    try { rec.start(); } catch { /* already started */ }
  };

  const start = () => {
    if (!SpeechRecognition) { setError('Speech not supported in this browser'); return; }
    setError('');
    setAccumulated('');
    transcriptRef.current = '';
    manualStop.current = false;
    boot();
  };

  const stop = async () => {
    manualStop.current = true;
    recRef.current?.stop();
    setListening(false);
    setInterim('');
    const transcript = transcriptRef.current.trim();
    if (!transcript) return;
    setProcessing(true);
    try {
      const parsed = await parsePatientSpeech(transcript, hospitals);
      onParsed(parsed);
    } catch {
      setError('Could not parse — try again');
    } finally {
      setProcessing(false);
      setAccumulated('');
    }
  };

  return { listening, processing, interim, accumulated, error, start, stop };
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
  state: 'MA', plate: '', vin: '', year: '', make: '', model: '', color: '',
  insuranceCompany: '', insuranceCity: '', insurancePhone: '', insuranceAddress: '',
  occupants: '',
  expanded: true,
});

// ── Scan Registration button ──────────────────────────────────────────────────
function ScanRegistrationButton({ onScanned }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError]       = useState('');
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setError('');
    setScanning(true);
    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || 'image/jpeg';
      const fields = await parseRegistrationScan(base64, mediaType);
      onScanned(fields);
    } catch {
      setError('Scan failed — fill in manually');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
        onClick={() => inputRef.current?.click()} disabled={scanning}>
        {scanning
          ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</>
          : <><ScanLine className="w-3 h-3" /> Scan Registration</>
        }
      </Button>
      {error && <span className="text-xs text-red-400 font-mono">{error}</span>}
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Insurance lookup section ──────────────────────────────────────────────────
function InsuranceSection({ v, setVehicle }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const lookup = async () => {
    if (!v.insuranceCompany) return;
    setLoading(true);
    setError('');
    try {
      const result = await lookupInsurance(v.insuranceCompany, v.insuranceCity);
      if (result.phone)   setVehicle(v.id, 'insurancePhone',   result.phone);
      if (result.address) setVehicle(v.id, 'insuranceAddress', result.address);
    } catch {
      setError('Could not look up — enter manually');
    } finally {
      setLoading(false);
    }
  };

  const webLink = getInsuranceLink(v.insuranceCompany, v.insuranceCity);

  return (
    <div className="space-y-2">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Insurance</label>

      {/* Company + City */}
      <div className="grid grid-cols-2 gap-2">
        <Input value={v.insuranceCompany}
          onChange={e => setVehicle(v.id, 'insuranceCompany', e.target.value)}
          placeholder="Company name"
          className="h-9 text-sm font-mono bg-secondary/60" />
        <Input value={v.insuranceCity}
          onChange={e => setVehicle(v.id, 'insuranceCity', e.target.value)}
          placeholder="Agent city"
          className="h-9 text-sm font-mono bg-secondary/60" />
      </div>

      {/* Action row */}
      {v.insuranceCompany && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
            onClick={lookup} disabled={loading}>
            {loading
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Looking up…</>
              : <><Search className="w-3 h-3" /> Look Up Phone &amp; Address</>
            }
          </Button>
          {webLink && (
            <a href={webLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 transition-colors">
              <ExternalLink className="w-3 h-3" /> Website
            </a>
          )}
          {error && <span className="text-xs text-red-400 font-mono">{error}</span>}
        </div>
      )}

      {/* Phone */}
      <div className="flex items-center gap-2">
        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <Input value={v.insurancePhone}
          onChange={e => setVehicle(v.id, 'insurancePhone', e.target.value)}
          placeholder="Claims phone number"
          className="h-8 text-sm font-mono bg-secondary/60 flex-1" />
        {v.insurancePhone && (
          <a href={`tel:${v.insurancePhone.replace(/\D/g,'')}`}
            className="text-xs font-mono text-primary hover:text-primary/80">Call</a>
        )}
      </div>

      {/* Address */}
      <div className="flex items-start gap-2">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-2" />
        <Input value={v.insuranceAddress}
          onChange={e => setVehicle(v.id, 'insuranceAddress', e.target.value)}
          placeholder="Office address"
          className="h-8 text-sm font-mono bg-secondary/60 flex-1" />
      </div>
    </div>
  );
}

// ── Patient row with dictation + ID scan support ─────────────────────────────
function PatientRow({ p, label, onUpdate, onRemove, driverTaken }) {
  const [scanningId, setScanningId] = useState(false);
  const [scanError, setScanError]   = useState('');
  const idInputRef = useRef(null);

  const handleIDFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setScanError('');
    setScanningId(true);
    try {
      const base64 = await fileToBase64(file);
      const mediaType = file.type || 'image/jpeg';
      const fields = await parseIDScan(base64, mediaType);
      if (fields.name) onUpdate('name', fields.name);
      if (fields.dob)  onUpdate('dob',  fields.dob);
      if (fields.sex)  onUpdate('sex',  fields.sex);
    } catch {
      setScanError('ID scan failed');
    } finally {
      setScanningId(false);
    }
  };

  const { listening, processing, interim, accumulated, error, start, stop } = usePatientDictation((parsed) => {
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
        {/* Scan ID button */}
        <button
          onClick={() => idInputRef.current?.click()}
          disabled={scanningId}
          title="Scan driver's license"
          className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border transition-colors bg-secondary/40 text-muted-foreground border-border/40 hover:text-foreground hover:border-border disabled:opacity-50"
        >
          {scanningId
            ? <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Scanning…</>
            : <><ScanLine className="w-2.5 h-2.5" /> Scan ID</>
          }
        </button>
        <input ref={idInputRef} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={handleIDFile} />

        <button onClick={onRemove} className="ml-auto text-muted-foreground hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {(error || scanError) && <p className="text-[10px] text-red-400 font-mono mb-1">{error || scanError}</p>}
      {listening && (
        <div className="text-[10px] font-mono mb-2 space-y-1 bg-green-500/5 border border-green-500/20 rounded-lg p-2">
          <p><span className="text-green-400 animate-pulse">● Listening — tap Stop when done</span></p>
          <p className="text-muted-foreground">Say: <span className="text-foreground">first name · last name · male or female · born [date] · minor/moderate/critical · hospital</span></p>
          {accumulated && (
            <p className="text-foreground font-medium leading-snug">{accumulated}<span className="text-primary italic"> {interim}</span></p>
          )}
          {!accumulated && interim && <p className="text-primary italic">{interim}</p>}
        </div>
      )}

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

  // Add patient records up to the occupant count — never erases existing data
  const createPatients = (vid) => {
    const vehicle = data.vehicles.find(v => v.id === vid);
    if (!vehicle) return;
    const count = parseInt(vehicle.occupants) || 0;
    if (count < 1) return;
    const alreadyHave = data.patients.filter(p => p.vehicleId === vid).length;
    const toAdd = count - alreadyHave;
    if (toAdd <= 0) return; // already have enough, nothing to do
    const newPatients = Array.from({ length: toAdd }, () => emptyPatient(vid));
    persist({ ...data, patients: [...data.patients, ...newPatients] });
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
                  {/* Scan Registration */}
                  <ScanRegistrationButton onScanned={(fields) => {
                    if (fields.plate)            setVehicle(v.id, 'plate',            fields.plate);
                    if (fields.state)            setVehicle(v.id, 'state',            fields.state);
                    if (fields.vin)              setVehicle(v.id, 'vin',              fields.vin);
                    if (fields.year)             setVehicle(v.id, 'year',             fields.year);
                    if (fields.make)             setVehicle(v.id, 'make',             fields.make);
                    if (fields.model)            setVehicle(v.id, 'model',            fields.model);
                    if (fields.insuranceCompany) setVehicle(v.id, 'insuranceCompany', fields.insuranceCompany);
                  }} />
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

                  {/* VIN */}
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">VIN</label>
                    <Input value={v.vin} onChange={e => setVehicle(v.id, 'vin', e.target.value.toUpperCase())}
                      placeholder="17-character VIN" className="h-9 text-sm font-mono bg-secondary/60 mt-1" maxLength={17} />
                  </div>

                  {/* Insurance */}
                  <InsuranceSection v={v} setVehicle={setVehicle} />

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
                      disabled={!v.occupants || parseInt(v.occupants) < 1 || parseInt(v.occupants) <= vPatients.length}
                      onClick={() => createPatients(v.id)}
                    >
                      <User className="w-3.5 h-3.5" />
                      {vPatients.length === 0
                      ? 'Create Patient Logs'
                      : parseInt(v.occupants) > vPatients.length
                        ? `Add ${parseInt(v.occupants) - vPatients.length} More`
                        : 'Patient Logs Created'
                    }
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
