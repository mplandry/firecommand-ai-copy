import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Pencil, Phone, Mail, Home, FileText, Users, Eye, Heart, Building2, Camera, X, Ambulance, Car, Radio, Clock } from 'lucide-react';
import CameraCapture from '@/components/shared/CameraCapture';

const CATEGORIES = [
  {
    key: 'property',
    label: 'Property',
    icon: Home,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    roles: ['Homeowner', 'Business Owner', 'Property Manager', 'Landlord', 'Tenant'],
    fields: ['name', 'role', 'phone', 'email', 'notes'],
    emptyText: 'No property contacts yet.',
  },
  {
    key: 'insurance',
    label: 'Insurance',
    icon: FileText,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    roles: ['Insurance Company', 'Claims Agent', 'Adjuster'],
    fields: ['agency', 'role', 'phone', 'email', 'policy_number', 'notes'],
    emptyText: 'No insurance info logged.',
  },
  {
    key: 'injuries',
    label: 'Injuries',
    icon: Ambulance,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    roles: ['Civilian', 'Firefighter', 'EMS Personnel', 'Police Officer', 'Occupant', 'Other'],
    fields: ['name', 'role', 'dob', 'injury_type', 'transported_to', 'phone', 'notes'],
    emptyText: 'No injuries reported.',
  },
  {
    key: 'vehicle',
    label: 'Vehicles',
    icon: Car,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    roles: ['Driver', 'Owner', 'Passenger', 'Registered Owner'],
    fields: ['name', 'role', 'phone', 'dob', 'make', 'model', 'year', 'vin', 'plate', 'plate_state', 'insurance_company', 'policy_number', 'notes'],
    emptyText: 'No vehicles logged.',
  },
  {
    key: 'family',
    label: 'Family / Occupants',
    icon: Users,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    roles: ['Spouse', 'Child', 'Parent', 'Sibling', 'Occupant', 'Pet'],
    fields: ['name', 'role', 'dob', 'phone', 'accounted_for', 'total_occupants', 'notes'],
    emptyText: 'No family or occupant info logged.',
  },
  {
    key: 'witness',
    label: 'Witnesses',
    icon: Eye,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    roles: ['Witness', 'Neighbor', 'Bystander', 'Caller'],
    fields: ['name', 'role', 'phone', 'notes'],
    emptyText: 'No witnesses logged.',
  },
  {
    key: 'mutual_aid',
    label: 'Mutual Aid',
    icon: Radio,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    roles: ['Engine Company', 'Ladder Company', 'Rescue', 'Battalion Chief', 'Hazmat', 'Technical Rescue', 'Liaison Officer', 'Other'],
    fields: ['agency', 'name', 'role', 'unit_sent', 'phone', 'notes'],
    emptyText: 'No mutual aid logged.',
  },
  {
    key: 'relief',
    label: 'Relief / Services',
    icon: Heart,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    roles: ['Red Cross', 'Salvation Army', 'Utility — Gas', 'Utility — Electric', 'Utility — Water', 'Animal Services', 'Other Agency'],
    fields: ['agency', 'role', 'phone', 'notes'],
    emptyText: 'No relief services logged.',
  },
];

const INJURY_TYPES = [
  'Burns', 'Smoke Inhalation', 'Trauma / Laceration', 'Fracture',
  'Cardiac', 'Respiratory', 'Eye Injury', 'Head Injury', 'Unknown', 'Other',
];

function initForm(categoryKey) {
  return {
    name: '', agency: '', role: '', phone: '', email: '',
    policy_number: '', notes: '', category: categoryKey,
    // Injury fields
    dob: '', injury_type: '', transported_to: '', refused_transport: false,
    // Vehicle fields
    make: '', model: '', year: '', vin: '', plate: '', plate_state: '', insurance_company: '',
    // Family / Occupants
    accounted_for: '', total_occupants: '',
    // Mutual Aid
    unit_sent: '',
  };
}

