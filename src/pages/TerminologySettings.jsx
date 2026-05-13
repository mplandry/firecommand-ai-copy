import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, CheckCircle2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function TerminologySettings() {
  const queryClient = useQueryClient();

  const { data: corrections = [], isLoading } = useQuery({
    queryKey: ['terminology'],
    queryFn: () => base44.entities.TerminologyCorrection.list('-created_date', 200),
  });

  const deleteCorrection = useMutation({
    mutationFn: (id) => base44.entities.TerminologyCorrection.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['terminology'] }),
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold font-mono text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Radio Terminology Corrections
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              Corrections saved here are automatically injected into future radio parses to improve accuracy.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground font-mono text-sm">Loading...</div>
        )}

        {!isLoading && corrections.length === 0 && (
          <div className="text-center py-16 text-muted-foreground/50 font-mono text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
            No corrections saved yet. Use the 👎 button on radio log entries to teach the AI your terminology.
          </div>
        )}

        {corrections.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-secondary/50 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider grid grid-cols-[1fr_auto_auto_auto_auto] gap-3">
              <span>Original Phrase</span>
              <span>Unit</span>
              <span>Assignment</span>
              <span>Status</span>
              <span></span>
            </div>
            {corrections.map(c => (
              <div
                key={c.id}
                className="px-4 py-3 border-b border-border/40 last:border-0 grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-start hover:bg-secondary/20 transition-colors"
              >
                <div>
                  <p className="font-mono text-xs text-foreground">"{c.raw_phrase}"</p>
                  {c.original_summary && (
                    <p className="text-[10px] font-mono text-red-400/70 mt-0.5">AI said: {c.original_summary}</p>
                  )}
                  {c.correct_summary && (
                    <p className="text-[10px] font-mono text-green-400/70 mt-0.5">Should mean: {c.correct_summary}</p>
                  )}
                  <p className="text-[9px] font-mono text-muted-foreground/40 mt-1">
                    {format(new Date(c.created_date), 'MMM d, HH:mm')}
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400">{c.correct_unit || '—'}</span>
                <span className="text-xs font-mono text-yellow-400">{c.correct_assignment || '—'}</span>
                <span className="text-xs font-mono text-blue-400">{c.correct_status || '—'}</span>
                <button
                  onClick={() => deleteCorrection.mutate(c.id)}
                  className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                  title="Remove this correction"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}