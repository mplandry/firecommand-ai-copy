import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Send, Loader2, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const TOWN_MAP = [
  { pattern: /\b(waltham|wal)\b/gi,              prefix: 'WAL' },
  { pattern: /\b(watertown|wat)\b/gi,            prefix: 'WAT' },
  { pattern: /\b(belmont|bel)\b/gi,              prefix: 'BEL' },
  { pattern: /\b(cambridge|cam)\b/gi,            prefix: 'CAM' },
  { pattern: /\b(wellesley|wel)\b/gi,            prefix: 'WEL' },
  { pattern: /\b(newton|new\s+ten|new\s+town)\b/gi, prefix: 'NEW' },
  { pattern: /\b(lincoln|lin)\b/gi,              prefix: 'LIN' },
  { pattern: /\b(lexington|lex)\b/gi,            prefix: 'LEX' },
  { pattern: /\b(arlington|arl)\b/gi,            prefix: 'ARL' },
  { pattern: /\b(armstrong|arm)\b/gi,            prefix: 'ARM' },
  { pattern: /\b(medford|med)\b/gi,              prefix: 'MED' },
  { pattern: /\b(malden|mal)\b/gi,               prefix: 'MAL' },
  { pattern: /\b(somerville|som)\b/gi,           prefix: 'SOM' },
  { pattern: /\b(everett|eve)\b/gi,              prefix: 'EVE' },
  { pattern: /\b(woburn|wob)\b/gi,               prefix: 'WOB' },
  { pattern: /\b(reading|rea)\b/gi,              prefix: 'REA' },
  { pattern: /\b(stoneham|sto)\b/gi,             prefix: 'STO' },
  { pattern: /\b(natick|nat)\b/gi,               prefix: 'NAT' },
  { pattern: /\b(needham|ned)\b/gi,              prefix: 'NED' },
  { pattern: /\b(dedham|ded)\b/gi,               prefix: 'DED' },
  { pattern: /\b(framingham|fra)\b/gi,           prefix: 'FRA' },
  { pattern: /\b(quincy|qui)\b/gi,               prefix: 'QUI' },
];

