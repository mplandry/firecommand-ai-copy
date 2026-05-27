import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Outlet, useParams } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import { MaydayProvider } from './contexts/MaydayContext';
import CommandBoard from './pages/CommandBoard';
import IncidentsDashboard from './pages/IncidentsDashboard';
import DepartmentSettings from './pages/DepartmentSettings';
import TerminologySettings from './pages/TerminologySettings';
import AccountabilityDashboard from './pages/AccountabilityDashboard';
import RosterManager from './pages/RosterManager';
import TemplateManager from './pages/TemplateManager';
import IncidentPanel from './pages/IncidentPanel';
import KioskDisplay from './pages/KioskDisplay';
import DispatchLog from './pages/DispatchLog';
import IncidentContacts from './pages/IncidentContacts';
import AdminRegistrations from './pages/AdminRegistrations';

// Layout wrapper: keeps MaydayProvider alive across all /incident/:id sub-routes
// so MAYDAY state persists when navigating to DispatchLog, IncidentPanel, etc.
function IncidentLayout() {
  const { incidentId } = useParams();
  return (
    <MaydayProvider incidentId={incidentId}>
      <Outlet />
    </MaydayProvider>
  );
}

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={<IncidentsDashboard />} />
      <Route path="/settings" element={<DepartmentSettings />} />
      <Route path="/terminology" element={<TerminologySettings />} />
      <Route path="/roster" element={<RosterManager />} />
      <Route path="/templates" element={<TemplateManager />} />
      <Route path="/contacts" element={<IncidentContacts />} />
      <Route path="/admin" element={<AdminRegistrations />} />

      {/* All incident sub-routes share one MaydayProvider — state survives navigation */}
      <Route path="/incident/:incidentId" element={<IncidentLayout />}>
        <Route index element={<CommandBoard />} />
        <Route path="dispatch" element={<DispatchLog />} />
        <Route path="panel" element={<IncidentPanel />} />
        <Route path="accountability" element={<AccountabilityDashboard />} />
        <Route path="kiosk" element={<KioskDisplay />} />
        <Route path="contacts" element={<IncidentContacts />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App