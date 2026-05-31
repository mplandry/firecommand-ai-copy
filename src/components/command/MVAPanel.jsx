import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Plus, Trash2, User, Ambulance, Camera, X, Save } from 'lucide-react';

// ── Vehicle data ─────────────────────────────────────────────────────────────
const MAKES_MODELS = {
  'Toyota':     ['Camry','Corolla','RAV4','Tacoma','Prius','Highlander','4Runner','Tundra','Avalon','Sienna'],
  'Honda':      ['Accord','Civic','CR-V','Pilot','Odyssey','Ridgeline','HR-V','Passport'],
  'Ford':       ['F-150','Explorer','Escape','Mustang','Edge','Bronco','Ranger','Expedition','Transit'],
  'Chevrolet':  ['Silverado','Equinox','Malibu','Traverse','Colorado','Tahoe','Suburban','Blazer','Trax'],
  'Nissan':     ['Altima','Sentra','Rogue','Pathfinder','Frontier','Titan','Murano','Kicks'],
  'Jeep':       ['Wrangler','Grand Cherokee','Cherokee','Compass','Gladiator'],
  'RAM':        ['1500','2500','3500','ProMaster'],
  'GMC':        ['Sierra','Yukon','Terrain','Acadia','Canyon'],
  'Dodge':      ['Charger','Challenger','Durango','Grand Caravan'],
  'Hyundai':    ['Elantra','Sonata','Tucson','Santa Fe','Palisade','Kona'],
  'Kia':        ['Optima','K5','Sorento','Sportage','Soul','Telluride','Forte'],
  'Subaru':     ['Outback','Forester','Impreza','Crosstrek','Ascent','Legacy'],
  'Volkswagen': ['Jetta','Passat','Tiguan','Atlas','Golf'],
  'BMW':        ['3 Series','5 Series','X3','X5','7 Series','X1'],
  'Mercedes':   ['C-Class','E-Class','GLC','GLE','GLS','Sprinter'],
  'Audi':       ['A4','A6','Q5','Q7','Q3'],
  'Lexus':      ['ES','RX','IS','GX','NX'],
  'Volvo':      ['XC60','XC90','S60','V60'],
  'Tesla':      ['Model 3','Model Y','Model S','Model X','Cybertruck'],
  'Mazda':      ['CX-5','CX-9','Mazda3','Mazda6'],
  'Acura':      ['MDX','RDX','TLX'],
  'Infiniti':   ['QX50','QX60','Q50'],
  'Cadillac':   ['Escalade','XT5','CT5'],
  'Lincoln':    ['Navigator','Nautilus','Corsair'],
  'Other':      [],
};

const COLORS = ['White','Black','Silver','Gray','Red','Blue','Green','Yellow','Orange','Brown','Beige','Purple','Gold','Maroon','Navy','Teal','Other'];

const STATES = ['MA','RI','NY','CT','NH','VT','ME','NJ','PA','FL','CA','TX','Other'];

const HOSPITALS = [
  'Lahey Clinic',
  'Newton-Wellesley',
  'Mount Auburn',
  'Beth Israel Deaconess',
  'Mass General',
  'Boston Medical Center',
  'Tufts Medical',
  'Brigham & Women\'s',
  'Cambridge Hospital',
  'Other',
];

