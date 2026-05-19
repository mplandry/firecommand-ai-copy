import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send } from 'lucide-react';
import UnitCard from './UnitCard';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function RITQuickInput({ units, onAssignUnit }) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const recognitionRef = useRef(null);

  const findMatch = (value) =>
    units.find(u =>
      u.unit_name.toLowerCase().includes(value.toLowerCase()) ||
      value.toLowerCase().includes(u.unit_name.toLowerCase())
    );

  const matchedUnit = input.trim().length > 0 ? findMatch(input) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (matchedUnit) {
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

  const startListening = () => {
    if (!SpeechRecognition) return;
    setInput('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
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
          onClick={() => { onAssignUnit(matchedUnit.id); setInput(''); }}
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