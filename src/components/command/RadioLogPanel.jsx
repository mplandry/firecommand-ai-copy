import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Radio, Clock } from 'lucide-react';
import { format } from 'date-fns';

const priorityColors = {
  routine: 'text-muted-foreground',
  urgent: 'text-yellow-400',
  emergency: 'text-orange-400',
  mayday: 'text-red-400 font-bold',
};

const priorityBadge = {
  routine: 'bg-secondary text-muted-foreground',
  urgent: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  emergency: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  mayday: 'bg-red-600/30 text-red-300 border-red-500/50',
};

export default function RadioLogPanel({ logs }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 bg-secondary/50 border-b border-border flex items-center gap-2">
        <Radio className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold font-mono tracking-wider text-foreground uppercase">
          Radio Log
        </h3>
        <Badge variant="outline" className="ml-auto text-xs">
          {logs.length}
        </Badge>
      </div>
      <ScrollArea className="flex-1 max-h-[400px]">
        <div className="p-2 space-y-1">
          {logs.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground/50">
              No transmissions logged
            </div>
          )}
          {logs.map((log) => (
            <div
              key={log.id}
              className={`px-3 py-2 rounded text-xs font-mono ${log.priority === 'mayday' ? 'bg-red-600/10 border border-red-500/20' : 'bg-secondary/30 hover:bg-secondary/50'} transition-colors`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-muted-foreground/70">
                  {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : '--:--:--'}
                </span>
                {log.from_unit && (
                  <span className="text-primary font-medium">{log.from_unit}</span>
                )}
                {log.to_unit && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground">{log.to_unit}</span>
                  </>
                )}
                {log.priority !== 'routine' && (
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${priorityBadge[log.priority]}`}>
                    {log.priority?.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className={`${priorityColors[log.priority] || 'text-foreground'} leading-relaxed`}>
                {log.message}
              </p>
              {log.parsed_action && (
                <p className="text-primary/60 mt-1 text-[10px]">
                  ↳ {log.parsed_action}
                </p>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}