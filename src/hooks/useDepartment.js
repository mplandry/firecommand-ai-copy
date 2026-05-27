import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { DEFAULT_APPARATUS, DEFAULT_STATIONS, DEFAULT_PREFIX } from '@/pages/DepartmentSettings';

function safeParseJSON(str, fallback) {
  try { return JSON.parse(str) || fallback; } catch { return fallback; }
}

/**
 * Returns parsed department config with apparatus, stations, and unit prefix.
 * Falls back to Waltham defaults if the dept entity hasn't been configured yet.
 */
export function useDepartment() {
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['department'],
    queryFn: () => base44.entities.Department.list(),
    staleTime: 60_000,
  });

  const dept = departments[0] || null;

  const prefix    = dept?.unit_prefix   || DEFAULT_PREFIX;
  const stations  = dept?.stations_json  ? safeParseJSON(dept.stations_json,  DEFAULT_STATIONS)  : DEFAULT_STATIONS;
  const apparatus = dept?.apparatus_json ? safeParseJSON(dept.apparatus_json, DEFAULT_APPARATUS) : DEFAULT_APPARATUS;

  /**
   * Build apparatus groups (for NewIncidentDialog unit picker and DivisionColumn).
   * Each group: { label, units: [{ unit_name, unit_type, personnel_count }] }
   */
  const apparatusGroups = stations.map(station => ({
    label: station.label,
    units: apparatus
      .filter(u => u.station === station.label)
      .map(u => ({
        unit_name:       `${prefix} ${u.name}`,
        unit_type:       u.type,
        personnel_count: u.personnel,
      })),
  })).filter(g => g.units.length > 0);

  /** Flat list of all units (for NewIncidentDialog WAL_APPARATUS equivalent) */
  const allUnits = apparatus.map(u => ({
    unit_name:       `${prefix} ${u.name}`,
    unit_type:       u.type,
    personnel_count: u.personnel,
  }));

  /** Station group config for DivisionColumn (without prefix in unit names for matching) */
  const stationGroups = stations
    .filter(s => !apparatus.find(u => u.station === s.label && u.special))
    .map(station => ({
      label: station.label,
      units: apparatus
        .filter(u => u.station === station.label && !u.special)
        .map(u => `${prefix} ${u.name}`),
    }))
    .filter(g => g.units.length > 0);

  /** Low-priority / special units sorted to bottom of Unassigned */
  const specialUnits = apparatus
    .filter(u => u.special)
    .map(u => `${prefix} ${u.name}`);

  return {
    dept,
    isLoading,
    prefix,
    stations,
    apparatus,
    apparatusGroups,
    allUnits,
    stationGroups,
    specialUnits,
  };
}
