import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

const ASSIGNMENT_LABELS = {
  division_a: 'Division Alpha', division_b: 'Division Bravo',
  division_c: 'Division Charlie', division_d: 'Division Delta',
  roof: 'Roof', interior: 'Interior', rit: 'RIT',
  rehab: 'Rehab', water_supply: 'Water Supply',
  ventilation: 'Ventilation', search: 'Search',
  medical: 'Medical', staging: 'Staging',
  exposure: 'Exposure', unassigned: 'Unassigned',
};

export default function ExportIncidentPDF({ incident, units, radioLogs, department }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const W = doc.internal.pageSize.getWidth();
    let y = 40;

    const line = (lw = 0.5) => { doc.setLineWidth(lw); doc.line(40, y, W - 40, y); y += 6; };
    const section = (title) => {
      y += 10;
      doc.setFillColor(30, 30, 50);
      doc.rect(40, y, W - 80, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(title.toUpperCase(), 48, y + 12);
      doc.setTextColor(0, 0, 0);
      y += 24;
    };

    // ── HEADER ──
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INCIDENT REPORT', 40, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(department?.name || 'Fire Department', 40, 46);
    doc.text(`Generated: ${format(new Date(), 'MM/dd/yyyy HH:mm')}`, 40, 60);
    doc.setTextColor(0, 0, 0);
    y = 90;

    // ── INCIDENT INFO ──
    section('Incident Information');
    doc.setFontSize(10);
    const infoRows = [
      ['Command Name', incident.command_name || '—'],
      ['Address', incident.address || '—'],
      ['Incident Type', (incident.incident_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
      ['Alarm Level', (incident.alarm_level || '').replace(/_/g, ' ').toUpperCase()],
      ['Incident Commander', incident.ic_name || '—'],
      ['Status', (incident.status || '').toUpperCase()],
      ['Started', incident.started_at ? format(new Date(incident.started_at), 'MM/dd/yyyy HH:mm') : '—'],
    ];
    infoRows.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', 48, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), 200, y);
      y += 16;
    });
    if (incident.notes) {
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 48, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(incident.notes, W - 96);
      doc.text(noteLines, 48, y);
      y += noteLines.length * 14;
    }

    // ── CREW ACCOUNTABILITY ──
    section('Crew Accountability');
    // Table header
    const cols = [48, 170, 280, 360, 440];
    const headers = ['Unit', 'Assignment', 'Status', 'Personnel', 'On Scene'];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 4;
    line(0.3);
    doc.setFont('helvetica', 'normal');
    units.forEach((unit, idx) => {
      if (y > 680) { doc.addPage(); y = 40; }
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 250);
        doc.rect(40, y - 8, W - 80, 14, 'F');
      }
      doc.text(unit.unit_name || '—', cols[0], y);
      doc.text(ASSIGNMENT_LABELS[unit.assignment] || unit.assignment || '—', cols[1], y);
      doc.text((unit.status || '').replace(/_/g, ' '), cols[2], y);
      doc.text(String(unit.personnel_count || '—'), cols[3], y);
      doc.text(unit.on_scene_time ? format(new Date(unit.on_scene_time), 'HH:mm') : '—', cols[4], y);
      y += 14;
    });

    // ── RADIO LOG ──
    if (radioLogs?.length > 0) {
      if (y > 580) { doc.addPage(); y = 40; }
      section('Radio Transmission Log');
      doc.setFontSize(8);
      radioLogs.slice().reverse().forEach((log, idx) => {
        if (y > 700) { doc.addPage(); y = 40; }
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 250);
          doc.rect(40, y - 8, W - 80, 20, 'F');
        }
        const time = log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : '—';
        doc.setFont('helvetica', 'bold');
        doc.text(`[${time}] ${log.from_unit || 'UNKNOWN'}:`, 48, y);
        doc.setFont('helvetica', 'normal');
        const msgLines = doc.splitTextToSize(log.message || '', W - 200);
        doc.text(msgLines, 180, y);
        y += Math.max(14, msgLines.length * 10 + 4);
      });
    }

    // ── FOOTER ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `${department?.name || 'Fire Department'} | Incident Report | Page ${i} of ${pageCount}`,
        W / 2, doc.internal.pageSize.getHeight() - 20,
        { align: 'center' }
      );
    }

    const filename = `incident-${(incident.command_name || incident.address || 'report').replace(/\s+/g, '-').toLowerCase()}.pdf`;
    doc.save(filename);
    setLoading(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="gap-1.5 text-xs">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      Export PDF
    </Button>
  );
}