// Fix common speech-to-text mishears for fire radio context
const SPEECH_FIXES = [
  // ── Unit type mishears (must come before number word expansion) ──
  [/\blatter\b/gi,    'Ladder'],
  [/\bladder\b/gi,    'Ladder'],
  [/\blader\b/gi,     'Ladder'],
  [/\bladda\b/gi,     'Ladder'],
  [/\blater\b/gi,     'Ladder'],
  [/\bengine\b/gi,    'Engine'],
  [/\bengines\b/gi,   'Engine'],
  [/\brescue\b/gi,    'Rescue'],
  [/\bmedic\b/gi,     'Medic'],
  [/\btanker\b/gi,    'Tanker'],
  [/\btender\b/gi,    'Tanker'],
  [/\bbattalion\b/gi, 'Battalion'],
  [/\bsquad\b/gi,     'Squad'],

  // ── Spoken numbers after unit type — most common and safe to replace ──
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+one\b/gi,   '$1 1'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+two\b/gi,   '$1 2'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+three\b/gi, '$1 3'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+four\b/gi,  '$1 4'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+five\b/gi,  '$1 5'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+six\b/gi,   '$1 6'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+seven\b/gi, '$1 7'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+eight\b/gi, '$1 8'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+nine\b/gi,  '$1 9'],
  [/\b(Engine|Truck|Ladder|Rescue|Squad|Medic|Tanker|Tower|Car|Battalion|Deputy)\s+ten\b/gi,   '$1 10'],

  // ── Phonetic / radio number corrections ──
  [/\bniner\b/gi, '9'],
  [/\btree\b/gi,  '3'],
  [/\bfower\b/gi, '4'],

  // ── Unit shorthand expansion ──
  [/\bE(\d+)\b/g, 'Engine $1'],
  [/\bT(\d+)\b/g, 'Truck $1'],
  [/\bR(\d+)\b/g, 'Rescue $1'],
  [/\bL(\d+)\b/g, 'Ladder $1'],

  // ── ICS phonetic alphabet → Division labels ──
  [/\balpha\s*(?:side|division|div)?\b/gi,   'Division A'],
  [/\bbravo\s*(?:side|division|div)?\b/gi,   'Division B'],
  [/\bcharlie\s*(?:side|division|div)?\b/gi, 'Division C'],
  [/\bdelta\s*(?:side|division|div)?\b/gi,   'Division D'],
  [/\ba\s*(?:side|division)\b/gi,            'Division A'],
  [/\bb\s*(?:side|division)\b/gi,            'Division B'],
  [/\bc\s*(?:side|division)\b/gi,            'Division C'],
  [/\bd\s*(?:side|division)\b/gi,            'Division D'],

  // ── Floor levels ──
  [/\bfirst\s+floor\b/gi,   '1st Floor'],
  [/\bsecond\s+floor\b/gi,  '2nd Floor'],
  [/\bthird\s+floor\b/gi,   '3rd Floor'],
  [/\bfourth\s+floor\b/gi,  '4th Floor'],
  [/\bfifth\s+floor\b/gi,   '5th Floor'],
  [/\bsixth\s+floor\b/gi,   '6th Floor'],
  [/\bseventh\s+floor\b/gi, '7th Floor'],
  [/\beighth\s+floor\b/gi,  '8th Floor'],
  [/\b1st\s+floor\b/gi,     '1st Floor'],
  [/\b2nd\s+floor\b/gi,     '2nd Floor'],
  [/\b3rd\s+floor\b/gi,     '3rd Floor'],

  // ── Status mishears ──
  [/\bmay\s+day\b/gi,           'MAYDAY'],
  [/\bmayday\b/gi,              'MAYDAY'],
  [/\bon\s+seen\b/gi,           'on scene'],
  [/\bon\s+the\s+seen\b/gi,     'on scene'],
  [/\bon\s+the\s+scene\b/gi,    'on scene'],
  [/\bat\s+the\s+box\b/gi,      'on scene'],
  [/\bat\s+(?:the\s+)?scene\b/gi, 'on scene'],
  [/\barriving\b/gi,            'on scene'],
  [/\bpulling\s+up\b/gi,        'on scene'],
  [/\ben\s+route\b/gi,          'responding'],
  [/\binroute\b/gi,             'responding'],
  [/\band\s+route\b/gi,         'responding'],
  [/\bworking\s+fire\b/gi,      'working fire'],
  [/\bwe\s+have\s+a\s+worker\b/gi, 'working fire'],
  [/\bfire\s+showing\b/gi,      'working fire'],
  [/\bgoing\s+on\s+air\b/gi,    'on air'],
  [/\bmasking\s+up\b/gi,        'on air'],
  [/\bbottles\s+on\b/gi,        'on air'],
  [/\bpar\s+complete\b/gi,      'PAR'],
  [/\ball\s+accounted\b/gi,     'PAR'],
  [/\bout\s+of\s+service\b/gi,  'out of service'],
  [/\boos\b/gi,                 'out of service'],
  [/\bback\s+in\s+service\b/gi, 'available'],
  [/\bin\s+service\b/gi,        'available'],

  // ── Assignment mishears ──
  [/\brap(?:id)?\s*intervention\b/gi,  'RIT'],
  [/\br\.?i\.?t\.?\b/gi,               'RIT'],
  [/\biric\b/gi,                       'RIT'],
  [/\bwater\s+supply\b/gi,             'water supply'],
  [/\bon\s+(?:the\s+)?hydrant\b/gi,    'water supply'],
  [/\bcatch(?:ing)?\s+(?:a\s+)?plug\b/gi, 'water supply'],
  [/\bvent(?:ilation)?\s+group\b/gi,   'ventilation'],
  [/\bventing\b/gi,                    'ventilation'],
  [/\brehab(?:ilitation)?\b/gi,        'rehab'],
  [/\bstag(?:ing)?\b/gi,               'staging'],
  [/\bprimary\s+search\b/gi,           'search'],
  [/\bsearch\s+(?:and\s+)?rescue\b/gi, 'search'],
  [/\bmedical\s+group\b/gi,            'medical'],
  [/\btreatment\b/gi,                  'medical'],
  [/\btriage\b/gi,                     'medical'],
  [/\bgoing\s+interior\b/gi,           'interior'],
  [/\binside\b/gi,                     'interior'],
  [/\bgoing\s+to\s+(?:the\s+)?roof\b/gi, 'roof'],

  // ── Alarm level mishears ──
  [/\bstrike\s+(?:a\s+)?(?:the\s+)?second\s+alarm\b/gi,  '2nd alarm'],
  [/\btransmit\s+(?:a\s+)?second\s+alarm\b/gi,           '2nd alarm'],
  [/\bgo\s+to\s+(?:a\s+)?second\s+alarm\b/gi,            '2nd alarm'],
  [/\bstrike\s+(?:a\s+)?(?:the\s+)?third\s+alarm\b/gi,   '3rd alarm'],
  [/\bgo\s+to\s+(?:a\s+)?third\s+alarm\b/gi,             '3rd alarm'],
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

