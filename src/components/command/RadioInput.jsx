import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Send, Loader2, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const TOWN_MAP = [
  { pattern: /\b(waltham|wal)\b/gi,   prefix: 'WAL' },
  { pattern: /\b(watertown|wat)\b/gi, prefix: 'WAT' },
  { pattern: /\b(belmont|bel)\b/gi,   prefix: 'BEL' },
  { pattern: /\b(cambridge|cam)\b/gi, prefix: 'CAM' },
  { pattern: /\b(wellesley|wel)\b/gi, prefix: 'WEL' },
  { pattern: /\b(newton|new)\b/gi,    prefix: 'NEW' },
  { pattern: /\b(lincoln|lin)\b/gi,   prefix: 'LIN' },
  { pattern: /\b(lexington|lex)\b/gi, prefix: 'LEX' },
  { pattern: /\b(arlington|arl)\b/gi, prefix: 'ARL' },
  { pattern: /\b(armstrong)\b/gi,     prefix: 'ARM' },
];

// Fix common speech-to-text mishears for fire radio context
const SPEECH_FIXES = [
  // Phonetic number corrections
  [/\bniner\b/gi, '9'],
  [/\btree\b/gi, '3'],
  [/\bfower\b/gi, '4'],
  // Unit shorthand expansion
  [/\bE(\d)\b/g, 'Engine $1'],
  [/\bT(\d)\b/g, 'Truck $1'],
  [/\bR(\d)\b/g, 'Rescue $1'],
  [/\bL(\d)\b/g, 'Truck $1'],        // Ladder → Truck
  [/\bladder\b/gi, 'Truck'],          // "ladder" misheard
  // ICS phonetic alphabet → Division labels
  [/\balpha\s+(?:side|division)?\b/gi, 'Division A'],
  [/\bbravo\s+(?:side|division)?\b/gi, 'Division B'],
  [/\bcharlie\s+(?:side|division)?\b/gi, 'Division C'],
  [/\bdelta\s+(?:side|division)?\b/gi, 'Division D'],
  // Common status mishears
  [/\bmay\s+day\b/gi, 'MAYDAY'],
  [/\bon\s+seen\b/gi, 'on scene'],
  [/\bon\s+the\s+seen\b/gi, 'on scene'],
  [/\bworking\s+fire\b/gi, 'working fire'],
  [/\ben\s+route\b/gi, 'en route'],
  [/\brap(?:id)?\s*intervention\b/gi, 'RIT'],
  [/\bwater\s+supply\b/gi, 'water supply'],
  [/\bvent(?:ilation)?\b/gi, 'ventilation'],
  [/\brehab(?:ilitation)?\b/gi, 'rehab'],
  [/\bstag(?:ing)?\b/gi, 'staging'],
];

function normalizeSpeech(text) {
  let result = text;
  SPEECH_FIXES.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });
  TOWN_MAP.forEach(({ pattern, prefix }) => {
    result = result.replace(pattern, prefix);
  });
  return result;
}

// For typing in the text box — only town normalization, no aggressive word replacement
function normalizeTyped(text) {
  let result = text;
  TOWN_MAP.forEach(({ pattern, prefix }) => {
    result = result.replace(pattern, prefix);
  });
  return result;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    from_unit: { type: 'string' },
    to_unit: { type: 'string' },
    priority: { type: 'string', enum: ['routine', 'urgent', 'emergency', 'mayday'] },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          unit_name: { type: 'string' },
          changes: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              assignment: { type: 'string' },
              set_air_time: { type: 'boolean' },
              personnel_count: { type: 'number' },
              officer: { type: 'string' },
              floor: { type: 'string' }
            }
          }
        }
      }
    },
    new_units: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          unit_name: { type: 'string' },
          unit_type: { type: 'string' },
          status: { type: 'string' },
          assignment: { type: 'string' },
          notes: { type: 'string' }
        }
      }
    },
    upgrade_alarm: { type: 'string' },
    summary: { type: 'string' }
  }
};

