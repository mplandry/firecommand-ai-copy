/**
 * Offline Queue — persists pending writes to localStorage
 * and replays them when connectivity is restored.
 *
 * Cache is also updated optimistically so the UI reflects
 * changes immediately even without a network connection.
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

function getRawCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveRawCache(all) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    // storage full — fail silently
  }
}

export function setCached(incidentId, data) {
  const all = getRawCache();
  all[incidentId] = { ...all[incidentId], ...data, cached_at: new Date().toISOString() };
  saveRawCache(all);
}

/**
 * Optimistically apply a unit update to the local cache.
 * Merges fields into the matching unit by id.
 */
export function patchCachedUnit(incidentId, unitId, changes) {
  const all = getRawCache();
  const incident = all[incidentId] || { units: [], radioLogs: [] };
  incident.units = (incident.units || []).map(u =>
    u.id === unitId ? { ...u, ...changes } : u
  );
  all[incidentId] = { ...incident, cached_at: new Date().toISOString() };
  saveRawCache(all);
}

/**
 * Optimistically add a new unit to the local cache.
 */
export function addCachedUnit(incidentId, unit) {
  const all = getRawCache();
  const incident = all[incidentId] || { units: [], radioLogs: [] };
  // avoid duplicates by unit_name
  const exists = (incident.units || []).some(
    u => u.unit_name?.toLowerCase() === unit.unit_name?.toLowerCase()
  );
  if (!exists) {
    incident.units = [...(incident.units || []), unit];
  }
  all[incidentId] = { ...incident, cached_at: new Date().toISOString() };
  saveRawCache(all);
}

/**
 * Optimistically prepend a radio log entry to the local cache.
 */
export function addCachedRadioLog(incidentId, log) {
  const all = getRawCache();
  const incident = all[incidentId] || { units: [], radioLogs: [] };
  incident.radioLogs = [log, ...(incident.radioLogs || [])].slice(0, 200);
  all[incidentId] = { ...incident, cached_at: new Date().toISOString() };
  saveRawCache(all);
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