// ── ContactForm ───────────────────────────────────────────────────────────────
function ContactForm({ categoryKey, initial, onSave, onCancel }) {
  const cat = CATEGORIES.find(c => c.key === categoryKey);
  const [form, setForm] = useState(initial || initForm(categoryKey));
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const hasField = (f) => cat.fields.includes(f);
  const primaryName = hasField('name') ? form.name : form.agency;
  const canSave = primaryName.trim().length > 0;

  return (
    <div className="bg-secondary/40 border border-border/60 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">

        {/* Name */}
        {hasField('name') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
            <Input value={form.name} onChange={set('name')} placeholder="Full name" className="h-8 text-sm font-mono" />
          </div>
        )}

        {/* Organization */}
        {hasField('agency') && (
          <div className={hasField('name') ? '' : 'col-span-2'}>
            <label className="text-xs text-muted-foreground mb-1 block">
              {hasField('name') ? 'Organization' : 'Organization Name *'}
            </label>
            <Input value={form.agency} onChange={set('agency')} placeholder="Company or agency" className="h-8 text-sm font-mono" />
          </div>
        )}

        {/* Role */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Type / Role</label>
          <Select value={form.role} onValueChange={setVal('role')}>
            <SelectTrigger className="h-8 text-xs font-mono bg-background">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {cat.roles.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <Input value={form.phone} onChange={set('phone')} placeholder="Phone number" className="h-8 text-sm font-mono" />
        </div>

        {/* DOB */}
        {hasField('dob') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Date of Birth</label>
            <Input
              type="date"
              value={form.dob}
              onChange={set('dob')}
              className="h-8 text-sm font-mono"
            />
          </div>
        )}

        {/* Email */}
        {hasField('email') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input value={form.email} onChange={set('email')} placeholder="Email address" className="h-8 text-sm font-mono" />
          </div>
        )}

        {/* ── Injury fields ── */}
        {hasField('injury_type') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Injury Type</label>
            <Select value={form.injury_type} onValueChange={setVal('injury_type')}>
              <SelectTrigger className="h-8 text-xs font-mono bg-background">
                <SelectValue placeholder="Select injury..." />
              </SelectTrigger>
              <SelectContent>
                {INJURY_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasField('transported_to') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Transported To</label>
            <Input value={form.transported_to} onChange={set('transported_to')} placeholder="Hospital / facility" className="h-8 text-sm font-mono" />
          </div>
        )}

        {/* ── Vehicle fields ── */}
        {hasField('make') && (
          <>
            <div className="col-span-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 mt-1 border-t border-border/40 pt-2">
                Vehicle Info
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Make</label>
              <Input value={form.make} onChange={set('make')} placeholder="e.g. Ford" className="h-8 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Model</label>
              <Input value={form.model} onChange={set('model')} placeholder="e.g. F-150" className="h-8 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Year</label>
              <Input value={form.year} onChange={set('year')} placeholder="e.g. 2022" className="h-8 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">License Plate</label>
              <Input value={form.plate} onChange={set('plate')} placeholder="Plate number" className="h-8 text-sm font-mono uppercase" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Plate State</label>
              <Input value={form.plate_state} onChange={set('plate_state')} placeholder="e.g. MA" className="h-8 text-sm font-mono uppercase" maxLength={2} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">VIN</label>
              <Input value={form.vin} onChange={set('vin')} placeholder="Vehicle identification number" className="h-8 text-sm font-mono uppercase" maxLength={17} />
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2 mt-1 border-t border-border/40 pt-2">
                Insurance
              </p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Insurance Company</label>
              <Input value={form.insurance_company} onChange={set('insurance_company')} placeholder="e.g. State Farm" className="h-8 text-sm font-mono" />
            </div>
          </>
        )}

        {/* Policy number — insurance category + vehicle category */}
        {hasField('policy_number') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Policy Number</label>
            <Input value={form.policy_number} onChange={set('policy_number')} placeholder="Policy #" className="h-8 text-sm font-mono" />
          </div>
        )}

        {/* Unit sent — mutual aid */}
        {hasField('unit_sent') && (
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Unit(s) Sent</label>
            <Input value={form.unit_sent} onChange={set('unit_sent')} placeholder="e.g. E4, L2, BC1" className="h-8 text-sm font-mono" />
          </div>
        )}

        {/* Occupant count — family/occupants */}
        {hasField('accounted_for') && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Accounted For</label>
              <Input type="number" min={0} value={form.accounted_for} onChange={set('accounted_for')} placeholder="0" className="h-8 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Total Occupants</label>
              <Input type="number" min={0} value={form.total_occupants} onChange={set('total_occupants')} placeholder="0" className="h-8 text-sm font-mono" />
            </div>
          </>
        )}

        {/* Refused transport — injuries */}
        {hasField('injury_type') && (
          <div className="col-span-2 flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="refused_transport_chk"
              checked={form.refused_transport || false}
              onChange={(e) => setForm(f => ({ ...f, refused_transport: e.target.checked }))}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <label htmlFor="refused_transport_chk" className="text-sm font-mono text-foreground cursor-pointer select-none">
              Patient refused transport
            </label>
          </div>
        )}

        {/* Notes */}
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <Input value={form.notes} onChange={set('notes')} placeholder="Additional notes..." className="h-8 text-sm font-mono" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => canSave && onSave(form)} disabled={!canSave}>Save</Button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatLogTime(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ── ContactCard ───────────────────────────────────────────────────────────────
function ContactCard({ contact, onEdit, onDelete }) {
  const cat = CATEGORIES.find(c => c.key === contact.category) || CATEGORIES[0];
  const displayName = contact.name || contact.agency || '—';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const formatDOB = (dob) => {
    if (!dob) return null;
    try {
      const d = new Date(dob + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch { return dob; }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-secondary/40 border border-border/40 rounded-lg group hover:border-border/70 transition-colors">
      <div className={`h-9 w-9 rounded-full ${cat.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
        <span className={`text-xs font-mono font-bold ${cat.color}`}>{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        {/* Name + role + org + timestamp */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-foreground text-sm">{displayName}</span>
          {contact.role && (
            <span className={`text-xs ${cat.color} ${cat.bgColor} px-2 py-0.5 rounded-full`}>{contact.role}</span>
          )}
          {contact.name && contact.agency && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {contact.agency}
            </span>
          )}
          {contact.created_date && (
            <span className="text-[10px] font-mono text-muted-foreground/50 flex items-center gap-0.5 ml-auto shrink-0">
              <Clock className="w-3 h-3" />{formatLogTime(contact.created_date)}
            </span>
          )}
        </div>

        {/* DOB */}
        {contact.dob && (
          <p className="text-xs text-muted-foreground mt-0.5">DOB: {formatDOB(contact.dob)}</p>
        )}

        {/* Injury info */}
        {contact.injury_type && (
          <p className="text-xs text-red-400 mt-0.5 font-mono">
            ⚕ {contact.injury_type}
            {contact.transported_to ? ` · Transported to ${contact.transported_to}` : ''}
          </p>
        )}
        {contact.refused_transport && (
          <p className="text-xs text-orange-400 font-mono mt-0.5">⚠ Refused transport</p>
        )}

        {/* Occupant count */}
        {(contact.accounted_for !== '' && contact.accounted_for != null) || (contact.total_occupants !== '' && contact.total_occupants != null) ? (
          <p className="text-xs text-amber-400 font-mono mt-0.5">
            👥 {contact.accounted_for ?? '?'} / {contact.total_occupants ?? '?'} occupants accounted for
          </p>
        ) : null}

        {/* Mutual Aid unit sent */}
        {contact.unit_sent && (
          <p className="text-xs text-cyan-400 font-mono mt-0.5">🚒 Units: {contact.unit_sent}</p>
        )}

        {/* Vehicle info */}
        {(contact.make || contact.plate) && (
          <div className="mt-1 space-y-0.5">
            {(contact.year || contact.make || contact.model) && (
              <p className="text-xs text-muted-foreground font-mono">
                🚗 {[contact.year, contact.make, contact.model].filter(Boolean).join(' ')}
              </p>
            )}
            {contact.plate && (
              <p className="text-xs text-muted-foreground font-mono">
                🪪 {contact.plate}{contact.plate_state ? ` (${contact.plate_state.toUpperCase()})` : ''}
                {contact.vin ? <span className="ml-2 opacity-60">VIN: {contact.vin}</span> : ''}
              </p>
            )}
            {contact.insurance_company && (
              <p className="text-xs text-muted-foreground font-mono">
                📋 {contact.insurance_company}{contact.policy_number ? ` · Policy #${contact.policy_number}` : ''}
              </p>
            )}
          </div>
        )}

        {/* Standard insurance policy (non-vehicle) */}
        {!contact.make && contact.policy_number && (
          <p className="text-xs text-muted-foreground mt-0.5">Policy #{contact.policy_number}</p>
        )}

        {/* Phone / email */}
        <div className="flex flex-wrap gap-3 mt-1">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Phone className="w-3 h-3" /> {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <Mail className="w-3 h-3" /> {contact.email}
            </a>
          )}
        </div>

        {contact.notes && <p className="text-xs text-muted-foreground/80 italic mt-1">{contact.notes}</p>}
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(contact)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-500 hover:bg-red-500/10" onClick={() => onDelete(contact.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── CategorySection ───────────────────────────────────────────────────────────
function CategorySection({ categoryKey, contacts, addingTo, setAddingTo, editing, setEditing, onCreate, onUpdate, onDelete }) {
  const cat = CATEGORIES.find(c => c.key === categoryKey);
  const Icon = cat.icon;
  const isAdding = addingTo === categoryKey;
  const catContacts = contacts.filter(c => c.category === categoryKey);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${cat.color}`} />
          <h2 className="font-mono font-bold text-foreground">{cat.label}</h2>
          {catContacts.length > 0 && (
            <span className="text-xs text-muted-foreground">({catContacts.length})</span>
          )}
        </div>
        {!isAdding && (
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddingTo(categoryKey)}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-3">
          <ContactForm
            categoryKey={categoryKey}
            onSave={(f) => onCreate(f)}
            onCancel={() => setAddingTo(null)}
          />
        </div>
      )}

      {catContacts.length === 0 && !isAdding && (
        <p className="text-sm text-muted-foreground italic">{cat.emptyText}</p>
      )}

      <div className="space-y-2">
        {catContacts.map(c =>
          editing?.id === c.id ? (
            <ContactForm
              key={c.id}
              categoryKey={c.category}
              initial={c}
              onSave={(f) => onUpdate(c.id, f)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <ContactCard key={c.id} contact={c} onEdit={setEditing} onDelete={onDelete} />
          )
        )}
      </div>
    </section>
  );
}

// ── Scene Photos ──────────────────────────────────────────────────────────────
function ScenePhotos({ incidentId }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleCapture = async (files) => {
    setUploading(true);
    try {
      const uploads = await Promise.all(
        files.map(f => base44.integrations.Core.UploadFile({ file: f }))
      );
      setPhotos(prev => [
        ...prev,
        ...uploads.map((u, i) => ({ url: u.file_url, name: files[i].name })),
      ]);
    } catch (e) {
      console.error('Photo upload failed', e);
    }
    setUploading(false);
  };

  const removePhoto = (i) => setPhotos(prev => prev.filter((_, j) => j !== i));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-mono font-bold text-foreground">Scene Photos</h2>
          {photos.length > 0 && <span className="text-xs text-muted-foreground">({photos.length})</span>}
        </div>
        <CameraCapture label="Take / Upload" multiple onCapture={handleCapture} />
      </div>

      {uploading && (
        <p className="text-xs text-muted-foreground font-mono italic mb-2">Uploading…</p>
      )}

      {photos.length === 0 && !uploading && (
        <p className="text-sm text-muted-foreground italic">
          No photos yet. Snap ID cards, insurance cards, or scene documentation.
        </p>
      )}

      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((p, i) => (
            <div key={i} className="relative w-28 h-28 rounded-lg overflow-hidden border border-border group">
              <a href={p.url} target="_blank" rel="noreferrer">
                <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              </a>
              <button
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IncidentContacts() {
  const { incidentId } = useParams();
  const queryClient = useQueryClient();
  const [addingTo, setAddingTo] = useState(null);
  const [editing, setEditing] = useState(null);

  const { data: incident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: (d) => d?.[0] || null,
    enabled: !!incidentId,
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['contacts', incidentId],
    queryFn: () => base44.entities.Contact.filter({ incident_id: incidentId }),
    enabled: !!incidentId,
  });

  const createContact = useMutation({
    mutationFn: (data) => base44.entities.Contact.create({ ...data, incident_id: incidentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', incidentId] });
      setAddingTo(null);
    },
  });

  const updateContact = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', incidentId] });
      setEditing(null);
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts', incidentId] }),
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={incidentId ? `/incident/${incidentId}` : '/'}>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Incident Contacts</h1>
            {incident && <p className="text-sm text-muted-foreground font-mono">{incident.address}</p>}
          </div>
        </div>

        <div className="space-y-8">
          <ScenePhotos incidentId={incidentId} />

          {CATEGORIES.map(cat => (
            <CategorySection
              key={cat.key}
              categoryKey={cat.key}
              contacts={allContacts}
              addingTo={addingTo}
              setAddingTo={(key) => { setAddingTo(key); setEditing(null); }}
              editing={editing}
              setEditing={(c) => { setEditing(c); setAddingTo(null); }}
              onCreate={(f) => createContact.mutate(f)}
              onUpdate={(id, f) => updateContact.mutate({ id, data: f })}
              onDelete={(id) => deleteContact.mutate(id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
