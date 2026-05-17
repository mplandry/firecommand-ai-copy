import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Mic, Square } from 'lucide-react';
import { format } from 'date-fns';

export default function RadioTrainingTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    raw_phrase: '',
    correct_unit: '',
    correct_assignment: '',
    correct_status: '',
    correct_summary: '',
  });
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const { data: corrections = [], isLoading } = useQuery({
    queryKey: ['terminology'],
    queryFn: () => base44.entities.TerminologyCorrection.list('-created_date', 200),
  });

  const createCorrection = useMutation({
    mutationFn: (data) => base44.entities.TerminologyCorrection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminology'] });
      setForm({ raw_phrase: '', correct_unit: '', correct_assignment: '', correct_status: '', correct_summary: '' });
    },
  });

  const deleteCorrection = useMutation({
    mutationFn: (id) => base44.entities.TerminologyCorrection.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terminology'] }),
  });

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setForm(f => ({ ...f, raw_phrase: transcript }));
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setForm(f => ({ ...f, raw_phrase: '' }));
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.raw_phrase.trim()) return;
    createCorrection.mutate({
      ...form,
      confirmed: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Training Form */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="text-sm font-bold font-mono text-foreground mb-4">Add Training Mapping</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs font-mono">What was said (misinterpretation)</Label>
            <div className="flex gap-2">
              <Input
                value={form.raw_phrase}
                onChange={(e) => setForm({ ...form, raw_phrase: e.target.value })}
                placeholder="e.g. latitude, roof six, charlie bravo"
                className="bg-secondary font-mono text-sm flex-1"
                autoFocus
              />
              <Button
                type="button"
                variant={isListening ? 'destructive' : 'outline'}
                size="icon"
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-mono">Correct Unit</Label>
              <Input
                value={form.correct_unit}
                onChange={(e) => setForm({ ...form, correct_unit: e.target.value })}
                placeholder="e.g. Ladder 2"
                className="bg-secondary font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-mono">Assignment</Label>
              <Input
                value={form.correct_assignment}
                onChange={(e) => setForm({ ...form, correct_assignment: e.target.value })}
                placeholder="e.g. Interior, Roof"
                className="bg-secondary font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-mono">Status</Label>
            <Input
              value={form.correct_status}
              onChange={(e) => setForm({ ...form, correct_status: e.target.value })}
              placeholder="e.g. on_scene, working"
              className="bg-secondary font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-xs font-mono">What it should mean</Label>
            <Textarea
              value={form.correct_summary}
              onChange={(e) => setForm({ ...form, correct_summary: e.target.value })}
              placeholder="Full description of what was actually meant"
              className="bg-secondary font-mono text-sm"
              rows={2}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={!form.raw_phrase.trim()}>
            <Plus className="w-4 h-4" /> Add to Training Data
          </Button>
        </form>
      </div>

      {/* Training List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground font-mono text-sm">Loading...</div>
      ) : corrections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground/50 font-mono text-sm">
          No training mappings yet. Add one above to get started.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-secondary/50 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            <p>Training Data</p>
          </div>
          <div className="divide-y divide-border/40">
            {corrections.map(c => (
              <div key={c.id} className="px-4 py-3 hover:bg-secondary/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-foreground">"{c.raw_phrase}"</p>
                    {c.correct_summary && (
                      <p className="text-[10px] font-mono text-green-400/70 mt-1">→ {c.correct_summary}</p>
                    )}
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {c.correct_unit && <span className="text-[9px] font-mono bg-cyan-900/30 text-cyan-400 px-2 py-1 rounded">{c.correct_unit}</span>}
                      {c.correct_assignment && <span className="text-[9px] font-mono bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">{c.correct_assignment}</span>}
                      {c.correct_status && <span className="text-[9px] font-mono bg-blue-900/30 text-blue-400 px-2 py-1 rounded">{c.correct_status}</span>}
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground/40 mt-1">
                      {format(new Date(c.created_date), 'MMM d, HH:mm')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteCorrection.mutate(c.id)}
                    className="text-muted-foreground/40 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                    title="Remove this mapping"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}