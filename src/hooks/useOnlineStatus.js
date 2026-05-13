import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { replayQueue, getQueue } from '@/lib/offlineQueue';

export function useOnlineStatus(onReconnect) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getQueue().length);
  const [replaying, setReplaying] = useState(false);
  const replayingRef = useRef(false);

  const updatePending = useCallback(() => {
    setPendingCount(getQueue().length);
  }, []);

  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    if (replayingRef.current) return;
    const q = getQueue();
    if (q.length > 0) {
      replayingRef.current = true;
      setReplaying(true);
      await replayQueue(base44);
      updatePending();
      setReplaying(false);
      replayingRef.current = false;
      onReconnect?.();
    }
  }, [onReconnect, updatePending]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, pendingCount, replaying, updatePending };
}