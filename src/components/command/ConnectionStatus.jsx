import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConnectionStatus({ isOnline, pendingCount, replaying }) {
  if (isOnline && pendingCount === 0 && !replaying) return null;

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium border',
      isOnline && replaying
        ? 'bg-blue-950/60 border-blue-700/50 text-blue-300'
        : isOnline && pendingCount > 0
        ? 'bg-yellow-950/60 border-yellow-700/50 text-yellow-300'
        : 'bg-red-950/60 border-red-700/50 text-red-300'
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>OFFLINE — changes queued ({pendingCount})</span>
        </>
      ) : replaying ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}...</span>
        </>
      )}
    </div>
  );
}