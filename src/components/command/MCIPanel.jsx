import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Minus, UserPlus, Hospital, CheckCircle, Circle } from 'lucide-react';

// ── Default hospitals (IC can add more) ──────────────────────────────────────
const DEFAULT_HOSPITALS = [
  'Newton-Wellesley',
  'Waltham Hospital',
  'Beth Israel Deaconess',
  'Mass General',
  'Other',
];

// ── Triage tag config ────────────────────────────────────────────────────────
const TAGS = [
  { id: 'immediate', label: 'IMMEDIATE', sub: 'Life Threatening', color: 'bg-red-600',    border: 'border-red-500',  text: 'text-red-400',    bg: 'bg-red-500/10'    },
  { id: 'delayed',   label: 'DELAYED',   sub: 'Serious, Can Wait',color: 'bg-yellow-500', border: 'border-yellow-500',text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'minor',     label: 'MINOR',     sub: 'Walking Wounded',  color: 'bg-green-600',  border: 'border-green-500', text: 'text-green-400',  bg: 'bg-green-500/10'  },
  { id: 'expectant', label: 'EXPECTANT', sub: 'Unsalvageable',    color: 'bg-zinc-700',   border: 'border-zinc-600',  text: 'text-zinc-400',   bg: 'bg-zinc-500/10'   },
];

const DEFAULT_STATE = {
  triage: { immediate: 0, delayed: 0, minor: 0, expectant: 0 },
  patients: [],       // { id, number, tag, unit, hospital, transported, timeLogged }
  hospitals: {},      // { hospitalName: count }
  customHospital: '',
};

