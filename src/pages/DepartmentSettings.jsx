import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Building2, CheckCircle, Plus, Trash2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { ADMIN_EMAIL, SUPPORT_EMAIL, APP_NAME } from '@/lib/appConfig';

// ── Defaults (Waltham) ─────────────────────────────────────────────────────────
export const DEFAULT_STATIONS = [
  { label: 'MOODY ST.' },
  { label: 'CENTRAL ST.' },
  { label: 'OTHER' },
  { label: 'WATER/SPECIAL' },
];

export const DEFAULT_APPARATUS = [
  { name: 'C2',           type: 'deputy',  personnel: 2, station: 'MOODY ST.',     special: false },
  { name: 'Engine 1',     type: 'engine',  personnel: 3, station: 'MOODY ST.',     special: false },
  { name: 'Squad 5',      type: 'squad',   personnel: 3, station: 'MOODY ST.',     special: false },
  { name: 'Ladder 2',     type: 'truck',   personnel: 3, station: 'MOODY ST.',     special: false },
  { name: 'Engine 2',     type: 'engine',  personnel: 3, station: 'CENTRAL ST.',   special: false },
  { name: 'Rescue 1',     type: 'rescue',  personnel: 4, station: 'CENTRAL ST.',   special: false },
  { name: 'Tower 1',      type: 'truck',   personnel: 3, station: 'CENTRAL ST.',   special: false },
  { name: 'Engine 3',     type: 'engine',  personnel: 3, station: 'OTHER',         special: false },
  { name: 'Engine 4',     type: 'engine',  personnel: 3, station: 'OTHER',         special: false },
  { name: 'Engine 7',     type: 'engine',  personnel: 3, station: 'OTHER',         special: false },
  { name: 'Engine 8',     type: 'engine',  personnel: 3, station: 'OTHER',         special: false },
  { name: 'Ladder 3',     type: 'truck',   personnel: 3, station: 'OTHER',         special: false },
];

export const DEFAULT_PREFIX = 'WAL';

// ── Helpers ───────────────────────────────────────────────────────────────────
const UNIT_TYPES = [
  { value: 'engine',  label: 'Engine'  },
  { value: 'truck',   label: 'Truck/Ladder' },
  { value: 'rescue',  label: 'Rescue'  },
  { value: 'squad',   label: 'Squad'   },
  { value: 'deputy',  label: 'Deputy/BC' },
  { value: 'medic',   label: 'Medic'   },
  { value: 'tanker',  label: 'Tanker'  },
  { value: 'brush',   label: 'Brush'   },
  { value: 'hazmat',  label: 'HazMat'  },
  { value: 'other',   label: 'Other'   },
];

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str) || fallback; } catch { return fallback; }
}

