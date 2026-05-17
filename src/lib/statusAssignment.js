/**
 * Given a new status, returns the assignment a unit should automatically
 * move to — or null if no auto-move should happen.
 *
 * Only overrides when the destination makes operational sense.
 */
export function getAutoAssignment(newStatus, currentAssignment) {
  switch (newStatus) {
    case 'rehab':
      return 'rehab';
    case 'mayday':
      // Mayday unit stays where they are — RIT goes TO them, not the unit itself
      return null;
    case 'available':
      // Available units return to staging
      return 'staging';
    case 'out_of_service':
      return 'staging';
    case 'responding':
    case 'dispatched':
      // Heading to scene — put in staging if not already assigned somewhere meaningful
      if (!currentAssignment || currentAssignment === 'unassigned') return 'staging';
      return null;
    default:
      return null;
  }
}