export default function MCIPanel({ units = [], isReadOnly }) {
  const { incidentId } = useParams();
  const storageKey = `mci_${incidentId}`;

  const [data, setData] = useState(() => {
    try { return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; }
    catch { return DEFAULT_STATE; }
  });

  const [addForm, setAddForm] = useState({ tag: 'immediate', unit: '', hospital: DEFAULT_HOSPITALS[0] });
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [activeTab, setActiveTab] = useState('triage'); // 'triage' | 'patients' | 'hospitals'

  const persist = useCallback((next) => {
    setData(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }, [storageKey]);

  // ── Triage count adjustments ──
  const adjust = (tag, delta) => {
    const next = Math.max(0, (data.triage[tag] || 0) + delta);
    persist({ ...data, triage: { ...data.triage, [tag]: next } });
  };

  const totalPatients = Object.values(data.triage).reduce((s, n) => s + n, 0);

  // ── Add patient to log ──
  const addPatient = () => {
    const nextNumber = (data.patients.reduce((m, p) => Math.max(m, p.number), 0)) + 1;
    const patient = {
      id: `p_${Date.now()}`,
      number: nextNumber,
      tag: addForm.tag,
      unit: addForm.unit.trim(),
      hospital: addForm.hospital,
      transported: false,
      timeLogged: new Date().toISOString(),
    };
    // Bump triage count for this tag
    const newTriage = { ...data.triage, [addForm.tag]: (data.triage[addForm.tag] || 0) + 1 };
    // Tally hospital
    const newHospitals = { ...data.hospitals, [addForm.hospital]: (data.hospitals[addForm.hospital] || 0) + 1 };
    persist({ ...data, patients: [patient, ...data.patients], triage: newTriage, hospitals: newHospitals });
    setAddForm(f => ({ ...f, unit: '' }));
    setShowAddPatient(false);
  };

  const toggleTransported = (id) => {
    persist({
      ...data,
      patients: data.patients.map(p => p.id === id ? { ...p, transported: !p.transported } : p),
    });
  };

  const tagCfg = (id) => TAGS.find(t => t.id === id) || TAGS[0];
  const transportedCount = data.patients.filter(p => p.transported).length;

  // Hospital totals from patient log
  const hospitalTotals = data.patients.reduce((acc, p) => {
    if (p.hospital) acc[p.hospital] = (acc[p.hospital] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-3">

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-4 gap-1.5">
        {TAGS.map(tag => (
          <div key={tag.id} className={`rounded-lg border ${tag.border} ${tag.bg} px-2 py-2 text-center`}>
            <div className={`text-xl font-mono font-black ${tag.text}`}>{data.triage[tag.id] || 0}</div>
            <div className={`text-[9px] font-mono font-bold tracking-wider ${tag.text} opacity-80`}>{tag.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-[10px] font-mono text-muted-foreground px-1">
        <span className="font-bold text-foreground">{totalPatients}</span> total
        <span className="mx-1">·</span>
        <span className="text-emerald-400 font-bold">{transportedCount}</span> transported
        <span className="mx-1">·</span>
        <span className="text-amber-400 font-bold">{data.patients.filter(p => !p.transported).length}</span> awaiting
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex border-b border-border/50">
        {[
          { id: 'triage',    label: 'Triage' },
          { id: 'patients',  label: `Patients (${data.patients.length})` },
          { id: 'hospitals', label: 'Hospitals' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors
              ${activeTab === t.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TRIAGE tab ── */}
      {activeTab === 'triage' && (
        <div className="space-y-2">
          {TAGS.map(tag => (
            <div key={tag.id} className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${tag.border} ${tag.bg}`}>
              {/* Color swatch */}
              <div className={`w-3 h-10 rounded-full ${tag.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-mono font-black ${tag.text}`}>{tag.label}</div>
                <div className="text-[10px] font-mono text-muted-foreground">{tag.sub}</div>
              </div>
              {!isReadOnly ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => adjust(tag.id, -1)}
                    className="w-7 h-7 rounded-full border border-border/60 bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className={`text-2xl font-mono font-black min-w-[2rem] text-center ${tag.text}`}>
                    {data.triage[tag.id] || 0}
                  </span>
                  <button
                    onClick={() => adjust(tag.id, 1)}
                    className="w-7 h-7 rounded-full border border-border/60 bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className={`text-3xl font-mono font-black ${tag.text}`}>{data.triage[tag.id] || 0}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── PATIENTS tab ── */}
      {activeTab === 'patients' && (
        <div className="space-y-2">
          {!isReadOnly && (
            <button
              onClick={() => setShowAddPatient(f => !f)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border/60 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Patient
            </button>
          )}

          {showAddPatient && !isReadOnly && (
            <div className="bg-secondary/40 rounded-lg p-3 space-y-2 border border-border/60">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">Triage Tag</label>
                  <Select value={addForm.tag} onValueChange={v => setAddForm(f => ({ ...f, tag: v }))}>
                    <SelectTrigger className="h-7 text-xs font-mono bg-background/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAGS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">Transporting Unit</label>
                  <Input
                    value={addForm.unit}
                    onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="Medic 1"
                    className="h-7 text-xs font-mono bg-background/60"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground block mb-1">Destination Hospital</label>
                <Select value={addForm.hospital} onValueChange={v => setAddForm(f => ({ ...f, hospital: v }))}>
                  <SelectTrigger className="h-7 text-xs font-mono bg-background/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFAULT_HOSPITALS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={addPatient} className="w-full h-7 text-xs font-mono">
                Add Patient
              </Button>
            </div>
          )}

          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {data.patients.length === 0 && (
              <div className="text-center py-6 text-xs font-mono text-muted-foreground/40">
                No patients logged yet
              </div>
            )}
            {data.patients.map(p => {
              const tc = tagCfg(p.tag);
              const timeStr = new Date(p.timeLogged).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${p.transported ? 'opacity-50 border-border/30 bg-secondary/20' : `${tc.border} ${tc.bg}`}`}
                >
                  <span className={`font-black text-sm min-w-[1.5rem] ${tc.text}`}>#{p.number}</span>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${tc.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-bold truncate">{p.unit || '—'}</div>
                    <div className="text-muted-foreground text-[10px]">{p.hospital} · {timeStr}</div>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => toggleTransported(p.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title={p.transported ? 'Mark awaiting' : 'Mark transported'}
                    >
                      {p.transported
                        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                        : <Circle className="w-4 h-4" />
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HOSPITALS tab ── */}
      {activeTab === 'hospitals' && (
        <div className="space-y-2">
          {Object.keys(hospitalTotals).length === 0 && (
            <div className="text-center py-6 text-xs font-mono text-muted-foreground/40">
              No patients transported yet
            </div>
          )}
          {DEFAULT_HOSPITALS.filter(h => hospitalTotals[h] > 0).map(h => (
            <div key={h} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-secondary/30">
              <Hospital className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="flex-1 text-xs font-mono font-bold text-foreground">{h}</span>
              <span className="text-xl font-mono font-black text-blue-400">{hospitalTotals[h]}</span>
              <span className="text-[10px] font-mono text-muted-foreground">pts</span>
            </div>
          ))}
          {/* Any hospitals from patient log not in defaults */}
          {Object.keys(hospitalTotals).filter(h => !DEFAULT_HOSPITALS.includes(h)).map(h => (
            <div key={h} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-secondary/30">
              <Hospital className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="flex-1 text-xs font-mono font-bold text-foreground">{h}</span>
              <span className="text-xl font-mono font-black text-blue-400">{hospitalTotals[h]}</span>
              <span className="text-[10px] font-mono text-muted-foreground">pts</span>
            </div>
          ))}
          <div className="pt-2 border-t border-border/40 flex justify-between text-xs font-mono text-muted-foreground px-1">
            <span>Total transported</span>
            <span className="font-bold text-foreground">{transportedCount}</span>
          </div>
        </div>
      )}
    </div>
  );
}