const SEVERITY = [
  { value: 'minor',    label: 'Minor',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'moderate', label: 'Moderate', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'critical', label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { value: 'deceased', label: 'Deceased', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
];

const DEFAULT_STATE = { vehicles: [], patients: [] };
let vid = 1, pid = 1;

const emptyVehicle = () => ({ id: vid++, state: 'MA', plate: '', vin: '', year: '', make: '', model: '', color: '', insurance: '' });
const emptyPatient = () => ({ id: pid++, severity: 'minor', sex: '', dob: '', hospital: '', notes: '' });

export default function MVAPanel({ incidentId }) {
  const [data, setData] = useState(DEFAULT_STATE);
  const [photos, setPhotos] = useState([]);
  const [saved, setSaved] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!incidentId) return;
    const raw = localStorage.getItem(`mva_${incidentId}`);
    if (raw) { try { setData(JSON.parse(raw)); } catch {} }
  }, [incidentId]);

  const save = (next) => {
    setData(next);
    if (incidentId) {
      localStorage.setItem(`mva_${incidentId}`, JSON.stringify(next));
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  // Vehicle helpers
  const addVehicle    = () => save({ ...data, vehicles: [...data.vehicles, emptyVehicle()] });
  const removeVehicle = (id) => save({ ...data, vehicles: data.vehicles.filter(v => v.id !== id) });
  const setVehicle    = (id, field, val) => save({ ...data, vehicles: data.vehicles.map(v => v.id === id ? { ...v, [field]: val, ...(field === 'make' ? { model: '' } : {}) } : v) });

  // Patient helpers
  const addPatient    = () => save({ ...data, patients: [...data.patients, emptyPatient()] });
  const removePatient = (id) => save({ ...data, patients: data.patients.filter(p => p.id !== id) });
  const setPatient    = (id, field, val) => save({ ...data, patients: data.patients.map(p => p.id === id ? { ...p, [field]: val } : p) });

  // Photos
  const handleCamera = (e) => {
    Array.from(e.target.files).forEach(f => {
      setPhotos(prev => [...prev, { id: Date.now() + Math.random(), url: URL.createObjectURL(f) }]);
    });
    e.target.value = '';
  };

  const critCount = data.patients.filter(p => p.severity === 'critical').length;

  return (
    <div className="space-y-6 p-4 max-w-4xl mx-auto">

      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm font-mono">
          <span className="text-muted-foreground">
            <span className="text-foreground font-bold">{data.vehicles.length}</span> vehicle{data.vehicles.length !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">
            <span className="text-foreground font-bold">{data.patients.length}</span> patient{data.patients.length !== 1 ? 's' : ''}
            {critCount > 0 && <span className="text-red-400 ml-1">· {critCount} critical</span>}
          </span>
        </div>
        {saved && <span className="text-xs font-mono text-emerald-400">✓ Auto-saved</span>}
      </div>

      {/* ── VEHICLES ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
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

        <div className="space-y-4">
          {data.vehicles.map((v, idx) => (
            <div key={v.id} className="bg-secondary/30 border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-foreground">Vehicle {idx + 1}</span>
                <button onClick={() => removeVehicle(v.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Plate with state */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">State</label>
                  <Select value={v.state} onValueChange={val => setVehicle(v.id, 'state', val)}>
                    <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Plate Number</label>
                  <Input
                    value={v.plate}
                    onChange={e => setVehicle(v.id, 'plate', e.target.value.toUpperCase())}
                    placeholder={v.state !== 'Other' ? `${v.state} plate…` : 'Enter plate number'}
                    className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                  />
                </div>
              </div>

              {/* Year / Make / Model / Color */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Year</label>
                  <Input
                    value={v.year}
                    onChange={e => setVehicle(v.id, 'year', e.target.value)}
                    placeholder="2021"
                    className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Make</label>
                  <Select value={v.make} onValueChange={val => setVehicle(v.id, 'make', val)}>
                    <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1">
                      <SelectValue placeholder="Make…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(MAKES_MODELS).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Model</label>
                  {v.make && v.make !== 'Other' && MAKES_MODELS[v.make]?.length > 0 ? (
                    <Select value={v.model} onValueChange={val => setVehicle(v.id, 'model', val)}>
                      <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1">
                        <SelectValue placeholder="Model…" />
                      </SelectTrigger>
                      <SelectContent>
                        {MAKES_MODELS[v.make].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={v.model}
                      onChange={e => setVehicle(v.id, 'model', e.target.value)}
                      placeholder="Model…"
                      className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                    />
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Color</label>
                  <Select value={v.color} onValueChange={val => setVehicle(v.id, 'color', val)}>
                    <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1">
                      <SelectValue placeholder="Color…" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* VIN + Insurance */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">VIN</label>
                  <Input
                    value={v.vin}
                    onChange={e => setVehicle(v.id, 'vin', e.target.value.toUpperCase())}
                    placeholder="17-character VIN"
                    className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                    maxLength={17}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Insurance</label>
                  <Input
                    value={v.insurance}
                    onChange={e => setVehicle(v.id, 'insurance', e.target.value)}
                    placeholder="Company / Policy #"
                    className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PATIENTS ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-mono font-bold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Patients
          </h2>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addPatient}>
            <Plus className="w-3 h-3" /> Add Patient
          </Button>
        </div>

        {data.patients.length === 0 && (
          <p className="text-muted-foreground text-xs italic py-2">No patients recorded — tap Add Patient</p>
        )}

        <div className="space-y-4">
          {data.patients.map((p, idx) => {
            const sev = SEVERITY.find(s => s.value === p.severity) || SEVERITY[0];
            return (
              <div key={p.id} className="bg-secondary/30 border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-foreground">Patient {idx + 1}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${sev.color}`}>
                      {sev.label.toUpperCase()}
                    </span>
                  </div>
                  <button onClick={() => removePatient(p.id)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Severity</label>
                    <Select value={p.severity} onValueChange={v => setPatient(p.id, 'severity', v)}>
                      <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Sex</label>
                    <Select value={p.sex} onValueChange={v => setPatient(p.id, 'sex', v)}>
                      <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Date of Birth</label>
                    <Input
                      type="date"
                      value={p.dob}
                      onChange={e => setPatient(p.id, 'dob', e.target.value)}
                      className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1">
                      <Ambulance className="w-3 h-3" /> Hospital
                    </label>
                    <Select value={p.hospital} onValueChange={v => setPatient(p.id, 'hospital', v)}>
                      <SelectTrigger className="h-9 text-sm font-mono bg-secondary/60 mt-1">
                        <SelectValue placeholder="Select hospital…" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOSPITALS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Notes</label>
                    <Input
                      value={p.notes}
                      onChange={e => setPatient(p.id, 'notes', e.target.value)}
                      placeholder="Restrained, airbag deployed…"
                      className="h-9 text-sm font-mono bg-secondary/60 mt-1"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

        {photos.length === 0 && (
          <p className="text-muted-foreground text-xs italic py-2">No photos taken — tap Take Photo to capture scene</p>
        )}

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
