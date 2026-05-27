import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Flame, ChevronRight, ChevronLeft, Plus, Trash2, CheckCircle, Building2, Truck, Users } from 'lucide-react';

const UNIT_TYPES = [
  { value: 'engine',  label: 'Engine'      },
  { value: 'truck',   label: 'Truck/Ladder' },
  { value: 'rescue',  label: 'Rescue'      },
  { value: 'squad',   label: 'Squad'       },
  { value: 'deputy',  label: 'Deputy/BC'   },
  { value: 'medic',   label: 'Medic'       },
  { value: 'tanker',  label: 'Tanker'      },
  { value: 'brush',   label: 'Brush'       },
  { value: 'hazmat',  label: 'HazMat'      },
  { value: 'other',   label: 'Other'       },
];

const STEP_LABELS = ['Department', 'Stations', 'Apparatus', 'Done'];

function StepIndicator({ current, total, labels }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {labels.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold border-2 transition-all ${
              i < current  ? 'bg-primary border-primary text-primary-foreground' :
              i === current ? 'border-primary text-primary' :
                              'border-border text-muted-foreground'
            }`}>
              {i < current ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[9px] font-mono uppercase tracking-wider ${i === current ? 'text-primary' : 'text-muted-foreground/50'}`}>
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div className={`h-px w-8 mb-4 transition-colors ${i < current ? 'bg-primary' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Step 1: Department basics ─────────────────────────────────────────────────
function StepDept({ data, onChange }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-mono font-bold text-foreground">Your Department</h2>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Tell us the basics so we can get your account set up.
        </p>
      </div>

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">
          Department Name <span className="text-red-400">*</span>
        </label>
        <input
          value={data.dept_name}
          onChange={e => onChange({ ...data, dept_name: e.target.value })}
          placeholder="Springfield Fire Department"
          className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">
          Radio / Unit Prefix <span className="text-red-400">*</span>
        </label>
        <input
          value={data.prefix}
          onChange={e => onChange({ ...data, prefix: e.target.value.toUpperCase().slice(0, 6) })}
          placeholder="e.g. WAL, CAM, SPR"
          maxLength={6}
          className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-[11px] font-mono text-muted-foreground mt-1">
          The abbreviation used in unit names on radio — e.g. <span className="text-foreground">WAL</span> Engine 1, <span className="text-foreground">CAM</span> Ladder 2
        </p>
      </div>

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">City / Town</label>
        <input
          value={data.city}
          onChange={e => onChange({ ...data, city: e.target.value })}
          placeholder="Springfield"
          className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">State</label>
        <input
          value={data.state}
          onChange={e => onChange({ ...data, state: e.target.value })}
          placeholder="MA"
          maxLength={2}
          className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">Number of Firefighters (approx.)</label>
        <input
          type="number"
          value={data.ff_count}
          onChange={e => onChange({ ...data, ff_count: e.target.value })}
          placeholder="80"
          min={1}
          className="w-full h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}

// ── Step 2: Stations ──────────────────────────────────────────────────────────
function StepStations({ data, onChange }) {
  const [newName, setNewName] = useState('');

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    onChange({ ...data, stations: [...data.stations, { name }] });
    setNewName('');
  };

  const remove = (i) => {
    onChange({ ...data, stations: data.stations.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-mono font-bold text-foreground">Fire Stations</h2>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          List each station name or address. This groups your apparatus on the tactical board.
        </p>
      </div>

      <div className="space-y-2">
        {data.stations.map((s, i) => (
          <div key={i} className="flex items-center gap-2 bg-secondary/60 border border-border/60 rounded-md px-3 py-2">
            <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="flex-1 font-mono text-sm text-foreground">{s.name}</span>
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {data.stations.length === 0 && (
          <p className="text-xs font-mono text-muted-foreground/50 py-2 text-center">No stations added yet</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="e.g. Moody St. Station, Station 1, Central Ave"
          className="flex-1 h-10 px-3 rounded-md border border-border bg-secondary text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          onClick={add}
          disabled={!newName.trim()}
          className="h-10 px-4 rounded-md bg-primary/20 border border-primary/40 text-primary text-sm font-mono font-bold hover:bg-primary/30 transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Apparatus ─────────────────────────────────────────────────────────
function StepApparatus({ data, onChange }) {
  const [newUnit, setNewUnit] = useState({ name: '', type: 'engine', personnel: 3, station: data.stations[0]?.name || '' });

  const addUnit = () => {
    if (!newUnit.name.trim()) return;
    onChange({ ...data, apparatus: [...data.apparatus, { ...newUnit, name: newUnit.name.trim() }] });
    setNewUnit({ name: '', type: 'engine', personnel: 3, station: data.stations[0]?.name || '' });
  };

  const remove = (i) => {
    onChange({ ...data, apparatus: data.apparatus.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-mono font-bold text-foreground">Apparatus</h2>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          List your units. Enter just the name without the prefix — e.g. <span className="text-foreground">Engine 1</span>, <span className="text-foreground">Ladder 2</span>.
        </p>
      </div>

      {/* Add unit row */}
      <div className="bg-secondary/40 border border-border/60 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-mono text-muted-foreground mb-1">Unit Name</label>
            <input
              value={newUnit.name}
              onChange={e => setNewUnit({ ...newUnit, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addUnit()}
              placeholder={`Engine 1, Ladder 2…`}
              className="w-full h-9 px-2.5 rounded-md border border-border bg-secondary text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-muted-foreground mb-1">Type</label>
            <select
              value={newUnit.type}
              onChange={e => setNewUnit({ ...newUnit, type: e.target.value })}
              className="w-full h-9 px-2 rounded-md border border-border bg-secondary text-xs font-mono text-foreground focus:outline-none"
            >
              {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-muted-foreground mb-1">Crew Size</label>
            <input
              type="number"
              value={newUnit.personnel}
              onChange={e => setNewUnit({ ...newUnit, personnel: parseInt(e.target.value) || 1 })}
              min={1} max={20}
              className="w-full h-9 px-2.5 rounded-md border border-border bg-secondary text-xs font-mono text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono text-muted-foreground mb-1">Station</label>
            {data.stations.length > 0 ? (
              <select
                value={newUnit.station}
                onChange={e => setNewUnit({ ...newUnit, station: e.target.value })}
                className="w-full h-9 px-2 rounded-md border border-border bg-secondary text-xs font-mono text-foreground focus:outline-none"
              >
                {data.stations.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                <option value="">Other</option>
              </select>
            ) : (
              <input
                value={newUnit.station}
                onChange={e => setNewUnit({ ...newUnit, station: e.target.value })}
                placeholder="Station name"
                className="w-full h-9 px-2.5 rounded-md border border-border bg-secondary text-xs font-mono text-foreground focus:outline-none"
              />
            )}
          </div>
        </div>
        <button
          onClick={addUnit}
          disabled={!newUnit.name.trim()}
          className="w-full h-9 rounded-md bg-primary/20 border border-primary/40 text-primary text-xs font-mono font-bold hover:bg-primary/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Unit
        </button>
      </div>

      {/* Unit list */}
      {data.apparatus.length > 0 && (
        <div className="space-y-1">
          {data.apparatus.map((u, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
              <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono text-sm text-foreground flex-1">
                <span className="text-muted-foreground text-xs">{data.prefix} </span>{u.name}
              </span>
              <span className="text-xs font-mono text-muted-foreground">{UNIT_TYPES.find(t => t.value === u.type)?.label}</span>
              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{u.personnel}</span>
              <span className="text-xs font-mono text-cyan-400/80">{u.station || '—'}</span>
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-xs font-mono text-muted-foreground mb-1.5">Anything else we should know?</label>
        <textarea
          value={data.notes}
          onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder="Mutual aid partners, special equipment, shift schedule, anything else helpful…"
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-border bg-secondary text-sm font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
    </div>
  );
}

// ── Done ──────────────────────────────────────────────────────────────────────
function StepDone({ deptName }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-6">
      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-xl font-mono font-bold text-foreground">You're all set!</h2>
        <p className="text-sm text-muted-foreground font-mono mt-2 max-w-xs">
          We've received your information for <span className="text-foreground font-semibold">{deptName || 'your department'}</span>.
          The FireCommand AI team will review it and finish setting up your account shortly.
        </p>
        <p className="text-sm text-muted-foreground font-mono mt-3">
          You can start exploring the app now.
        </p>
      </div>
    </div>
  );
}

// ── Main Onboarding Component ─────────────────────────────────────────────────
export default function DepartmentOnboarding({ userEmail, userName, onComplete }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    dept_name:  '',
    prefix:     '',
    city:       '',
    state:      '',
    ff_count:   '',
    stations:   [],
    apparatus:  [],
    notes:      '',
  });

  const canAdvance = () => {
    if (step === 0) return formData.dept_name.trim() && formData.prefix.trim();
    if (step === 1) return formData.stations.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await base44.entities.DepartmentRequest.create({
        submitted_by_email: userEmail,
        submitted_by_name:  userName,
        dept_name:     formData.dept_name,
        unit_prefix:   formData.prefix,
        city:          formData.city,
        state:         formData.state,
        ff_count:      formData.ff_count ? parseInt(formData.ff_count) : null,
        stations_json:  JSON.stringify(formData.stations),
        apparatus_json: JSON.stringify(formData.apparatus),
        notes:         formData.notes,
        status:        'pending',
      });
      // Mark onboarding done in localStorage so it doesn't show again
      try { localStorage.setItem('onboarding_done', '1'); } catch {}
      setSubmitted(true);
      setStep(3);
    } catch (err) {
      setError('Could not save your submission. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <Flame className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-mono font-bold text-foreground tracking-wide">FIREGROUND COMMAND</h1>
          {step < 3 && (
            <p className="text-xs text-muted-foreground font-mono">Department Setup — Step {step + 1} of 3</p>
          )}
        </div>

        <StepIndicator current={step} total={4} labels={STEP_LABELS} />

        <div className="bg-card border border-border rounded-xl p-6">
          {step === 0 && <StepDept      data={formData} onChange={setFormData} />}
          {step === 1 && <StepStations  data={formData} onChange={setFormData} />}
          {step === 2 && <StepApparatus data={formData} onChange={setFormData} />}
          {step === 3 && <StepDone deptName={formData.dept_name} />}

          {error && (
            <p className="mt-3 text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          {/* Navigation */}
          {step < 3 && (
            <div className="flex justify-between mt-6">
              {step > 0 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 2 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canAdvance()}
                  className="flex items-center gap-1.5 px-5 h-10 rounded-md bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 h-10 rounded-md bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit →'}
                </button>
              )}
            </div>
          )}

          {step === 3 && (
            <button
              onClick={onComplete}
              className="w-full mt-6 h-10 rounded-md bg-primary text-primary-foreground text-sm font-mono font-bold hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard →
            </button>
          )}
        </div>

        {/* Skip link */}
        {step < 3 && (
          <p className="text-center mt-4 text-xs font-mono text-muted-foreground/50">
            <button
              onClick={() => {
                try { localStorage.setItem('onboarding_done', '1'); } catch {}
                onComplete();
              }}
              className="hover:text-muted-foreground transition-colors"
            >
              Skip for now →
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
