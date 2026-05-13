import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Building2, CheckCircle } from 'lucide-react';

export default function DepartmentSettings() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: '',
    jurisdiction: '',
    chief_name: '',
    phone: '',
    address: '',
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['department'],
    queryFn: () => base44.entities.Department.list(),
  });

  const dept = departments[0] || null;

  useEffect(() => {
    if (dept) {
      setForm({
        name: dept.name || '',
        jurisdiction: dept.jurisdiction || '',
        chief_name: dept.chief_name || '',
        phone: dept.phone || '',
        address: dept.address || '',
      });
    }
  }, [dept]);

  const saveDept = useMutation({
    mutationFn: () => {
      if (dept) return base44.entities.Department.update(dept.id, form);
      return base44.entities.Department.create(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="font-bold font-mono tracking-wide">DEPARTMENT SETTINGS</h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="font-mono font-semibold text-foreground text-sm uppercase tracking-wider">
            Department Information
          </h2>

          <div>
            <Label className="text-xs font-mono">Department Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Springfield Fire Department"
              className="bg-secondary font-mono mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-mono">Jurisdiction</Label>
            <Input
              value={form.jurisdiction}
              onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
              placeholder="City of Springfield"
              className="bg-secondary font-mono mt-1"
            />
          </div>

          <div>
            <Label className="text-xs font-mono">Fire Chief</Label>
            <Input
              value={form.chief_name}
              onChange={(e) => setForm({ ...form, chief_name: e.target.value })}
              placeholder="Chief John Smith"
              className="bg-secondary font-mono mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 555-5555"
                className="bg-secondary font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">HQ Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="100 Fire Station Rd"
                className="bg-secondary font-mono mt-1"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={() => saveDept.mutate()}
          disabled={!form.name.trim() || saveDept.isPending}
          className="w-full gap-2"
        >
          {saved ? (
            <><CheckCircle className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save Settings</>
          )}
        </Button>
      </div>
    </div>
  );
}