import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Send, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RadioInput({ incidentId, units, onTransmission }) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMayday, setIsMayday] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsProcessing(true);
    const finalMessage = isMayday ? `MAYDAY MAYDAY MAYDAY — ${message}` : message;

    const unitNames = units.map(u => u.unit_name).join(', ');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a fire department radio traffic parser for an Incident Command System (ICS) tactical board.

Current units on scene: ${unitNames}

Parse this radio transmission and determine what board actions to take:
"${finalMessage}"

FIREGROUND TERMINOLOGY REFERENCE:
- "on scene" / "on location" = unit arrived, status → on_scene
- "assuming [division/group]" = assign unit to that division/group
- "Division A/B/C/D" = sides of building (A=front/address, B=left, C=rear, D=right)
- "going interior" = assignment → interior
- "on air" / "going on air" / "masking up" = SCBA in use, set air_time
- "PAR" / "PAR complete" / "all accounted for" = status → par
- "MAYDAY" = status → mayday (HIGHEST PRIORITY)
- "RIT" / "Rapid Intervention" = assignment → rit
- "rehab" = assignment → rehab, status → rehab
- "staging" = assignment → staging
- "roof" / "going to the roof" = assignment → roof
- "ventilation" / "vent group" = assignment → ventilation
- "water supply" = assignment → water_supply
- "search" / "primary search" / "secondary search" = assignment → search
- "exposure" = assignment → exposure
- "available" / "in service" = status → available
- "out of service" / "OOS" = status → out_of_service
- "working fire" / "working" = status → working
- "dispatched" / "responding" = status → dispatched or responding
- "striking [alarm]" = alarm level change

Respond with JSON:
{
  "from_unit": "unit name transmitting or null",
  "to_unit": "unit being called or null",
  "priority": "routine|urgent|emergency|mayday",
  "actions": [
    {
      "unit_name": "exact unit name from the list or new unit name",
      "changes": {
        "status": "new status or null",
        "assignment": "new assignment or null",
        "set_air_time": true/false,
        "personnel_count": number or null,
        "officer": "name or null"
      }
    }
  ],
  "new_units": [
    {
      "unit_name": "name",
      "unit_type": "engine|truck|rescue|squad|battalion|medic|tanker|brush|hazmat|other",
      "status": "status",
      "assignment": "assignment or unassigned"
    }
  ],
  "summary": "brief summary of what happened"
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
                    officer: { type: 'string' }
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
                assignment: { type: 'string' }
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
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Button
        type="button"
        variant={isMayday ? 'destructive' : 'outline'}
        size="sm"
        onClick={() => setIsMayday(!isMayday)}
        className="shrink-0"
      >
        <AlertTriangle className="w-4 h-4" />
      </Button>
      <div className="relative flex-1">
        <Radio className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isMayday ? "MAYDAY — Enter transmission..." : "Enter radio transmission... (e.g., 'Engine 2 on scene, assuming Division A')"}
          className={`pl-10 font-mono text-sm bg-secondary border-border ${isMayday ? 'border-red-500/50 text-red-300 placeholder:text-red-400/50' : ''}`}
          disabled={isProcessing}
        />
      </div>
      <Button type="submit" disabled={isProcessing || !message.trim()} size="sm" className="shrink-0">
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </form>
  );
}