import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Trash2, Pencil, Phone, Mail, Building2, User, Globe, Star } from 'lucide-react';

function ContactForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', role: '', phone: '', email: '', agency: '', notes: '', ...initial
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="bg-secondary/40 border border-border/60 rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
          <Input value={form.name} onChange={set('name')} placeholder="Full name" className="h-8 text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Role / Title</label>
          <Input value={form.role} onChange={set('role')} placeholder="e.g. PIO, Utility Liaison" className="h-8 text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <Input value={form.phone} onChange={set('phone')} placeholder="Phone number" className="h-8 text-sm font-mono" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <Input value={form.email} onChange={set('email')} placeholder="Email address" className="h-8 text-sm font-mono" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Agency / Organization</label>
          <Input value={form.agency} onChange={set('agency')} placeholder="Agency or organization" className="h-8 text-sm font-mono" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <Input value={form.notes} onChange={set('notes')} placeholder="Optional notes" className="h-8 text-sm font-mono" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={() => form.name.trim() && onSave(form)} disabled={!form.name.trim()}>Save</Button>
      </div>
    </div>
  );
}

function ContactCard({ contact, onEdit, onDelete }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-secondary/40 border border-border/40 rounded-lg group hover:border-border/70 transition-colors">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-semibold text-foreground text-sm">{contact.name}</span>
          {contact.role && <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">{contact.role}</span>}
          {contact.agency && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {contact.agency}
            </span>
          )}
        </div>
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
        {contact.notes && <p className="text-xs text-muted-foreground mt-1">{contact.notes}</p>}
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

export default function IncidentContacts() {
  const { incidentId } = useParams();
  const queryClient = useQueryClient();
  const [addingTo, setAddingTo] = useState(null); // 'incident' | 'global' | null
  const [editing, setEditing] = useState(null);
  const isStandalone = !incidentId;

  const { data: incident } = useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => base44.entities.Incident.filter({ id: incidentId }),
    select: (d) => d?.[0] || null,
    enabled: !!incidentId,
  });

  const { data: allContacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => base44.entities.Contact.list(),
  });

  const incidentContacts = allContacts.filter(c => c.incident_id === incidentId);
  const globalContacts = allContacts.filter(c => !c.incident_id);

  const createContact = useMutation({
    mutationFn: (data) => base44.entities.Contact.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); setAddingTo(null); },
  });

  const updateContact = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Contact.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['contacts'] }); setEditing(null); },
  });

  const deleteContact = useMutation({
    mutationFn: (id) => base44.entities.Contact.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const handleSave = (form, scope) => {
    const data = { ...form };
    if (scope === 'incident') data.incident_id = incidentId;
    else delete data.incident_id;
    createContact.mutate(data);
  };

  const handleUpdate = (form) => {
    updateContact.mutate({ id: editing.id, data: form });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={isStandalone ? '/' : `/incident/${incidentId}`}>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">
              {isStandalone ? 'Contacts' : 'Incident Contacts'}
            </h1>
            {incident && <p className="text-sm text-muted-foreground font-mono">{incident.address}</p>}
          </div>
        </div>

        <div className="space-y-8">
          {/* Incident-specific contacts — only when in an incident context */}
          {!isStandalone && <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-accent" />
                <h2 className="font-mono font-bold text-foreground">This Incident</h2>
                <span className="text-xs text-muted-foreground">({incidentContacts.length})</span>
              </div>
              {addingTo !== 'incident' && (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddingTo('incident')}>
                  <Plus className="w-3 h-3" /> Add Contact
                </Button>
              )}
            </div>

            {addingTo === 'incident' && (
              <div className="mb-3">
                <ContactForm onSave={(f) => handleSave(f, 'incident')} onCancel={() => setAddingTo(null)} />
              </div>
            )}

            {incidentContacts.length === 0 && addingTo !== 'incident' && (
              <p className="text-sm text-muted-foreground italic">No incident-specific contacts yet.</p>
            )}
            <div className="space-y-2">
              {incidentContacts.map(c =>
                editing?.id === c.id ? (
                  <ContactForm key={c.id} initial={c} onSave={handleUpdate} onCancel={() => setEditing(null)} />
                ) : (
                  <ContactCard key={c.id} contact={c} onEdit={setEditing} onDelete={(id) => deleteContact.mutate(id)} />
                )
              )}
            </div>
          </section>}

          {/* Global contacts */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-mono font-bold text-foreground">Global Contacts</h2>
                <span className="text-xs text-muted-foreground">({globalContacts.length})</span>
              </div>
              {addingTo !== 'global' && (
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddingTo('global')}>
                  <Plus className="w-3 h-3" /> Add Global
                </Button>
              )}
            </div>

            {addingTo === 'global' && (
              <div className="mb-3">
                <ContactForm onSave={(f) => handleSave(f, 'global')} onCancel={() => setAddingTo(null)} />
              </div>
            )}

            {globalContacts.length === 0 && addingTo !== 'global' && (
              <p className="text-sm text-muted-foreground italic">No global contacts yet. Add reusable contacts here (utilities, Red Cross, PIO, etc.)</p>
            )}
            <div className="space-y-2">
              {globalContacts.map(c =>
                editing?.id === c.id ? (
                  <ContactForm key={c.id} initial={c} onSave={handleUpdate} onCancel={() => setEditing(null)} />
                ) : (
                  <ContactCard key={c.id} contact={c} onEdit={setEditing} onDelete={(id) => deleteContact.mutate(id)} />
                )
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}