import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// ─── Default state shape ─────────────────────────────────────────────────────

export const DEFAULT_MAYDAY_STATE = {
  isActive: false,
  maydayTime: null,
  maydayStartTimestamp: null, // wall-clock ms so elapsed stays accurate across nav
  elapsed: 0,
  checklist: {},
  lips: { location: '', identification: '', problem: '', solution: '' },
  notes: {},
  ritTimes: {},
  unitData: {},
  ritData: {},
  fireLocation: '',
  boardNotes: '',
  maydayUnit: null,      // unit object (serialised in localStorage)
  ritDeployTime: null,
  backfillRIT: null,     // unit object
};

// ─── Context ─────────────────────────────────────────────────────────────────

const MaydayContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function MaydayProvider({ incidentId, children }) {
  const storageKey = `mayday_${incidentId}`;

  // Hydrate from localStorage on first mount
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        // Recalculate elapsed from start timestamp so it's accurate after navigation
        if (saved.isActive && saved.maydayStartTimestamp) {
          saved.elapsed = Math.floor((Date.now() - saved.maydayStartTimestamp) / 1000);
        }
        return { ...DEFAULT_MAYDAY_STATE, ...saved };
      }
    } catch {}
    return { ...DEFAULT_MAYDAY_STATE };
  });

  // Persist every state change to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }, [state, storageKey]);

  // Live timer — always derived from maydayStartTimestamp so it stays correct
  const intervalRef = useRef(null);
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (state.isActive) {
      intervalRef.current = setInterval(() => {
        setState(s => ({
          ...s,
          elapsed: s.maydayStartTimestamp
            ? Math.floor((Date.now() - s.maydayStartTimestamp) / 1000)
            : s.elapsed + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [state.isActive]);

  // Shallow-merge helper for simple flat patches
  const update = useCallback(
    (patch) => setState(s => ({ ...s, ...patch })),
    [],
  );

  // Full reset — clears localStorage too
  const resetAll = useCallback(() => {
    setState({ ...DEFAULT_MAYDAY_STATE });
    try { localStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  return (
    <MaydayContext.Provider value={{ state, setState, update, resetAll }}>
      {children}
    </MaydayContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMayday() {
  const ctx = useContext(MaydayContext);
  if (!ctx) throw new Error('useMayday must be used inside a MaydayProvider');
  return ctx;
}
