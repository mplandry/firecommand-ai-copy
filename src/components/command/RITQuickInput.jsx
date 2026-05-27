import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send } from 'lucide-react';
import UnitCard from './UnitCard';
import { base44 } from '@/api/base44Client';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Normalize spoken/typed unit names to match database format
const NUMBER_WORDS = {
  'zero':'0','one':'1','two':'2','three':'3','four':'4','five':'5',
  'six':'6','seven':'7','eight':'8','nine':'9','ten':'10',
  'eleven':'11','twelve':'12','thirteen':'13','fourteen':'14','fifteen':'15',
  'sixteen':'16','seventeen':'17','eighteen':'18','nineteen':'19','twenty':'20',
};

const UNIT_TYPE_FIXES = {
  'injury':'engine','indian':'engine','and gene':'engine','engine ear':'engine',
  'latter':'ladder','ladder truck':'truck','ladder company':'truck',
  'rescue squad':'rescue','rescue company':'rescue',
  'squad':'squad','skid':'squad',
  'medic':'medic','medical':'medic',
  'deputy':'deputy','battalion':'battalion','battalion chief':'battalion',
  'tanker':'tanker','tender':'tanker',
  'brush':'brush',
};

function cleanUnitName(raw) {
  if (!raw) return '';
  let s = raw.trim().toLowerCase();

  // Fix common unit type mishears
  for (const [bad, good] of Object.entries(UNIT_TYPE_FIXES)) {
    s = s.replace(new RegExp(`\\b${bad}\\b`, 'gi'), good);
  }

  // Normalize "WAL" prefix variants
  s = s.replace(/\b(wall|walls|wal)\b/gi, 'WAL');

  // Convert number words to digits (after type so "engine one" → "engine 1")
  s = s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi,
    (m) => NUMBER_WORDS[m.toLowerCase()] || m);

  // Capitalize first letter of each word for display
  s = s.replace(/\b\w/g, c => c.toUpperCase());

  return s.trim();
}

// Score how well a normalized input matches a unit name
function matchScore(input, unitName) {
  const a = input.toLowerCase().replace(/\s+/g, ' ').trim();
  const b = unitName.toLowerCase().replace(/\s+/g, ' ').trim();
  if (a === b) return 100;
  if (b.includes(a) || a.includes(b)) return 80;

  // Strip dept prefix for comparison (e.g. "WAL 1" → "1")
  const aStripped = a.replace(/^(wal|wall|walls)\s*/i, '');
  const bStripped = b.replace(/^(wal|wall|walls)\s*/i, '');
  if (aStripped && bStripped && (bStripped.includes(aStripped) || aStripped.includes(bStripped))) return 70;

  // Token overlap
  const aToks = new Set(a.split(/\s+/));
  const bToks = new Set(b.split(/\s+/));
  const overlap = [...aToks].filter(t => bToks.has(t)).length;
  if (overlap > 0) return overlap * 20;

  return 0;
}

export default function RITQuickInput({ units, onAssignUnit }) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const recognitionRef = useRef(null);

  const findMatch = (value) => {
    const cleaned = cleanUnitName(value);
    let best = null;
    let bestScore = 0;
    for (const u of units) {
      const score = Math.max(
        matchScore(cleaned, u.unit_name),
        matchScore(value, u.unit_name)  // also try raw in case cleaning hurts
      );
      if (score > bestScore) { bestScore = score; best = u; }
    }
    return bestScore >= 20 ? best : null;
  };

  const matchedUnit = input.trim().length > 0 ? findMatch(input) : null;

  const saveCorrection = (rawInput, unit) => {
    base44.entities.TerminologyCorrection.create({
      raw_phrase: rawInput,
      correct_unit: unit.unit_name,
      correct_assignment: 'rit',
      correct_status: 'working',
      correct_summary: `RIT mic: "${rawInput}" → ${unit.unit_name} assigned to RIT`,
      confirmed: true,
    }).catch(() => {});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (matchedUnit) {
      saveCorrection(input, matchedUnit);
      onAssignUnit(matchedUnit.id);
      setInput('');
      setNoMatch(false);
    } else {
      setNoMatch(true);
      setTimeout(() => setNoMatch(false), 1500);
    }
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    setNoMatch(false);
  };

  // Pick the best alternative from speech results
  const pickBestTranscript = (event) => {
    let bestTranscript = '';
    let bestScore = -1;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      for (let j = 0; j < result.length; j++) {
        const t = result[j].transcript;
        const cleaned = cleanUnitName(t);
        let score = 0;
        for (const u of units) {
          score = Math.max(score, matchScore(cleaned, u.unit_name), matchScore(t, u.unit_name));
        }
        if (score > bestScore) { bestScore = score; bestTranscript = t; }
      }
    }
    return bestTranscript;
  };

  const startListening = () => {
    if (!SpeechRecognition) return;
    setInput('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.maxAlternatives = 5;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = pickBestTranscript(event);
      const cleaned = cleanUnitName(transcript);
      setInput(cleaned || transcript);
      setNoMatch(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Live unit card preview */}
      {matchedUnit && (
        <div
          className="cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
          onClick={() => { saveCorrection(input, matchedUnit); onAssignUnit(matchedUnit.id); setInput(''); }}
          title="Click to assign to RIT"
        >
          <UnitCard unit={matchedUnit} />
          <p className="text-[10px] font-mono text-center text-green-400 mt-1 tracking-wider">TAP TO ASSIGN → RIT</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <div className="relative flex-1">
          <Input
            value={input}
            onChange={handleChange}
            placeholder={isListening ? 'Listening...' : 'Type unit name...'}
            className={`h-8 text-xs ${noMatch ? 'animate-flash-contrast border-red-500 text-red-400' : matchedUnit ? 'border-green-500/60' : ''}`}
            autoFocus
          />
        </div>
        {SpeechRecognition && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={isListening ? stopListening : startListening}
            className={`h-8 w-8 p-0 ${isListening ? 'bg-green-500/20 text-green-400' : ''}`}
          >
            {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          </Button>
        )}
        <Button type="submit" size="sm" className="h-8 w-8 p-0" disabled={!input.trim()}>
          <Send className="w-3 h-3" />
        </Button>
      </form>
    </div>
  );
}