SPEECH-TO-TEXT CONTEXT: This transmission came from voice recognition and has been pre-processed, but may still have residual issues. Apply smart fuzzy matching:
- Unit numbers may appear as words: "Engine one" = Engine 1, "Ladder two" = Ladder 2
- "seen" / "the seen" / "at the box" → on scene
- "fower" → 4, "niner" → 9, "tree" → 3
- "latter" / "ladder" / "lader" → Ladder
- "may day" / "mayday" → MAYDAY
- "alpha/bravo/charlie/delta" / "A side/B side" → Division A/B/C/D
- "E1"→Engine 1, "T2"→Truck 2, "L3"→Ladder 3, "R1"→Rescue 1
- "en route" / "inroute" / "and route" → responding
- "going interior" / "inside" → interior
- "on hydrant" / "catching a plug" → water supply
- "masking up" / "going on air" / "bottles on" → on air + working
- "at scene" / "arriving" / "pulling up" → on scene
- If a unit says any variant of arriving at the incident, set status to on_scene

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
- "E-4" / "E4" → "Engine 4"; "T-1" / "T1" → "Truck 1"; "R-2" / "R2" → "Rescue 2"; "L-3" / "L3" → "Ladder 3"
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
- "fourth floor" → "4th Floor" | "fifth floor" → "5th Floor" | "sixth floor" → "6th Floor"
- "seventh floor" → "7th Floor" | "eighth floor" → "8th Floor"
- "basement" / "sub-basement" → "Basement" | "attic" / "in the attic" → "Attic" | "roof" → "Roof"

Respond with this exact JSON structure:
{
  "from_unit": "exact unit name from list or null",
  "to_unit": "exact unit name from list or null",
  "priority": "routine|urgent|emergency|mayday",
  "actions": [{ "unit_name": "exact name", "changes": { "status": null, "assignment": null, "floor": null, "set_air_time": false, "personnel_count": null, "officer": null } }],
  "new_units": [{ "unit_name": "name", "unit_type": "engine|truck|ladder|rescue|squad|deputy|medic|tanker|brush|hazmat|other", "status": "status", "assignment": "unassigned", "notes": null }],
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
  // manualStopRef: true when the user explicitly tapped the mic button to stop.
  // When false and recognition ends on its own (iOS timeout / browser cutoff),
  // we restart automatically so the mic stays live until deliberately stopped.
  const manualStopRef = useRef(false);
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
    return () => {
      manualStopRef.current = true;
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startListening = () => {
    if (!hasSpeech) {
      setListenError('Speech recognition not supported in this browser. On iPad, use Safari.');
      return;
    }
    setListenError('');
    manualStopRef.current = false;

    // boot() creates and starts a single recognition session.
    // On iOS, recognition.continuous = false so the browser stops after a pause.
    // We restart automatically (by calling boot() again from onend) unless the
    // user manually tapped the stop button (manualStopRef.current = true).
    const boot = () => {
      if (manualStopRef.current) return; // user stopped while we were restarting

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = !isIOS; // iOS doesn't support continuous
      recognition.maxAlternatives = 3;

      // Expanded grammar hints (Chrome only — ignored elsewhere)
      if ('SpeechGrammarList' in window) {
        const grammar = `#JSGF V1.0; grammar fire;
          public <unit> = Engine | Truck | Ladder | Rescue | Squad | Medic | Tower | Tanker | Hazmat | Car;
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
        const FIRE_TERMS = /\b(engine|truck|ladder|rescue|medic|squad|tower|division|alarm|scene|working|mayday|rit|rehab|staging|ventilation|interior|roof|water supply|search|medical|exposure|responding|en route|available|par)\b/i;

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
          // Always append to any existing text so multiple utterances
          // (or iOS restarts) build up into one complete transmission.
          setMessage(prev => {
            const base = prev ? (prev.trimEnd() + ' ') : '';
            return normalizeSpeech(base + finalTranscript);
          });
        } else if (interimTranscript) {
          setInterimText(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        // 'no-speech' is normal — the browser just didn't hear anything in this
        // session. onend will fire next and we'll restart if needed.
        if (event.error === 'no-speech') return;
        setListenError(event.error === 'not-allowed'
          ? 'Microphone access denied. Allow mic in browser settings.'
          : `Mic error: ${event.error}`);
        setIsListening(false);
        manualStopRef.current = true; // stop restart loop on real errors
      };

      recognition.onend = () => {
        setInterimText('');
        recognitionRef.current = null;

        if (manualStopRef.current) {
          // User tapped stop — submit what we have
          setIsListening(false);
          setTimeout(() => setAutoSubmitPending(true), 600);
        } else {
          // Browser ended on its own (iOS timeout, brief silence, etc.)
          // Restart silently — mic indicator stays green, no submit yet.
          setTimeout(boot, 150);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        setListenError('Could not start microphone. Try tapping the mic button again.');
        setIsListening(false);
        manualStopRef.current = true;
      }
    };

    boot();
  };

  const stopListening = () => {
    manualStopRef.current = true; // signals onend to submit rather than restart
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