function buildPrompt(correctionExamples, transmission, units) {
  return `You are an expert fire department radio traffic parser for an Incident Command System (ICS) tactical board.
${correctionExamples}
CURRENT UNITS ON SCENE (match against these exactly — use fuzzy matching for spoken/spelled variants):
${units.map(u => `  - "${u.unit_name}" (type: ${u.unit_type}${u.alarm_level ? `, alarm_level: ${u.alarm_level}` : ''})`).join('\n')}

RADIO TRANSMISSION TO PARSE:
"${transmission}"

SPEECH-TO-TEXT CONTEXT: This transmission may have come from voice recognition. Common mishears to account for:
- "seen" or "the seen" → "scene" (on scene)
- "fower" → 4, "niner" → 9, "tree" → 3
- "may day" → MAYDAY
- "alpha/bravo/charlie/delta" → Division A/B/C/D
- "ladder" → Truck, "E1" → Engine 1, "T2" → Truck 2
- Number words: one=1, two=2, three=3, four=4, five=5, six=6, seven=7, eight=8, nine=9, ten=10
- "en route" may sound like "and route" or "inroute"
- "working" may sound like "working fire" context clue

MUTUAL AID TOWN ABBREVIATION RULES (apply when a town/city name is spoken with a unit):
- "Watertown" / "Wat" → prefix "WAT" (e.g. "Watertown Engine 2" → unit_name: "WAT Engine 2", unit_type: engine)
- "Belmont" / "Bel" → prefix "BEL"
- "Cambridge" / "Cam" → prefix "CAM"
- "Wellesley" / "Wel" → prefix "WEL"
- "Newton" / "New" → prefix "NEW"
- "Lincoln" / "Lin" → prefix "LIN"
- "Lexington" / "Lex" → prefix "LEX"
- "Arlington" / "Arl" → prefix "ARL"
- "Armstrong" → prefix "ARM" — private BLS/ALS ambulance company. "ARM BLS", "ARM Medic", "ARM FS2"
- Apply this same pattern to any other town/city name spoken — abbreviate to first 3 uppercase letters as prefix
- Always add notes: "Mutual Aid — [full town name]" on the new unit
- CRITICAL: Town-prefixed units are ALWAYS new mutual aid units — never match "ARL Engine 2" to existing "Engine 2"

WALTHAM HOME DEPARTMENT RULES — CRITICAL:
- Waltham is the HOME department. Units WITHOUT a town prefix are Waltham units (may also appear as "WAL Engine 1" etc.)
- Units WITH a non-WAL town prefix are MUTUAL AID units.
- When creating/identifying Waltham units, always use "WAL" prefix format: "WAL Engine 1", "WAL Truck 1", etc.
- If a unit exists without WAL prefix (e.g. "Engine 1"), treat it as the same as "WAL Engine 1"

ALARM UPGRADE RULES — CRITICAL:
- "strike a 2nd alarm" / "transmit a 2nd alarm" / "go to 2nd alarm" / "request 2nd alarm" → set upgrade_alarm: "2nd_alarm"
- "strike a 3rd alarm" / "go to 3rd alarm" / "request 3rd alarm" → set upgrade_alarm: "3rd_alarm"
- "4th alarm" → upgrade_alarm: "4th_alarm" | "5th alarm" → upgrade_alarm: "5th_alarm"
- Only upgrade, never downgrade. Valid values: "2nd_alarm", "3rd_alarm", "4th_alarm", "5th_alarm", "task_force", "strike_team"

BULK STATUS UPDATE RULES — CRITICAL:
- "all 1st alarm companies on scene" / "all first alarm on scene" → on_scene for ALL units with alarm_level: 1st_alarm OR no town prefix. One action per unit.
- "all 1st alarm companies working" → working for every unit with alarm_level: 1st_alarm OR no town prefix
- "all 2nd alarm on scene" → on_scene for ALL units with alarm_level: 2nd_alarm. One action per unit.
- "all units on scene" / "everyone on scene" → update ALL units to on_scene
- ALWAYS emit one action entry per matching unit — never a single generic action

CRITICAL UNIT NAME MATCHING RULES:
- Always match spoken variants to the closest existing unit name
- "E-4" / "E4" → "Engine 4"; "T-1" / "T1" → "Truck 1"; "R-2" / "R2" → "Rescue 2"
- Only create a NEW unit (in new_units) if there is clearly NO match in the current units list

ASSIGNMENT MAPPING:
- "Division A" / "Alpha side" / "A side" → division_a
- "Division B" / "Bravo side" / "B side" → division_b
- "Division C" / "Charlie side" / "C side" → division_c
- "Division D" / "Delta side" / "D side" → division_d
- "interior" / "going interior" → interior
- "roof" / "going to the roof" → roof
- "RIT" / "rapid intervention" → rit
- "rehab" → rehab (also set status: rehab)
- "staging" → staging | "ventilation" / "vent" → ventilation
- "water supply" / "on hydrant" / "catching a plug" → water_supply
- "search" / "primary search" → search
- "medical group" / "treatment" / "triage" → medical
- "exposure" → exposure

STATUS MAPPING:
- "on scene" / "on location" / "arriving" / "pulling up" / "on the box" / "just arrived" / "at the address" / "at scene" → on_scene
- ARRIVAL DETECTION: Any phrase where a unit reports physically arriving should set status to on_scene
- "working" / "working fire" / "we have a worker" / "fire showing" → working
- "on air" / "going on air" / "masking up" / "bottles on" → set_air_time: true, status: working
- "PAR" / "PAR complete" / "all accounted for" → par
- "MAYDAY" → mayday (HIGHEST PRIORITY)
- "available" / "in service" / "back in service" → available
- "out of service" / "OOS" → out_of_service
- "responding" / "en route" → responding

FLOOR MAPPING:
- "first floor" / "1st floor" → "1st Floor" | "second floor" → "2nd Floor" | "third floor" → "3rd Floor"
- "fourth floor" → "4th Floor" | "fifth floor" → "5th Floor" | "basement" → "Basement" | "lobby" → "Lobby"

Respond with this exact JSON structure:
{
  "from_unit": "exact unit name from list or null",
  "to_unit": "exact unit name from list or null",
  "priority": "routine|urgent|emergency|mayday",
  "actions": [{ "unit_name": "exact name", "changes": { "status": null, "assignment": null, "floor": null, "set_air_time": false, "personnel_count": null, "officer": null } }],
  "new_units": [{ "unit_name": "name", "unit_type": "engine|truck|rescue|squad|deputy|medic|tanker|brush|hazmat|other", "status": "status", "assignment": "unassigned", "notes": null }],
  "upgrade_alarm": null,
  "summary": "one sentence summary"
}`;
}

