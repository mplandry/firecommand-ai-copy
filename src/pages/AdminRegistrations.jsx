import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Search, Phone, Building2, ShieldAlert, ClipboardList, Truck, CheckCircle, Clock } from 'lucide-react';
import { ADMIN_EMAIL } from '@/lib/appConfig';

const ROLE_LABELS = {
  chief:        'Chief',
  deputy_chief: 'Deputy Chief',
  captain:      'Captain',
  lieutenant:   'Lieutenant',
  firefighter:  'Firefighter',
  ems:          'EMS',
  other:        'Other',
};

function safeParseJSON(str, fallback = []) {
  try { return JSON.parse(str) || fallback; } catch { return fallback; }
}

// ── Registrations Tab ─────────────────────────────────────────────────────────
function RegistrationsTab() {
  const [search, setSearch] = useState('');

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => base44.entities.Registration.list('-created_date', 500),
  });

  const filtered = registrations.filter(r => {
    const q = search.toLowerCase();
    return (
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.fire_department || '').toLowerCase().includes(q) ||
      (r.phone || '').includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, department, phone…"
          className="w-full h-10 pl-9 pr-4 rounded-md border border-border bg-secondary text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground font-mono text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground font-mono text-sm">
          {search ? 'No results.' : 'No registrations yet.'}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm font-mono">
            <thead className="bg-secondary/60">
              <tr className="text-left">
                <th className="px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Signed Up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{r.first_name} {r.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3">
                    {r.phone ? (
                      <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                        <Phone className="w-3 h-3" />{r.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-cyan-400">
                      <Building2 className="w-3 h-3 shrink-0" />{r.fire_department || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ROLE_LABELS[r.role] || r.role || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {r.created_date
                      ? new Date(r.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Dept Requests Tab ─────────────────────────────────────────────────────────
function DeptRequestsTab() {
  const [expanded, setExpanded] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['dept-requests'],
    queryFn: () => base44.entities.DepartmentRequest.list('-created_date', 200),
  });

  if (isLoading) return <div className="text-center py-16 text-muted-foreground font-mono text-sm">Loading…</div>;
  if (requests.length === 0) return <div className="text-center py-16 text-muted-foreground font-mono text-sm">No department requests yet.</div>;

  return (
    <div className="space-y-3">
      {requests.map(req => {
        const stations  = safeParseJSON(req.stations_json);
        const apparatus = safeParseJSON(req.apparatus_json);
        const isOpen = expanded === req.id;

        return (
          <div key={req.id} className="rounded-lg border border-border overflow-hidden">
            {/* Summary row */}
            <button
              className="w-full flex items-center gap-4 px-4 py-3 bg-card hover:bg-secondary/40 transition-colors text-left"
              onClick={() => setExpanded(isOpen ? null : req.id)}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${req.status === 'pending' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="font-mono font-bold text-foreground text-sm">{req.dept_name || '(unnamed)'}</div>
                <div className="text-xs font-mono text-muted-foreground">
                  {req.unit_prefix && <span className="text-primary mr-2">{req.unit_prefix}</span>}
                  {req.city}{req.state ? `, ${req.state}` : ''} · {req.submitted_by_name || req.submitted_by_email}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3" />{apparatus.length} units
                </span>
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{stations.length} stations
                </span>
                {req.status === 'pending'
                  ? <span className="text-xs font-mono text-amber-400 flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>
                  : <span className="text-xs font-mono text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Done</span>
                }
                <span className="text-muted-foreground text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-border bg-secondary/20 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs font-mono">
                  <div><span className="text-muted-foreground">Submitted by: </span><span className="text-foreground">{req.submitted_by_name} ({req.submitted_by_email})</span></div>
                  <div><span className="text-muted-foreground">Dept: </span><span className="text-foreground">{req.dept_name}</span></div>
                  <div><span className="text-muted-foreground">Prefix: </span><span className="text-primary font-bold">{req.unit_prefix}</span></div>
                  <div><span className="text-muted-foreground">Location: </span><span className="text-foreground">{req.city}{req.state ? `, ${req.state}` : ''}</span></div>
                  {req.ff_count && <div><span className="text-muted-foreground">Firefighters: </span><span className="text-foreground">~{req.ff_count}</span></div>}
                  <div><span className="text-muted-foreground">Submitted: </span><span className="text-foreground">
                    {req.created_date ? new Date(req.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </span></div>
                </div>

                {stations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Stations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {stations.map((s, i) => (
                        <span key={i} className="text-xs font-mono bg-secondary border border-border rounded px-2 py-0.5 text-foreground">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {apparatus.length > 0 && (
                  <div>
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Apparatus ({apparatus.length} units)</p>
                    <div className="rounded-md border border-border overflow-hidden">
                      <table className="w-full text-xs font-mono">
                        <thead className="bg-secondary">
                          <tr className="text-left">
                            <th className="px-3 py-2 text-muted-foreground">Unit</th>
                            <th className="px-3 py-2 text-muted-foreground">Type</th>
                            <th className="px-3 py-2 text-muted-foreground text-center">Crew</th>
                            <th className="px-3 py-2 text-muted-foreground">Station</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {apparatus.map((u, i) => (
                            <tr key={i} className="hover:bg-secondary/40">
                              <td className="px-3 py-1.5 text-foreground font-semibold">
                                <span className="text-primary">{req.unit_prefix} </span>{u.name}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground capitalize">{u.type}</td>
                              <td className="px-3 py-1.5 text-center text-muted-foreground">{u.personnel}</td>
                              <td className="px-3 py-1.5 text-cyan-400">{u.station || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {req.notes && (
                  <div>
                    <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-xs font-mono text-foreground bg-secondary/60 rounded p-2">{req.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminRegistrations() {
  const { userEmail } = useAuth();
  const [activeTab, setActiveTab] = useState('registrations');

  const { data: registrations = [] } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => base44.entities.Registration.list('-created_date', 500),
    enabled: userEmail === ADMIN_EMAIL,
  });
  const { data: deptRequests = [] } = useQuery({
    queryKey: ['dept-requests'],
    queryFn: () => base44.entities.DepartmentRequest.list('-created_date', 200),
    enabled: userEmail === ADMIN_EMAIL,
  });
  const pendingCount = deptRequests.filter(r => r.status === 'pending').length;

  if (userEmail !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h1 className="text-xl font-mono font-bold text-foreground">Access Denied</h1>
        <p className="text-sm font-mono text-muted-foreground">Admin area — authorized personnel only.</p>
        <Link to="/" className="text-primary text-sm font-mono hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/90 backdrop-blur border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link to="/">
          <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <ShieldAlert className="w-5 h-5 text-primary" />
        <h1 className="font-mono font-bold text-lg tracking-wide text-foreground">Admin</h1>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/40 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('registrations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-colors ${
              activeTab === 'registrations' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            Registrations
            <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{registrations.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('dept-requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-colors ${
              activeTab === 'dept-requests' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Dept Requests
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 rounded-full animate-pulse">{pendingCount}</span>
            )}
          </button>
        </div>

        {activeTab === 'registrations' && <RegistrationsTab />}
        {activeTab === 'dept-requests'  && <DeptRequestsTab />}
      </div>
    </div>
  );
}
