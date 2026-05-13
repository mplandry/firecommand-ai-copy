/**
 * Offline Queue — persists pending writes to localStorage
 * and replays them when connectivity is restored.
 */

const QUEUE_KEY = 'ics_offline_queue';
const CACHE_KEY = 'ics_offline_cache';

// ── Queue management ─────────────────────────────────────────────────────────

export function getQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(operation) {
  const queue = getQueue();
  queue.push({ ...operation, id: Date.now() + Math.random(), queued_at: new Date().toISOString() });
  saveQueue(queue);
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

function dequeue(opId) {
  const queue = getQueue().filter(op => op.id !== opId);
  saveQueue(queue);
}

// ── Local cache ──────────────────────────────────────────────────────────────

export function getCached(incidentId) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return all[incidentId] || { units: [], radioLogs: [] };
  } catch {
    return { units: [], radioLogs: [] };
  }
}

export function setCached(incidentId, data) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    all[incidentId] = { ...all[incidentId], ...data, cached_at: new Date().toISOString() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    // storage full — fail silently
  }
}

// ── Replay queued operations when back online ────────────────────────────────

export async function replayQueue(base44) {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let replayed = 0;
  for (const op of queue) {
    try {
      if (op.type === 'unit_update') {
        await base44.entities.Unit.update(op.id, op.data);
      } else if (op.type === 'unit_create') {
        await base44.entities.Unit.create(op.data);
      } else if (op.type === 'radio_log_create') {
        await base44.entities.RadioLog.create(op.data);
      }
      dequeue(op.id);
      replayed++;
    } catch {
      // leave in queue if it fails again
    }
  }
  return replayed;
}