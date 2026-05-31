import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Plus, Trash2, User, Hospital } from 'lucide-react';

const SEVERITY = [
  { value: 'minor',    label: 'Minor',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'moderate', label: 'Moderate', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { value: 'critical', label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  { value: 'deceased', label: 'Deceased', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30' },
];

const HOSPITALS = [
  'Newton-Wellesley',
  'Waltham Hospital',
  'Mt. Auburn',
  'Beth Israel',
  'Mass General',
  'Boston Medical',
  'Tufts Medical',
  'Other',
];

const DEFAULT_STATE = {
  vehicles: [],
  patients: [],
};

let vehicleIdCounter = 1;
let patientIdCounter = 1;

const emptyVehicle = () => ({
  id: vehicleIdCounter++,
  plate: '',
  vin: '',
  year: '',
  make: '',
  model: '',
  color: '',
  insurance: '',
});

const emptyPatient = () => ({
  id: patientIdCounter++,
  severity: 'minor',
  hospital: '',
  notes: '',
});

export default function MVAPanel({ incidentId }) {
  const [state, setState] = useState(DEFAULT_STATE);

  // Persist to localStorage keyed by incidentId
  useEffect(() => {
    if (!incidentId) return;
    const saved = localStorage.getItem(`mva_${incidentId}`);
    if (saved) {
      try { setState(JSON.parse(saved)); } catch {}
    }
  }, [incidentId]);

  const save = (next) => {
    setState(next);
    if (incidentId) localStorage.setItem(`mva_${incidentId}`, JSON.stringify(next));
  };

  const addVehicle = () => save({ ...state, vehicles: [...state.vehicles, emptyVehicle()] });
  const removeVehicle = (id) => save({ ...state, vehicles: state.vehicles.filter(v => v.id !== id) });
  const updateVehicle = (id, field, value) => save({
    ...state,
    vehicles: state.vehicles.map(v => v.id === id ? { ...v, [field]: value } : v),
  });

  const addPatient = () => save({ ...state, patients: [...state.patients, emptyPatient()] });
  const removePatient = (id) => save({ ...state, patients: state.patients.filter(p => p.id !== id) });
  const updatePatient = (id, field, value) => save({
    ...state,
    patients: state.patients.map(p => p.id === id ? { ...p, [field]: value } : p),
  });

  const criticalCount = state.patients.filter(p => p.severity === 'critical').length;
  const totalPatients = state.patients.length;

  return (
    <div className="p-3 space-y-4 text-xs font-mono">

      {/* Summary bar */}
      {(totalPatients > 0 || state.vehicles.length > 0) && (
        <div className="flex gap-3 bg-secondary/40 rounded-lg px-3 py-2">
          <span className="text-muted-foreground">
            <span className="text-foreground font-bold">{state.vehicles.length}</span> vehicle{state.vehicles.length !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground">
            <span className="text-foreground font-bold">{totalPatients}</span> patient{totalPatients !== 1 ? 's' : ''}
            {criticalCount > 0 && <span className="text-red-400 ml-1">({criticalCount} critical)</span>}
          </span>
        </div>
      )}

      {/* ── Vehicles ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
            <Car className="w-3 h-3" /> Vehicles
          </span>
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={addVehicle}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>

        {state.vehicles.length === 0 && (
          <p className="text-muted-foreground text-[10px] italic py-1">No vehicles recorded yet</p>
        )}

        <div className="space-y-3">
          {state.vehicles.map((v, idx) => (
            <div key={v.id} className="bg-secondary/30 border border-border/40 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Vehicle {idx + 1}</span>
                <button onClick={() => removeVehicle(v.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Plate + VIN */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Plate</label>
                  <Input
                    value={v.plate}
                    onChange={e => updateVehicle(v.id, 'plate', e.target.value.toUpperCase())}
                    placeholder="ABC 1234"
                    className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">VIN</label>
                  <Input
                    value={v.vin}
                    onChange={e => updateVehicle(v.id, 'vin', e.target.value.toUpperCase())}
                    placeholder="1HGBH41JXMN109186"
                    className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                  />
                </div>
              </div>

              {/* Year / Make / Model / Color */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Year</label>
                  <Input
                    value={v.year}
                    onChange={e => updateVehicle(v.id, 'year', e.target.value)}
                    placeholder="2019"
                    className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                    maxLength={4}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Make</label>
                  <Input
                    value={v.make}
                    onChange={e => updateVehicle(v.id, 'make', e.target.value)}
                    placeholder="Toyota"
                    className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Model</label>
                  <Input
                    value={v.model}
                    onChange={e => updateVehicle(v.id, 'model', e.target.value)}
                    placeholder="Camry"
                    className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Color</label>
                  <Input
                    value={v.color}
                    onChange={e => updateVehicle(v.id, 'color', e.target.value)}
                    placeholder="Red"
                    className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                  />
                </div>
              </div>

              {/* Insurance */}
              <div>
                <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Insurance</label>
                <Input
                  value={v.insurance}
                  onChange={e => updateVehicle(v.id, 'insurance', e.target.value)}
                  placeholder="Geico — Policy #ABC123"
                  className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Patients ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
            <User className="w-3 h-3" /> Patients
          </span>
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2" onClick={addPatient}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>

        {state.patients.length === 0 && (
          <p className="text-muted-foreground text-[10px] italic py-1">No patients recorded yet</p>
        )}

        <div className="space-y-2">
          {state.patients.map((p, idx) => {
            const sev = SEVERITY.find(s => s.value === p.severity) || SEVERITY[0];
            return (
              <div key={p.id} className="bg-secondary/30 border border-border/40 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">Patient {idx + 1}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sev.color}`}>
                      {sev.label.toUpperCase()}
                    </span>
                  </div>
                  <button onClick={() => removePatient(p.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Severity</label>
                    <Select value={p.severity} onValueChange={v => updatePatient(p.id, 'severity', v)}>
                      <SelectTrigger className="h-7 text-xs font-mono bg-secondary/60 mt-0.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITY.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Hospital className="w-2.5 h-2.5" /> Hospital
                    </label>
                    <Select value={p.hospital} onValueChange={v => updatePatient(p.id, 'hospital', v)}>
                      <SelectTrigger className="h-7 text-xs font-mono bg-secondary/60 mt-0.5">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {HOSPITALS.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-2">
                  <label className="text-[9px] text-muted-foreground uppercase tracking-wider">Notes</label>
                  <Input
                    value={p.notes}
                    onChange={e => updatePatient(p.id, 'notes', e.target.value)}
                    placeholder="e.g. restrained, airbag deployed…"
                    className="h-7 text-xs font-mono bg-secondary/60 mt-0.5"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
