import { useState, useEffect, useRef } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  {
    id: 1,
    text: "MAYDAY — MAYDAY — MAYDAY message transmitted",
    critical: true,
  },
  { id: 2, text: "Announce EMERGENCY TRAFFIC only" },
  { id: 3, text: "Acknowledge Company/Member transmitting the MAYDAY" },
  {
    id: 4,
    text: "Obtain LIPS information (Location, ID, Problem, Solution)",
    hasLIPS: true,
  },
  {
    id: 5,
    text: "If no answer after two attempts, conduct PAR to isolate company/member",
  },
  {
    id: 6,
    text: "Deploy RIT team to last known location — note time of deployment of all RIT companies",
  },
  { id: 7, text: "Request additional alarm" },
  { id: 8, text: "Identify RIT BRANCH (who will run MAYDAY)" },
  {
    id: 9,
    text: "Request channel switch for fire operations (keep MAYDAY on current channel)",
  },
  { id: 10, text: "Maintain firefighting positions" },
  {
    id: 11,
    text: "Establish backup RIT teams (firefighting and MAYDAY operations)",
  },
  { id: 12, text: "Consider additional Safety Officers for each operation" },
  { id: 13, text: "Request additional EMS resources / ambulances" },
  {
    id: 14,
    text: "Request specialized resources if needed / Technical Rescue",
  },
  { id: 15, text: "Conduct emergency evacuation if ordered" },
  { id: 16, text: "PAR after Rescue Operation is completed" },
  { id: 17, text: "Declare end of MAYDAY", critical: true },
];

const NOTES_FIELDS = [
  { id: 1, label: "Par Report" },
  { id: 2, label: "Member Missing / Location" },
  { id: 3, label: "Pass Command of Fire (1)" },
  { id: 4, label: "Establish RIT Branch (2)" },
  { id: 5, label: "2nd Alarm for RIT Teams" },
  { id: 6, label: "Note Time RIT Makes Entry", isRIT: true },
  { id: 7, label: "Give Updates / Medical Branch" },
  { id: 8, label: "Victim Conditions" },
  { id: 9, label: "Victim Conversion / Exit" },
  { id: 10, label: "Conduct PAR — RIT Teams" },
  { id: 11, label: "Notify Fire Command & Terminate RIT Branch" },
  { id: 12, label: "Heads-Up Display", isHUD: true },
];