// ── Apparatus Row ─────────────────────────────────────────────────────────────
function ApparatusRow({ unit, stations, prefix, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
      <div className="flex flex-col gap-0.5">
        <button onClick={onMoveUp}  disabled={isFirst} className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"><ChevronUp className="w-3 h-3" /></button>
        <button onClick={onMoveDown} disabled={isLast}  className="text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"><ChevronDown className="w-3 h-3" /></button>
      </div>

      {/* Prefix badge */}
      <span className="text-xs font-mono text-muted-foreground shrink-0 w-8 text-right">{prefix}</span>

      {/* Unit name */}
      <Input
        value={unit.name}
        onChange={e => onChange({ ...unit, name: e.target.value })}
        placeholder="Engine 1"
        className="bg-secondary font-mono text-xs h-8 w-28"
      />

      {/* Type */}
      <select
        value={unit.type}
        onChange={e => onChange({ ...unit, type: e.target.value })}
        className="h-8 px-2 rounded-md border border-border bg-secondary text-xs font-mono text-foreground focus:outline-none w-28"
      >
        {UNIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {/* Personnel */}
      <Input
        type="number"
        value={unit.personnel}
        onChange={e => onChange({ ...unit, personnel: parseInt(e.target.value) || 1 })}
        className="bg-secondary font-mono text-xs h-8 w-16 text-center"
        min={1} max={20}
      />

      {/* Station */}
      <select
        value={unit.station}
        onChange={e => onChange({ ...unit, station: e.target.value })}
        className="h-8 px-2 rounded-md border border-border bg-secondary text-xs font-mono text-foreground focus:outline-none flex-1 min-w-0"
      >
        {stations.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
      </select>

      {/* Special toggle */}
      <label className="flex items-center gap-1 text-xs font-mono text-muted-foreground cursor-pointer shrink-0">
        <input
          type="checkbox"
          checked={!!unit.special}
          onChange={e => onChange({ ...unit, special: e.target.checked })}
          className="w-3 h-3 accent-primary"
        />
        Low priority
      </label>

      <button onClick={onDelete} className="text-red-400/60 hover:text-red-400 shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentSettings() {
  const { userEmail } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  // Only the platform admin can configure departments
  if (userEmail !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <ShieldAlert className="w-12 h-12 text-amber-400" />
        <h1 className="text-xl font-mono font-bold text-foreground">Admin Access Required</h1>
        <p className="text-sm font-mono text-muted-foreground text-center max-w-xs">
          Department configuration is managed by the FireCommand AI administrator.
          Contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a> to request changes.
        </p>
        <Link to="/">
          <Button variant="outline" size="sm">← Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const [form, setForm] = useState({
    name: '',
    jurisdiction: '',
    chief_name: '',
    phone: '',
    address: '',
    unit_prefix: DEFAULT_PREFIX,
  });
  const [stations, setStations] = useState(DEFAULT_STATIONS);
  const [apparatus, setApparatus] = useState(DEFAULT_APPARATUS);
  const [newStation, setNewStation] = useState('');

  const { data: departments = [] } = useQuery({
    queryKey: ['department'],
    queryFn: () => base44.entities.Department.list(),
  });

  const dept = departments[0] || null;

  useEffect(() => {
    if (dept) {
      setForm({
        name:        dept.name        || '',
        jurisdiction:dept.jurisdiction|| '',
        chief_name:  dept.chief_name  || '',
        phone:       dept.phone       || '',
        address:     dept.address     || '',
        unit_prefix: dept.unit_prefix || DEFAULT_PREFIX,
      });
      if (dept.stations_json)  setStations(safeParseJSON(dept.stations_json,  DEFAULT_STATIONS));
      if (dept.apparatus_json) setApparatus(safeParseJSON(dept.apparatus_json, DEFAULT_APPARATUS));
    }
  }, [dept]);

  const saveDept = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        stations_json:  JSON.stringify(stations),
        apparatus_json: JSON.stringify(apparatus),
      };
      if (dept) return base44.entities.Department.update(dept.id, payload);
      return base44.entities.Department.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  // ── Station helpers ──
  const addStation = () => {
    const label = newStation.trim().toUpperCase();
    if (!label || stations.find(s => s.label === label)) return;
    setStations([...stations, { label }]);
    setNewStation('');
  };

  const removeStation = (label) => {
    setStations(stations.filter(s => s.label !== label));
    // Re-assign orphaned units to first remaining station
    const first = stations.find(s => s.label !== label)?.label || '';
    setApparatus(apparatus.map(u => u.station === label ? { ...u, station: first } : u));
  };

  // ── Apparatus helpers ──
  const addUnit = () => {
    setApparatus([...apparatus, {
      name: '', type: 'engine', personnel: 3,
      station: stations[0]?.label || '', special: false,
    }]);
  };

  const updateUnit = (idx, updated) => {
    setApparatus(apparatus.map((u, i) => i === idx ? updated : u));
  };

  const deleteUnit = (idx) => {
    setApparatus(apparatus.filter((_, i) => i !== idx));
  };

  const moveUnit = (idx, dir) => {
    const arr = [...apparatus];
    const swap = idx + dir;
    if (swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    setApparatus(arr);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="font-bold font-mono tracking-wide">DEPARTMENT SETTINGS</h1>
        </div>
        <Button
          onClick={() => saveDept.mutate()}
          disabled={!form.name.trim() || saveDept.isPending}
          className="ml-auto gap-2"
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Settings</>
          )}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* ── Basic Info ── */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="font-mono font-semibold text-sm uppercase tracking-wider text-foreground">
            Department Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs font-mono">Department Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Waltham Fire Department" className="bg-secondary font-mono mt-1" />
            </div>
            <div>
              <Label className="text-xs font-mono">Jurisdiction</Label>
              <Input value={form.jurisdiction} onChange={e => setForm({ ...form, jurisdiction: e.target.value })}
                placeholder="City of Waltham" className="bg-secondary font-mono mt-1" />
            </div>
            <div>
              <Label className="text-xs font-mono">Fire Chief</Label>
              <Input value={form.chief_name} onChange={e => setForm({ ...form, chief_name: e.target.value })}
                placeholder="Chief John Smith" className="bg-secondary font-mono mt-1" />
            </div>
            <div>
              <Label className="text-xs font-mono">Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="(617) 555-0100" className="bg-secondary font-mono mt-1" />
            </div>
            <div>
              <Label className="text-xs font-mono">HQ Address</Label>
              <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="885 Main St" className="bg-secondary font-mono mt-1" />
            </div>
          </div>
        </section>

        {/* ── Unit Prefix ── */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-3">
          <div>
            <h2 className="font-mono font-semibold text-sm uppercase tracking-wider text-foreground">
              Unit Prefix
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Short abbreviation shown on all unit names and the site map (e.g. WAL, CAM, BOS).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              value={form.unit_prefix}
              onChange={e => setForm({ ...form, unit_prefix: e.target.value.toUpperCase().slice(0, 5) })}
              placeholder="WAL"
              className="bg-secondary font-mono w-28 uppercase"
              maxLength={5}
            />
            <span className="text-sm font-mono text-muted-foreground">
              → units will appear as <span className="text-foreground font-bold">{form.unit_prefix || 'WAL'} Engine 1</span>, <span className="text-foreground font-bold">{form.unit_prefix || 'WAL'} C2</span>, etc.
            </span>
          </div>
        </section>

        {/* ── Stations ── */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="font-mono font-semibold text-sm uppercase tracking-wider text-foreground">
              Stations
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Station names used to group apparatus on the tactical board and in new incident setup.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {stations.map(s => (
              <div key={s.label} className="flex items-center gap-1.5 bg-secondary border border-border rounded-md px-3 py-1.5 text-xs font-mono">
                <span className="text-foreground">{s.label}</span>
                {stations.length > 1 && (
                  <button onClick={() => removeStation(s.label)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newStation}
              onChange={e => setNewStation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStation()}
              placeholder="Add station name (e.g. NORTH ST.)"
              className="bg-secondary font-mono text-sm"
            />
            <Button variant="outline" onClick={addStation} disabled={!newStation.trim()} className="shrink-0 gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </section>

        {/* ── Apparatus ── */}
        <section className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-mono font-semibold text-sm uppercase tracking-wider text-foreground">
                Apparatus Roster
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                All units available when starting a new incident. Order here sets the order in the unit picker.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addUnit} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Add Unit
            </Button>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-2 px-0 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            <div className="w-5" />
            <div className="w-8 text-right">Pfx</div>
            <div className="w-28">Unit Name</div>
            <div className="w-28">Type</div>
            <div className="w-16 text-center">Crew</div>
            <div className="flex-1">Station</div>
            <div className="w-20">Priority</div>
            <div className="w-4" />
          </div>

          <div className="divide-y divide-border/20">
            {apparatus.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground py-4 text-center">
                No apparatus added yet. Click "Add Unit" to get started.
              </p>
            ) : (
              apparatus.map((unit, idx) => (
                <ApparatusRow
                  key={idx}
                  unit={unit}
                  stations={stations}
                  prefix={form.unit_prefix || 'WAL'}
                  onChange={updated => updateUnit(idx, updated)}
                  onDelete={() => deleteUnit(idx)}
                  onMoveUp={() => moveUnit(idx, -1)}
                  onMoveDown={() => moveUnit(idx, 1)}
                  isFirst={idx === 0}
                  isLast={idx === apparatus.length - 1}
                />
              ))
            )}
          </div>

          <p className="text-[10px] font-mono text-muted-foreground">
            <span className="font-semibold">Low priority</span> units (marked special) are sorted to the bottom of the Unassigned column.
          </p>
        </section>

      </div>
    </div>
  );
}
