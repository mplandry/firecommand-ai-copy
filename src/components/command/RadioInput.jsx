import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Send, Loader2, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Web Speech API — works in Chrome/Edge, limited in Firefox/Safari
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function RadioInput({ incidentId, units, onTransmission }) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMayday, setIsMayday] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [listenError, setListenError] = useState('');
  const recognitionRef = useRef(null);
  const [corrections, setCorrections] = useState([]);

  useEffect(() => {
    base44.entities.TerminologyCorrection.list('-created_date', 50)
      .then(data => setCorrections(data || []))
      .catch(() => {});
  }, []);

  const hasSpeech = !!SpeechRecognition;

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startListening = () => {
    if (!hasSpeech) {
      setListenError('Speech recognition not supported in this browser (use Chrome/Edge).');
      return;
    }

    setListenError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.timeout = 10000;

    // Fire department terminology hints for better recognition
    const fireTerms = [
      'Engine', 'Truck', 'Rescue', 'Squad', 'Battalion', 'Medic', 'Tanker', 'Hazmat',
      'Division A', 'Division B', 'Division C', 'Division D',
      'interior', 'roof', 'RIT', 'rehab', 'staging', 'ventilation', 'water supply',
      'on scene', 'working fire', 'MAYDAY', 'all clear', 'PAR', 'available',
      'Alpha', 'Bravo', 'Charlie', 'Delta', '1st Floor', '2nd Floor', '3rd Floor'
    ].join(', ');

    // Attempt to use grammar hints (Chrome feature)
    if ('SpeechGrammarList' in window) {
      const grammar = `#JSGF V1.0; grammar fire_terms; public <fire> = (${
        ['Engine', 'Truck', 'Rescue', 'Squad', 'Medic'].join('|')
      }) [0-9];`;
      try {
        const grammarList = new window.SpeechGrammarList();
        grammarList.addFromString(grammar, 1);
        recognition.grammars = grammarList;
      } catch (e) {
        // Grammar list not fully supported, continue with hints
      }
    }

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setMessage(transcript);
    };

    recognition.onerror = (event) => {
      setListenError(`Mic error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Stop mic if still running
    stopListening();

    setIsProcessing(true);
    const finalMessage = isMayday ? `MAYDAY MAYDAY MAYDAY — ${message}` : message;
    const unitNames = units.map(u => u.unit_name).join(', ');

    const correctionExamples = corrections.length > 0
      ? `\nLEARNED CORRECTIONS FROM THIS DEPARTMENT (apply these first — highest priority):\n` +
        corrections.map(c =>
          `  - "${c.raw_phrase}" → unit: ${c.correct_unit || '?'}, assignment: ${c.correct_assignment || '?'}, status: ${c.correct_status || '?'}` +
          (c.correct_summary ? ` (meaning: ${c.correct_summary})` : '')
        ).join('\n')
      : '';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert fire department radio traffic parser for an Incident Command System (ICS) tactical board.
${correctionExamples}
CURRENT UNITS ON SCENE (match against these exactly — use fuzzy matching for spoken/spelled variants):
${units.map(u => `  - "${u.unit_name}" (type: ${u.unit_type})`).join('\n')}

RADIO TRANSMISSION TO PARSE:
"${finalMessage}"

MUTUAL AID TOWN ABBREVIATION RULES (apply when a town/city name is spoken with a unit):
- "Cambridge" → prefix "CAM" (e.g. "Cambridge Engine 3" → unit_name: "CAM Engine 3", unit_type: engine)
- "Belmont" → prefix "BEL" (e.g. "Belmont Truck 1" → unit_name: "BEL Truck 1", unit_type: truck)
- "Lexington" / "Lex" → prefix "LEX" (e.g. "Lexington Rescue 2" or "Lex Rescue 2" → unit_name: "LEX Rescue 2", unit_type: rescue)
- "Arlington" / "Arl" → prefix "ARL" (e.g. "Arlington Engine 2" or "Arl Engine 2" → unit_name: "ARL Engine 2", unit_type: engine)
- Apply this same pattern to any other town/city name spoken — abbreviate to first 3 uppercase letters as prefix
- Always add notes: "Mutual Aid — [full town name]" on the new unit
- CRITICAL: If a town name is spoken with a unit, it is ALWAYS a mutual aid unit with the prefix. NEVER match "Arlington Engine 2" to an existing "Engine 2" — they are different units. Always create a NEW unit with the prefixed name (e.g. "ARL Engine 2").

CRITICAL UNIT NAME MATCHING RULES:
- Always match spoken/voice variants to the closest existing unit name above
- "Tower one" → "Tower 1", "engine three" → "Engine 3", "truck two" → "Truck 2"
- "E-4", "E4" → "Engine 4"; "T-1", "T1" → "Truck 1"; "R-2", "R2" → "Rescue 2"
- Number words: one=1, two=2, three=3, four=4, five=5, six=6, seven=7, eight=8, nine=9, ten=10
- If a unit name is close but not exact (e.g., "Tower one" when "Tower 1" is on scene), use the existing unit's exact name
- Only create a NEW unit (in new_units) if there is clearly NO match in the current units list

ASSIGNMENT MAPPING (map these spoken phrases to the exact assignment values):
- "Division A" / "Alpha side" / "A side" / "Alpha Division" → division_a
- "Division B" / "Bravo side" / "B side" / "Bravo Division" → division_b
- "Division C" / "Charlie side" / "C side" / "Charlie Division" → division_c
- "Division D" / "Delta side" / "D side" / "Delta Division" → division_d
- "interior" / "going interior" / "working interior" → interior
- "roof" / "going to the roof" / "on the roof" → roof
- "RIT" / "rapid intervention" / "RIT group" → rit
- "rehab" / "rehabilitation" → rehab (also set status: rehab)
- "staging" / "in staging" → staging
- "ventilation" / "vent group" / "venting" → ventilation
- "water supply" / "on hydrant" / "catching a plug" → water_supply
- "search" / "primary search" / "secondary search" / "search group" → search
- "medical group" / "treatment" / "triage" → medical
- "exposure" / "exposure protection" → exposure

STATUS MAPPING:
- "on scene" / "on location" / "on the scene" / "arriving" / "we're arriving" / "pulling up" / "on the box" / "on the hydrant" / "on the plug" / "just arrived" / "have arrived" / "we're there" / "at the address" / "at scene" / "at location" / "[unit] is on scene" → on_scene (also set on_scene_time)
- ARRIVAL DETECTION: Any phrase where a unit reports physically arriving at the incident address should set status to on_scene. Look for verbs like "arriving", "arrived", "pulling up", "on scene", "on location", "at [address/scene/location]".
- "working" / "working fire" / "we have a worker" / "confirming working fire" / "we have fire" / "fire showing" → working
- "on air" / "going on air" / "masking up" / "bottles on" → set_air_time: true, status: working
- "PAR" / "PAR complete" / "all accounted for" / "personnel accountability" → par
- "MAYDAY" → mayday (HIGHEST PRIORITY — always set this if heard)
- "available" / "in service" / "back in service" → available
- "out of service" / "OOS" / "taking out of service" → out_of_service
- "responding" / "en route" → responding

FLOOR MAPPING (set the floor field with a clean label):
- "first floor" / "1st floor" / "floor one" → "1st Floor"
- "second floor" / "2nd floor" / "floor two" → "2nd Floor"
- "third floor" / "3rd floor" → "3rd Floor"
- "fourth floor" / "4th floor" → "4th Floor"
- "fifth floor" / "5th floor" → "5th Floor"
- "basement" / "sub-basement" → "Basement"
- "roof" (when used as floor location) → "Roof"
- "lobby" → "Lobby"

Respond with this exact JSON structure:
{
  "from_unit": "exact unit name from list or null",
  "to_unit": "exact unit name from list or null",
  "priority": "routine|urgent|emergency|mayday",
  "actions": [
    {
      "unit_name": "MUST be exact name from existing units list above, or new name if truly new",
      "changes": {
        "status": "new status value or null",
        "assignment": "new assignment value or null",
        "floor": "floor label string or null",
        "set_air_time": true or false,
        "personnel_count": number or null,
        "officer": "officer name or null"
      }
    }
  ],
  "new_units": [
    {
      "unit_name": "name (with town prefix if mutual aid, e.g. CAM Engine 3)",
      "unit_type": "engine|truck|rescue|squad|deputy|medic|tanker|brush|hazmat|other",
      "status": "status",
      "assignment": "assignment or unassigned",
      "notes": "Mutual Aid — [full town name] if applicable, else null"
    }
  ],
  "summary": "one sentence summary of what happened"
}`,
      response_json_schema: {
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
          summary: { type: 'string' }
        }
      }
    });

    await onTransmission(finalMessage, result);
    setMessage('');
    setIsMayday(false);
    setIsProcessing(false);
  };

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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isListening
                ? 'Listening — speak your command...'
                : isMayday
                ? 'MAYDAY — describe the emergency...'
                : "Radio transmission or voice command  (e.g. 'Engine 2 to Division A working')"
            }
            className={`pl-9 font-mono text-sm h-9 transition-all
              ${isMayday ? 'bg-red-950/40 border-red-500/50 text-red-200 placeholder:text-red-400/40' : 'bg-secondary/60 border-border/60'}
              ${isListening ? 'border-green-500/60 bg-green-950/20' : ''}
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
            title={isListening ? 'Stop listening' : 'Voice input'}
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