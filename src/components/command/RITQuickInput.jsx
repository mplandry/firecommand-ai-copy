import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send } from 'lucide-react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function RITQuickInput({ units, onAssignUnit }) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const recognitionRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const matched = units.find(u =>
      u.unit_name.toLowerCase().includes(input.toLowerCase()) ||
      input.toLowerCase().includes(u.unit_name.toLowerCase())
    );

    if (matched) {
      onAssignUnit(matched.id);
      setInput('');
      setNoMatch(false);
    } else {
      setNoMatch(true);
      setTimeout(() => setNoMatch(false), 1500);
    }
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
    <form onSubmit={handleSubmit} className="flex gap-1.5">
      <div className="relative flex-1">
        <Input
          value={input}
          onChange={(e) => { setInput(e.target.value); setNoMatch(false); }}
          placeholder={isListening ? 'Listening...' : 'Type unit name...'}
          className={`h-8 text-xs ${noMatch ? 'border-red-500 text-red-400' : ''}`}
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
  );
}