import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Search, Phone, Building2, ShieldAlert } from 'lucide-react';

const ROLE_LABELS = {
  chief:       'Chief',
  deputy_chief:'Deputy Chief',
  captain:     'Captain',
  lieutenant:  'Lieutenant',
  firefighter: 'Firefighter',
  ems:         'EMS',
  other:       'Other',
};

export default function AdminRegistrations() {
  const { userEmail } = useAuth();
  const [search, setSearch] = useState('');

  const { data: registrations = [], isLoading } = useQuery({
    queryKey: ['registrations'],
    queryFn: () => base44.entities.Registration.list('-created_date', 500),
    enabled: userEmail === 'mplandry77@gmail.com',
  });

  // Gate: only Michael can see this page
  if (userEmail !== 'mplandry77@gmail.com') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h1 className="text-xl font-mono font-bold text-foreground">Access Denied</h1>
        <p className="text-sm font-mono text-muted-foreground">Admin area — authorized personnel only.</p>
        <Link to="/" className="text-primary text-sm font-mono hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Link to="/">
          <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <Users className="w-5 h-5 text-primary" />
        <h1 className="font-mono font-bold text-lg tracking-wide text-foreground">Registrations</h1>
        <span className="ml-2 text-xs font-mono bg-primary/20 text-primary px-2 py-0.5 rounded-full">
          {registrations.length} total
        </span>
      </header>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* Search */}
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

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground font-mono text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground font-mono text-sm">
            {search ? 'No results match your search.' : 'No registrations yet.'}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead className="bg-secondary/60">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">Name</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">Email</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">Phone</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">Department</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">Role</th>
                  <th className="px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {r.first_name} {r.last_name}
                    </td>
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
                        <Building2 className="w-3 h-3 shrink-0" />
                        {r.fire_department || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ROLE_LABELS[r.role] || r.role || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {r.created_date
                        ? new Date(r.created_date).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
