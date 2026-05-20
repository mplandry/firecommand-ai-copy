import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Pencil, Phone, Mail, Home, FileText, Users, Eye, Heart, Building2, Camera, X } from 'lucide-react';
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
    key: 'family',
    label: 'Family / Occupants',
    icon: Users,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    roles: ['Spouse', 'Child', 'Parent', 'Sibling', 'Occupant', 'Pet'],
    fields: ['name', 'role', 'phone', 'notes'],
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
    key: 'relief',
    label: 'Relief / Services',
    icon: Heart,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    roles: ['Red Cross', 'Salvation Army', 'Utility — Gas', 'Utility — Electric', 'Utility — Water', 'Animal Services', 'Other Agency'],
    fields: ['agency', 'role', 'phone', 'notes'],
    emptyText: 'No relief services logged.',
  },
];

function initForm(categoryKey) {
  return { name: '', agency: '', role: '', phone: '', email: '', policy_number: '', notes: '', category: categoryKey };
}

function ContactForm({ categoryKey, initial, onSave, onCancel }) {
  const cat = CATEGORIES.find(c => c.key === categoryKey);
  const [form, setForm] = useState(initial || initForm(categoryKey));
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setVal = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const hasField = (f) => cat.fields.includes(f);
  const nameLabel = hasField('agency') && !hasField('name') ? 'Organization Name' : 'Name';
  const primaryName = hasField('name') ? form.name : form.agency;
  const canSave = primaryName.trim().length > 0;

  return (
    <div className="bg-secondary/40 border border-border/60 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {hasField('name') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
            <Input value={form.name} onChange={set('name')} placeholder="Full name" className="h-8 text-sm font-mono" />
          </div>
        )}
        {hasField('agency') && (
          <div className={hasField('name') ? '' : 'col-span-2'}>
            <label className="text-xs text-muted-foreground mb-1 block">{hasField('name') ? 'Organization' : 'Organization Name *'}</label>
            <Input value={form.agency} onChange={set('agency')} placeholder="Company or agency" className="h-8 text-sm font-mono" />
          </div>
        )}
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
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <Input value={form.phone} onChange={set('phone')} placeholder="Phone number" className="h-8 text-sm font-mono" />
        </div>
        {hasField('email') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <Input value={form.email} onChange={set('email')} placeholder="Email address" className="h-8 text-sm font-mono" />
          </div>
        )}
        {hasField('policy_number') && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Policy Number</label>
            <Input value={form.policy_number} onChange={set('policy_number')} placeholder="Policy #" className="h-8 text-sm font-mono" />
          </div>
        )}
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Notes / Status</label>
          <Input value={form.notes} onChange={set('notes')} placeholder="e.g. Evacuated, ETA 20 min, unaccounted..." className="h-8 text-sm font-mono" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => canSave && onSave(form)} disabled={!canSave}>Save</Button>
      </div>
    </div>
  );
}

function ContactCard({ contact, onEdit, onDelete }) {
  const cat = CATEGORIES.find(c => c.key === contact.category) || CATEGORIES[0];
  const displayName = contact.name || contact.agency || '—';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex items-start gap-3 p-3 bg-secondary/40 border border-border/40 rounded-lg group hover:border-border/70 transition-colors">
      <div className={`h-9 w-9 rounded-full ${cat.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
        <span className={`text-xs font-mono font-bold ${cat.color}`}>{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
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
        </div>
        {contact.policy_number && (
          <p className="text-xs text-muted-foreground mt-0.5">Policy #{contact.policy_number}</p>
        )}
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

// ── Scene Photos panel ────────────────────────────────────────────────────────
function ScenePhotos({ incidentId }) {
  const [photos, setPhotos] = useState([]); // [{ url, name }]
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
        <CameraCapture
          label="Take / Upload"
          multiple
          onCapture={handleCapture}
        />
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
          <Link to={`/incident/${incidentId}`}>
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