export default function RadioInput({ incidentId, units, onTransmission }) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMayday, setIsMayday] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [autoSubmitPending, setAutoSubmitPending] = useState(false);
  const [listenError, setListenError] = useState('');
  const recognitionRef = useRef(null);
  const isMaydayRef = useRef(isMayday);
  const [corrections, setCorrections] = useState([]);

  useEffect(() => { isMaydayRef.current = isMayday; }, [isMayday]);

  useEffect(() => {
    base44.entities.TerminologyCorrection.list('-created_date', 50)
      .then(data => setCorrections(data || []))
      .catch(() => {});
  }, []);

  // Auto-submit when voice recognition ends and there's a message
  useEffect(() => {
    if (autoSubmitPending && message.trim() && !isProcessing) {
      setAutoSubmitPending(false);
      doSubmit(message);
    }
  }, [autoSubmitPending, message]);

  const hasSpeech = !!SpeechRecognition;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const startListening = () => {
    if (!hasSpeech) {
      setListenError('Speech recognition not supported in this browser. On iPad, use Safari.');
      return;
    }
    setListenError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = !isIOS;
    recognition.maxAlternatives = 3;

    // Expanded grammar hints (Chrome only — ignored elsewhere)
    if ('SpeechGrammarList' in window) {
      const grammar = `#JSGF V1.0; grammar fire;
        public <unit> = Engine | Truck | Rescue | Squad | Medic | Tower | Tanker | Hazmat | Car;
        public <assign> = Division A | Division B | Division C | Division D | interior | roof | RIT | rehab | staging | ventilation | water supply | search | medical | exposure;
        public <status> = on scene | working | working fire | responding | en route | available | PAR | MAYDAY | out of service | rehab;
        public <alarm> = first alarm | second alarm | third alarm | 2nd alarm | 3rd alarm | 4th alarm | 5th alarm | strike team | task force;
        public <fire> = <unit> | <assign> | <status> | <alarm>;`;
      try {
        const gl = new window.SpeechGrammarList();
        gl.addFromString(grammar, 1);
        recognition.grammars = gl;
      } catch (e) { /* not supported */ }
    }

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      const FIRE_TERMS = /\b(engine|truck|rescue|medic|squad|tower|division|alarm|scene|working|mayday|rit|rehab|staging|ventilation|interior|roof|water supply|search|medical|exposure|responding|en route|available|par)\b/i;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        // Pick best alternative — prefer one containing known fire terms
        let best = result[0].transcript;
        for (let j = 1; j < result.length; j++) {
          const alt = result[j].transcript;
          if (FIRE_TERMS.test(alt) && !FIRE_TERMS.test(best)) best = alt;
        }
        if (result.isFinal) finalTranscript += best;
        else interimTranscript += best;
      }

      if (finalTranscript) {
        setInterimText('');
        setMessage(prev => {
          const base = isIOS && prev ? (prev.trimEnd() + ' ') : '';
          return normalizeSpeech(isIOS ? base + finalTranscript : finalTranscript);
        });
      } else if (interimTranscript) {
        setInterimText(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') { setIsListening(false); return; }
      setListenError(event.error === 'not-allowed'
        ? 'Microphone access denied. Allow mic in browser settings.'
        : `Mic error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
      recognitionRef.current = null;
      // Auto-submit 600ms after mic stops
      setTimeout(() => setAutoSubmitPending(true), 600);
    };

    recognitionRef.current = recognition;
    try { recognition.start(); }
    catch (e) {
      setListenError('Could not start microphone. Try tapping the mic button again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
    setInterimText('');
  };

  const doSubmit = async (msg) => {
    if (!msg.trim() || isProcessing) return;
    stopListening();
    setIsProcessing(true);

    const normalizedMessage = normalizeSpeech(msg);
    const finalMessage = isMaydayRef.current
      ? `MAYDAY MAYDAY MAYDAY — ${normalizedMessage}`
      : normalizedMessage;

    const correctionExamples = corrections.length > 0
      ? `\nLEARNED CORRECTIONS FROM THIS DEPARTMENT (apply these first — highest priority):\n` +
        corrections.map(c =>
          `  - "${c.raw_phrase}" → unit: ${c.correct_unit || '?'}, assignment: ${c.correct_assignment || '?'}, status: ${c.correct_status || '?'}` +
          (c.correct_summary ? ` (meaning: ${c.correct_summary})` : '')
        ).join('\n')
      : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: buildPrompt(correctionExamples, finalMessage, units),
      response_json_schema: RESPONSE_SCHEMA,
    });

    await onTransmission(finalMessage, result);
    setMessage('');
    setIsMayday(false);
    setIsProcessing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await doSubmit(message);
  };

  const displayValue = isListening && interimText
    ? message + (message ? ' ' : '') + interimText
    : message;

  return (
    <div className="flex flex-col gap-1.5">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">

        {/* MAYDAY toggle */}
        <Button
          type="button"
          variant={isMayday ? 'destructive' : 'ghost'}
          size="sm"
          onClick={() => setIsMayday(!isMayday)}
          className={`shrink-0 h-9 px-3 font-mono text-xs font-bold tracking-wider ${!isMayday ? 'text-muted-foreground border border-border/50 hover:border-red-500/50 hover:text-red-400' : 'animate-pulse'}`}
          title="Toggle MAYDAY"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline ml-1">MAYDAY</span>
        </Button>

        {/* Text input */}
        <div className="relative flex-1">
          {isListening ? (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-400 rounded-full animate-ping" />
          ) : (
            <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          )}
          <Input
            value={displayValue}
            onChange={(e) => setMessage(normalizeTyped(e.target.value))}
            placeholder={
              isListening
                ? 'Listening — speak your transmission...'
                : isMayday
                ? 'MAYDAY — describe the emergency...'
                : "Radio transmission  (e.g. 'Engine 2 Division A working')"
            }
            className={`pl-9 font-mono text-sm h-9 transition-all
              ${isMayday ? 'bg-red-950/40 border-red-500/50 text-red-200 placeholder:text-red-400/40' : 'bg-secondary/60 border-border/60'}
              ${isListening ? 'border-green-500/60 bg-green-950/20' : ''}
              ${interimText ? 'italic opacity-70' : ''}
            `}
            disabled={isProcessing}
          />
          {isProcessing && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Mic button */}
        {hasSpeech && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={`shrink-0 h-9 w-9 transition-all border
              ${isListening
                ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
                : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            title={isListening ? 'Stop & submit' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
        )}

        {/* Send button */}
        <Button
          type="submit"
          disabled={isProcessing || !message.trim()}
          size="sm"
          className="shrink-0 h-9 w-9 p-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>

      {listenError && (
        <p className="text-[11px] text-red-400 font-mono pl-1">{listenError}</p>
      )}
    </div>
  );
}