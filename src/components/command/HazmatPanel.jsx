import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, LogIn, LogOut, AlertTriangle, FlaskConical, Flame } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const DECON_STATUS = [
  { value: 'not_set',    label: 'Not Set Up',   color: 'text-muted-foreground' },
  { value: 'setting_up', label: 'Setting Up',   color: 'text-amber-400' },
  { value: 'active',     label: 'Active',       color: 'text-emerald-400' },
  { value: 'complete',   label: 'Complete',     color: 'text-blue-400' },
];

const PPE_LEVELS = ['A', 'B', 'C', 'D'];

const DEFAULT_STATE = {
  productName: '',
  unNumber: '',
  ergGuide: '',
  notes: '',
  deconStatus: 'not_set',
  entries: [], // { id, name, unit, ppeLevel, timeIn, timeOut }
};

// ── Elapsed timer hook ─────────────────────────────────────────────────────────
function useElapsed(isoTimestamp) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!isoTimestamp) { setElapsed(''); return; }
    const tick = () => {
      const diff = Math.max(0, Date.now() - new Date(isoTimestamp).getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isoTimestamp]);
  return elapsed;
}

// ── Single entry row — timer needs its own component ─────────────────────────
function EntryRow({ entry, onLogOut }) {
  const elapsed = useElapsed(entry.timeOut ? null : entry.timeIn);
  const timeIn = new Date(entry.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const timeOut = entry.timeOut
    ? new Date(entry.timeOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  const isInside = !entry.timeOut;
  const ppeColors = { A: 'bg-red-500/20 text-red-400 border-red-500/40', B: 'bg-orange-500/20 text-orange-400 border-orange-500/40', C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', D: 'bg-green-500/20 text-green-400 border-green-500/40' };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${isInside ? 'bg-red-500/5 border-red-500/30' : 'bg-secondary/30 border-border/40 opacity-60'}`}>
      <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${ppeColors[entry.ppeLevel] || ppeColors['D']}`}>
        {entry.ppeLevel}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-foreground truncate">{entry.name}</div>
        <div className="text-muted-foreground text-[10px]">{entry.unit}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-muted-foreground text-[10px]">IN {timeIn}</div>
        {timeOut && <div className="text-[10px] text-blue-400">OUT {timeOut}</div>}
      </div>
      {isInside && (
        <>
          <span className="text-amber-400 font-bold tabular-nums shrink-0 min-w-[40px] text-right">{elapsed}</span>
          <button
            onClick={() => onLogOut(entry.id)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-[10px] font-bold border border-blue-500/30"
          >
            <LogOut className="w-3 h-3" />OUT
          </button>
        </>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function HazmatPanel({ isReadOnly }) {
  const { incidentId } = useParams();
  const storageKey = `hazmat_${incidentId}`;

  const [data, setData] = useState(() => {
    try { return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; }
    catch { return DEFAULT_STATE; }
  });

  const [addForm, setAddForm] = useState({ name: '', unit: '', ppeLevel: 'B' });
  const [showAddForm, setShowAddForm] = useState(false);

  const persist = useCallback((next) => {
    setData(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  }, [storageKey]);

  const updateField = (field, value) => persist({ ...data, [field]: value });

  const logEntry = () => {
    if (!addForm.name.trim()) return;
    const entry = {
      id: `e_${Date.now()}`,
      name: addForm.name.trim(),
      unit: addForm.unit.trim(),
      ppeLevel: addForm.ppeLevel,
      timeIn: new Date().toISOString(),
      timeOut: null,
    };
    persist({ ...data, entries: [entry, ...data.entries] });
    setAddForm({ name: '', unit: '', ppeLevel: 'B' });
    setShowAddForm(false);
  };

  const logOut = (id) => {
    persist({
      ...data,
      entries: data.entries.map(e => e.id === id ? { ...e, timeOut: new Date().toISOString() } : e),
    });
  };

  const insideCount = data.entries.filter(e => !e.timeOut).length;
  const deconCfg = DECON_STATUS.find(d => d.value === data.deconStatus) || DECON_STATUS[0];

  return (
    <div className="space-y-4">

      {/* ── Product / Incident Info ── */}
      <div className="bg-card border border-border/60 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">Hazmat Product Info</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide block mb-1">Chemical / Product</label>
            <Input
              value={data.productName}
              onChange={e => updateField('productName', e.target.value)}
              placeholder="e.g. Ammonia"
              className="h-7 text-xs font-mono bg-secondary/40"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide block mb-1">UN Number</label>
            <Input
              value={data.unNumber}
              onChange={e => updateField('unNumber', e.target.value)}
              placeholder="e.g. UN1005"
              className="h-7 text-xs font-mono bg-secondary/40"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide block mb-1">ERG Guide #</label>
            <Input
              value={data.ergGuide}
              onChange={e => updateField('ergGuide', e.target.value)}
              placeholder="e.g. Guide 125"
              className="h-7 text-xs font-mono bg-secondary/40"
              disabled={isReadOnly}
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide block mb-1">Decon Status</label>
            <Select value={data.deconStatus} onValueChange={v => updateField('deconStatus', v)} disabled={isReadOnly}>
              <SelectTrigger className="h-7 text-xs font-mono bg-secondary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECON_STATUS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide block mb-1">Notes / Action Plan</label>
          <textarea
            value={data.notes}
            onChange={e => updateField('notes', e.target.value)}
            placeholder="ERG actions, isolation distances, product behavior..."
            className="w-full h-16 text-xs font-mono bg-secondary/40 border border-border/60 rounded-md px-2 py-1.5 resize-none text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            disabled={isReadOnly}
          />
        </div>

        {/* Decon status badge */}
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">Decon:</span>
          <span className={`text-[10px] font-mono font-bold ${deconCfg.color}`}>{deconCfg.label}</span>
        </div>
      </div>

      {/* ── Hot Zone Entry / Exit Log ── */}
      <div className="bg-card border border-border/60 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground uppercase">Entry / Exit Log</span>
            {insideCount > 0 && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                {insideCount} INSIDE
              </span>
            )}
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setShowAddForm(f => !f)}
              className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors border border-primary/30"
            >
              <LogIn className="w-3 h-3" /> LOG ENTRY
            </button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && !isReadOnly && (
          <div className="bg-secondary/40 rounded-lg p-3 space-y-2 border border-border/60">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground block mb-1">Name</label>
                <Input
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Firefighter name"
                  className="h-7 text-xs font-mono bg-background/60"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && logEntry()}
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground block mb-1">Unit</label>
                <Input
                  value={addForm.unit}
                  onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="Engine 1"
                  className="h-7 text-xs font-mono bg-background/60"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono text-muted-foreground">PPE Level:</label>
              {PPE_LEVELS.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setAddForm(f => ({ ...f, ppeLevel: lvl }))}
                  className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded border transition-all ${
                    addForm.ppeLevel === lvl
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'text-muted-foreground border-border/40 hover:border-border'
                  }`}
                >
                  {lvl}
                </button>
              ))}
              <Button size="sm" onClick={logEntry} className="ml-auto h-7 text-xs font-mono px-3">
                Log In
              </Button>
            </div>
          </div>
        )}

        {/* Entry list */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {data.entries.length === 0 && (
            <div className="text-center py-4 text-xs font-mono text-muted-foreground/40">
              No entries logged
            </div>
          )}
          {data.entries.map(entry => (
            <EntryRow key={entry.id} entry={entry} onLogOut={logOut} />
          ))}
        </div>

        {/* Summary */}
        {data.entries.length > 0 && (
          <div className="flex gap-3 pt-2 border-t border-border/40 text-[10px] font-mono">
            <span className="text-red-400 font-bold">{insideCount} inside</span>
            <span className="text-muted-foreground">{data.entries.filter(e => e.timeOut).length} out</span>
            <span className="text-muted-foreground ml-auto">{data.entries.length} total entries</span>
          </div>
        )}
      </div>

      {/* ── 20-min warning for anyone inside ── */}
      {data.entries.filter(e => !e.timeOut).some(e => (Date.now() - new Date(e.timeIn).getTime()) >= 20 * 60 * 1000) && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 rounded-xl px-3 py-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-amber-300">Personnel in hot zone &gt; 20 min — consider rotation</span>
        </div>
      )}
    </div>
  );
}