// Fallback static lists used only when no incident units are passed in
const FALLBACK_UNITS = ["E1", "E2", "E3", "E4", "S5", "R6", "E7", "E8", "L1", "L2"];
const FALLBACK_RIT   = ["RIT 1", "RIT 2", "RIT 3", "RIT 4", "RIT 5", "RIT 6"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatElapsed(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad(m)}:${pad(s)}`;
}

function now24() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ count, max }) {
  const pct = max ? (count / max) * 100 : 0;
  const color = pct === 100 ? "#16a34a" : pct >= 50 ? "#ca8a04" : "#6b7280";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 99,
        background: color,
        color: "#fff",
        marginLeft: 6,
      }}
    >
      {count}/{max}
    </span>
  );
}

// ─── Tab: IC Tactical Checklist ──────────────────────────────────────────────

function ChecklistTab({ checked, onToggle, onGoLIPS }) {
  const done = Object.values(checked).filter(Boolean).length;
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111" }}>
          IC Tactical Worksheet — MAYDAY
        </h2>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {done} / {CHECKLIST_ITEMS.length} complete
        </span>
      </div>

      {CHECKLIST_ITEMS.map((item) => {
        const isChecked = !!checked[item.id];
        return (
          <div
            key={item.id}
            onClick={() => onToggle(item.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "11px 14px",
              marginBottom: 6,
              borderRadius: 8,
              cursor: "pointer",
              background: isChecked
                ? "#f0fdf4"
                : item.critical
                  ? "#fff7f7"
                  : "#fafafa",
              border: `1px solid ${isChecked ? "#bbf7d0" : item.critical ? "#fecaca" : "#e5e7eb"}`,
              transition: "all .15s",
            }}
          >
            {/* Checkbox */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                flexShrink: 0,
                marginTop: 1,
                border: `2px solid ${isChecked ? "#16a34a" : item.critical ? "#ef4444" : "#d1d5db"}`,
                background: isChecked ? "#16a34a" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isChecked && (
                <svg width='13' height='13' viewBox='0 0 13 13' fill='none'>
                  <polyline
                    points='2,7 5,10 11,3'
                    stroke='#fff'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 13.5,
                  color: isChecked ? "#6b7280" : "#111",
                  textDecoration: isChecked ? "line-through" : "none",
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{ color: "#9ca3af", marginRight: 6, fontSize: 12 }}
                >
                  {item.id}.
                </span>
                {item.text}
              </span>
              {item.critical && !isChecked && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    color: "#dc2626",
                    background: "#fee2e2",
                    padding: "1px 6px",
                    borderRadius: 4,
                    marginLeft: 8,
                  }}
                >
                  CRITICAL
                </span>
              )}
              {item.hasLIPS && !isChecked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoLIPS();
                  }}
                  style={{
                    marginLeft: 10,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid #3b82f6",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Open LIPS →
                </button>
              )}
            </div>
          </div>
        );
      })}

      {done === CHECKLIST_ITEMS.length && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 10,
            background: "#f0fdf4",
            border: "1px solid #86efac",
            textAlign: "center",
            color: "#15803d",
            fontWeight: 700,
          }}
        >
          ✓ All checklist items complete — MAYDAY operations concluded
        </div>
      )}
    </div>
  );
}

// ─── Tab: LIPS Info Capture ───────────────────────────────────────────────────

function LIPSTab({ lips, onChange }) {
  const fields = [
    {
      key: "location",
      label: "L — Location",
      placeholder: "Floor, room, quadrant, or last known position",
      icon: "📍",
    },
    {
      key: "identification",
      label: "I — Identification",
      placeholder: "Name, unit, SCBA ID, company",
      icon: "🪪",
    },
    {
      key: "problem",
      label: "P — Problem",
      placeholder: "Entrapment, lost, low air, injury…",
      icon: "⚠️",
    },
    {
      key: "solution",
      label: "S — Solution",
      placeholder: "Actions taken / assistance needed",
      icon: "🛟",
    },
  ];

  return (
    <div>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: 16,
          fontWeight: 700,
          color: "#111",
        }}
      >
        LIPS — Downed Firefighter Info
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6b7280" }}>
        Capture LIPS data from the MAYDAY transmission as quickly as possible.
      </p>

      {fields.map(({ key, label, placeholder, icon }) => (
        <div key={key} style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              marginBottom: 5,
            }}
          >
            {icon} {label}
          </label>
          <textarea
            value={lips[key]}
            onChange={(e) => onChange(key, e.target.value)}
            placeholder={placeholder}
            rows={2}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1.5px solid #d1d5db",
              fontSize: 14,
              resize: "vertical",
              fontFamily: "inherit",
              background: "#fff",
              color: "#111",
              outline: "none",
              transition: "border .15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
          />
        </div>
      ))}

      {/* Summary card */}
      {(lips.location ||
        lips.identification ||
        lips.problem ||
        lips.solution) && (
        <div
          style={{
            marginTop: 8,
            padding: 16,
            borderRadius: 10,
            background: "#fefce8",
            border: "1px solid #fde68a",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              color: "#92400e",
              marginBottom: 8,
            }}
          >
            LIPS SUMMARY
          </div>
          {["location", "identification", "problem", "solution"].map(
            (k, i) =>
              lips[k] && (
                <div key={k} style={{ fontSize: 13, marginBottom: 4 }}>
                  <strong style={{ color: "#92400e" }}>{"LIPS"[i]}:</strong>{" "}
                  <span style={{ color: "#111" }}>{lips[k]}</span>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: MAYDAY Notes ────────────────────────────────────────────────────────

const HUD_STATES = [
  { label: "Full", sub: "2 green", color: "#16a34a" },
  { label: "3/4", sub: "1 green", color: "#4ade80" },
  { label: "1/2", sub: "flashing yellow", color: "#ca8a04" },
  { label: "1/4", sub: "flashing red", color: "#dc2626" },
];

function NotesTab({ notes, onNoteChange, ritTimes, onRitTime }) {
  const [hud, setHud] = useState(null);

  return (
    <div>
      <h2
        style={{
          margin: "0 0 18px",
          fontSize: 16,
          fontWeight: 700,
          color: "#111",
        }}
      >
        MAYDAY Notes
      </h2>

      {NOTES_FIELDS.map((field) => (
        <div key={field.id} style={{ marginBottom: 14 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "#9ca3af", marginRight: 5 }}>
              {field.id}.
            </span>
            {field.label}
          </label>

          {field.isRIT ? (
            <div
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 10,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {["RIT 1", "RIT 2", "RIT 3", "RIT 4"].map((r) => (
                <div
                  key={r}
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#374151",
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                    }}
                  >
                    {r}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <input
                      type='text'
                      placeholder='--:--'
                      value={ritTimes[r] || ""}
                      onChange={(e) => onRitTime(r, e.target.value)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "5px 8px",
                        borderRadius: 6,
                        border: "1.5px solid #d1d5db",
                        fontSize: 13,
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={() => onRitTime(r, now24().slice(0, 5))}
                      title="Log current time"
                      style={{
                        padding: "5px 7px",
                        borderRadius: 6,
                        border: "1px solid #3b82f6",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontSize: 10,
                        cursor: "pointer",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      NOW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : field.isHUD ? (
            <div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                {HUD_STATES.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setHud(hud === s.label ? null : s.label)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      border: `2px solid ${s.color}`,
                      background: hud === s.label ? s.color : "#fff",
                      color: hud === s.label ? "#fff" : s.color,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all .15s",
                    }}
                  >
                    {s.label}
                    <span
                      style={{
                        display: "block",
                        fontSize: 10,
                        fontWeight: 400,
                        opacity: 0.85,
                      }}
                    >
                      {s.sub}
                    </span>
                  </button>
                ))}
              </div>
              {hud && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                  Current HUD: <strong style={{ color: "#111" }}>{hud}</strong>
                  {" — "}
                  {HUD_STATES.find((s) => s.label === hud)?.sub}
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={notes[field.id] || ""}
              onChange={(e) => onNoteChange(field.id, e.target.value)}
              rows={2}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1.5px solid #d1d5db",
                fontSize: 13.5,
                resize: "vertical",
                fontFamily: "inherit",
                background: "#fff",
                color: "#111",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Unit Tracking Board ─────────────────────────────────────────────────

function BoardTab({
  unitData,
  onUnitChange,
  ritData,
  onRitChange,
  downFF,
  onDownFF,
  fireLocation,
  onFireLocation,
  boardNotes,
  onBoardNotes,
  incidentUnits = [],
}) {
  // Use real incident units if available, else fall back to static list
  const unitNames = incidentUnits.length > 0
    ? incidentUnits.filter(u => !['available','out_of_service'].includes(u.status)).map(u => u.unit_name)
    : FALLBACK_UNITS;
  const ritNames = incidentUnits.filter(u => u.assignment === 'rit').map(u => u.unit_name);
  const displayRit = ritNames.length > 0 ? ritNames : FALLBACK_RIT;
  function cellInput(value, onChange, placeholder = "", width = 72) {
    return (
      <input
        type='text'
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width,
          padding: "4px 6px",
          borderRadius: 5,
          border: "1px solid #d1d5db",
          fontSize: 12,
          fontFamily: "inherit",
          textAlign: "center",
          background: "#fff",
        }}
      />
    );
  }

  function nowBtn(onChange) {
    return (
      <button
        onClick={() => onChange(now24().slice(0, 5))}
        title='Log current time'
        style={{
          padding: "3px 6px",
          borderRadius: 5,
          border: "1px solid #9ca3af",
          background: "#f3f4f6",
          fontSize: 10,
          cursor: "pointer",
          color: "#374151",
          fontWeight: 700,
        }}
      >
        NOW
      </button>
    );
  }

  const thStyle = {
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    color: "#6b7280",
    borderBottom: "2px solid #e5e7eb",
    background: "#f9fafb",
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "6px 8px",
    borderBottom: "1px solid #f3f4f6",
    textAlign: "center",
  };

  return (
    <div>
      <h2
        style={{
          margin: "0 0 18px",
          fontSize: 16,
          fontWeight: 700,
          color: "#111",
        }}
      >
        Unit Tracking Board
      </h2>

      {/* ── Unit Accountability ── */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 12,
          color: "#374151",
          letterSpacing: 0.5,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        Unit Accountability
      </div>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table
          style={{ borderCollapse: "collapse", width: "100%", minWidth: 480 }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Unit</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>PAR ✓</th>
              <th style={thStyle}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {unitNames.map((unit) => {
              const d = unitData[unit] || {};
              return (
                <tr
                  key={unit}
                  style={{ background: d.par ? "#f0fdf4" : "#fff" }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      textAlign: "left",
                      color: "#374151",
                    }}
                  >
                    {unit}
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        justifyContent: "center",
                      }}
                    >
                      {cellInput(
                        d.time,
                        (v) => onUnitChange(unit, "time", v),
                        "--:--",
                        68,
                      )}
                      {nowBtn((v) => onUnitChange(unit, "time", v))}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <input
                      type='checkbox'
                      checked={!!d.par}
                      onChange={(e) =>
                        onUnitChange(unit, "par", e.target.checked)
                      }
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                        accentColor: "#16a34a",
                      }}
                    />
                  </td>
                  <td style={tdStyle}>
                    {cellInput(
                      d.notes,
                      (v) => onUnitChange(unit, "notes", v),
                      "notes…",
                      120,
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── RIT Tracking ── */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 12,
          color: "#374151",
          letterSpacing: 0.5,
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        RIT Team Tracking
      </div>
      <div style={{ overflowX: "auto", marginBottom: 24 }}>
        <table
          style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Team</th>
              <th style={thStyle}>Entry Time</th>
              <th style={thStyle}>PAR ✓</th>
              <th style={thStyle}>Air ON</th>
              <th style={thStyle}>Air OFF</th>
            </tr>
          </thead>
          <tbody>
            {displayRit.map((rit) => {
              const d = ritData[rit] || {};
              return (
                <tr
                  key={rit}
                  style={{ background: d.par ? "#f0fdf4" : "#fff" }}
                >
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 700,
                      textAlign: "left",
                      color: "#374151",
                    }}
                  >
                    {rit}
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        justifyContent: "center",
                      }}
                    >
                      {cellInput(
                        d.time,
                        (v) => onRitChange(rit, "time", v),
                        "--:--",
                        68,
                      )}
                      {nowBtn((v) => onRitChange(rit, "time", v))}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <input
                      type='checkbox'
                      checked={!!d.par}
                      onChange={(e) =>
                        onRitChange(rit, "par", e.target.checked)
                      }
                      style={{
                        width: 18,
                        height: 18,
                        cursor: "pointer",
                        accentColor: "#16a34a",
                      }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        justifyContent: "center",
                      }}
                    >
                      {cellInput(
                        d.airOn,
                        (v) => onRitChange(rit, "airOn", v),
                        "--:--",
                        68,
                      )}
                      {nowBtn((v) => onRitChange(rit, "airOn", v))}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        justifyContent: "center",
                      }}
                    >
                      {cellInput(
                        d.airOff,
                        (v) => onRitChange(rit, "airOff", v),
                        "--:--",
                        68,
                      )}
                      {nowBtn((v) => onRitChange(rit, "airOff", v))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Down Firefighter LIPS ── */}
      <div
        style={{
          background: "#fff7f7",
          border: "1px solid #fecaca",
          borderRadius: 10,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 12,
            color: "#dc2626",
            letterSpacing: 0.5,
            marginBottom: 10,
            textTransform: "uppercase",
          }}
        >
          ▼ Down Firefighter — LIPS Quick Reference
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {[
            ["L", "Location"],
            ["I", "Identification"],
            ["P", "Problem"],
            ["S", "Solution"],
          ].map(([letter, label]) => (
            <div key={letter}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#7f1d1d",
                  display: "block",
                  marginBottom: 3,
                }}
              >
                {letter} — {label}
              </label>
              <input
                type='text'
                value={downFF[letter] || ""}
                onChange={(e) => onDownFF(letter, e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "7px 10px",
                  borderRadius: 7,
                  border: "1.5px solid #fca5a5",
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Fire Location + Notes ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              display: "block",
              marginBottom: 5,
            }}
          >
            🏠 Fire Location
          </label>
          <textarea
            rows={3}
            value={fireLocation}
            onChange={(e) => onFireLocation(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1.5px solid #d1d5db",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              display: "block",
              marginBottom: 5,
            }}
          >
            📋 Notes
          </label>
          <textarea
            rows={3}
            value={boardNotes}
            onChange={(e) => onBoardNotes(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px",
              borderRadius: 8,
              border: "1.5px solid #d1d5db",
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MaydayCommand({ onActiveChange, units = [], onUpdateUnit, deptName = 'Fire Department' } = {}) {
  const [activeTab, setActiveTab] = useState("checklist");
  const [isActive, setIsActive] = useState(false);
  const [maydayTime, setMaydayTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [checklist, setChecklist] = useState({});
  const [lips, setLips] = useState({
    location: "",
    identification: "",
    problem: "",
    solution: "",
  });
  const [notes, setNotes] = useState({});
  const [ritTimes, setRitTimes] = useState({});
  const [unitData, setUnitData] = useState({});
  const [ritData, setRitData] = useState({});
  const [downFF, setDownFF] = useState({ L: "", I: "", P: "", S: "" });
  const [fireLocation, setFireLocation] = useState("");
  const [boardNotes, setBoardNotes] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [maydayUnit, setMaydayUnit] = useState(null); // the unit in distress
  const intervalRef = useRef(null);

  // ── Timer ──
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  // ── Notify parent when active state changes ──
  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive]);

  // ── Activate MAYDAY ──
  function activateMayday() {
    setShowUnitPicker(true); // prompt for which unit is in distress
  }

  function confirmActivate(unit) {
    setShowUnitPicker(false);
    setMaydayUnit(unit || null);
    setIsActive(true);
    setMaydayTime(now24());
    setElapsed(0);

    if (unit) {
      // Mark unit as MAYDAY in the DB
      onUpdateUnit?.(unit, { status: 'mayday' });
      // Auto-populate LIPS with last known info
      const loc = [unit.floor, unit.assignment].filter(Boolean).join(' / ') || 'Unknown';
      setLips(p => ({
        ...p,
        location: p.location || loc,
        identification: p.identification || unit.unit_name,
      }));
    }
  }

  // ── Reset ──
  function resetAll() {
    // Restore mayday unit to on_scene
    if (maydayUnit) {
      onUpdateUnit?.(maydayUnit, { status: 'on_scene' });
    }
    setIsActive(false);
    setMaydayTime(null);
    setElapsed(0);
    setChecklist({});
    setLips({ location: "", identification: "", problem: "", solution: "" });
    setNotes({});
    setRitTimes({});
    setUnitData({});
    setRitData({});
    setDownFF({ L: "", I: "", P: "", S: "" });
    setFireLocation("");
    setBoardNotes("");
    setMaydayUnit(null);
    setShowReset(false);
  }

  // ── Checklist ──
  function toggleCheck(id) {
    setChecklist((p) => ({ ...p, [id]: !p[id] }));
  }

  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const notesDone = Object.values(notes).filter((v) => v?.trim()).length;

  // ── Unit / RIT data ──
  function handleUnitChange(unit, field, value) {
    setUnitData((p) => ({ ...p, [unit]: { ...p[unit], [field]: value } }));
  }
  function handleRitChange(rit, field, value) {
    setRitData((p) => ({ ...p, [rit]: { ...p[rit], [field]: value } }));
  }

  const TABS = [
    {
      id: "checklist",
      label: "IC Checklist",
      badge: [checklistDone, CHECKLIST_ITEMS.length],
    },
    { id: "lips", label: "LIPS Info" },
    {
      id: "notes",
      label: "MAYDAY Notes",
      badge: [notesDone, NOTES_FIELDS.length],
    },
    { id: "board", label: "Tracking Board" },
  ];

  // ── Status bar color ──
  const statusBg = isActive ? "#dc2626" : "#1f2937";

  // Units available to select as the MAYDAY unit (on scene / working)
  const pickableUnits = units.filter(u =>
    ['on_scene','working','par','dispatched','responding','staging'].includes(u.status)
  );

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#ffffff",
        color: "#111111",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* ════ STATUS HEADER ════ */}
      <div
        style={{
          background: statusBg,
          color: "#fff",
          padding: "16px 20px",
          transition: "background .3s",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1,
                opacity: 0.8,
                textTransform: "uppercase",
              }}
            >
              {deptName} — Fire Command AI
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 0.5,
                marginTop: 2,
              }}
            >
              {isActive ? "🚨 MAYDAY ACTIVE" : "MAYDAY COMMAND"}
            </div>
            {isActive && (
              <div style={{ marginTop: 8 }}>
                {maydayUnit && (
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#fca5a5", marginBottom: 4, letterSpacing: 0.3 }}>
                    ▼ {maydayUnit.unit_name}
                    {maydayUnit.floor ? ` — Floor ${maydayUnit.floor}` : ''}
                    {maydayUnit.assignment ? ` / ${maydayUnit.assignment.replace(/_/g,' ').toUpperCase()}` : ''}
                  </div>
                )}
                {/* Big elapsed timer */}
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                    fontFamily: "monospace",
                    letterSpacing: 2,
                    lineHeight: 1,
                    color: "#fff",
                  }}
                >
                  {formatElapsed(elapsed)}
                </div>
                {/* Declared time underneath */}
                <div
                  style={{
                    fontSize: 12,
                    marginTop: 4,
                    color: "rgba(255,255,255,0.75)",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  Declared {maydayTime}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {!isActive ? (
              <button
                onClick={activateMayday}
                style={{
                  padding: "12px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: "pointer",
                  letterSpacing: 0.5,
                  boxShadow: "0 2px 8px rgba(0,0,0,.3)",
                }}
              >
                🚨 ACTIVATE MAYDAY
              </button>
            ) : (
              <button
                onClick={() => setShowReset(true)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "2px solid rgba(255,255,255,.6)",
                  background: "transparent",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                End / Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ════ TAB BAR ════ */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #e5e7eb",
          background: "#f9fafb",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "13px 20px",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "3px solid #dc2626"
                  : "3px solid transparent",
              background: "transparent",
              fontSize: 13.5,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? "#dc2626" : "#6b7280",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
            }}
          >
            {tab.label}
            {tab.badge && <Badge count={tab.badge[0]} max={tab.badge[1]} />}
          </button>
        ))}
      </div>

      {/* ════ TAB CONTENT ════ */}
      <div style={{ padding: "20px 20px 40px" }}>
        {activeTab === "checklist" && (
          <ChecklistTab
            checked={checklist}
            onToggle={toggleCheck}
            onGoLIPS={() => setActiveTab("lips")}
          />
        )}
        {activeTab === "lips" && (
          <LIPSTab
            lips={lips}
            onChange={(key, val) => setLips((p) => ({ ...p, [key]: val }))}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab
            notes={notes}
            onNoteChange={(id, val) => setNotes((p) => ({ ...p, [id]: val }))}
            ritTimes={ritTimes}
            onRitTime={(r, v) => setRitTimes((p) => ({ ...p, [r]: v }))}
          />
        )}
        {activeTab === "board" && (
          <BoardTab
            unitData={unitData}
            onUnitChange={handleUnitChange}
            ritData={ritData}
            onRitChange={handleRitChange}
            downFF={downFF}
            onDownFF={(k, v) => setDownFF((p) => ({ ...p, [k]: v }))}
            fireLocation={fireLocation}
            onFireLocation={setFireLocation}
            boardNotes={boardNotes}
            onBoardNotes={setBoardNotes}
            incidentUnits={units}
          />
        )}
      </div>

      {/* ════ UNIT PICKER MODAL — shown before MAYDAY activates ════ */}
      {showUnitPicker && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,.65)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 400, width: "90%", boxShadow: "0 10px 40px rgba(0,0,0,.3)" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626", marginBottom: 4 }}>🚨 MAYDAY — Which unit?</div>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>
              Select the unit declaring MAYDAY, or skip if unknown.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
              {pickableUnits.length > 0 ? pickableUnits.map(u => (
                <button
                  key={u.id}
                  onClick={() => confirmActivate(u)}
                  style={{
                    padding: "10px 14px", borderRadius: 8, border: "2px solid #fca5a5",
                    background: "#fff7f7", cursor: "pointer", textAlign: "left",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{u.unit_name}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>
                    {u.floor ? `Floor ${u.floor} · ` : ''}{u.assignment?.replace(/_/g,' ') || u.status}
                  </span>
                </button>
              )) : (
                <p style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>No on-scene units found</p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => confirmActivate(null)}
                style={{ flex: 1, padding: 12, borderRadius: 8, border: "1.5px solid #d1d5db", background: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", color: "#374151" }}
              >
                Skip — Unit Unknown
              </button>
              <button
                onClick={() => setShowUnitPicker(false)}
                style={{ padding: "12px 16px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "#f9fafb", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#6b7280" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ RESET CONFIRM MODAL ════ */}
      {showReset && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 28,
              maxWidth: 360,
              width: "90%",
              boxShadow: "0 10px 40px rgba(0,0,0,.2)",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
              End MAYDAY?
            </div>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 20px" }}>
              This will clear all MAYDAY data including the checklist, LIPS
              info, notes, and tracking board.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={resetAll}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                End &amp; Reset
              </button>
              <button
                onClick={() => setShowReset(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: "1.5px solid #d1d5db",
                  background: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
