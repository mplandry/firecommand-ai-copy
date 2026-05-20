import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
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
// Add page imports here

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={<IncidentsDashboard />} />
      <Route path="/incident/:incidentId" element={<CommandBoard />} />
      <Route path="/settings" element={<DepartmentSettings />} />
      <Route path="/terminology" element={<TerminologySettings />} />
      <Route path="/incident/:incidentId/accountability" element={<AccountabilityDashboard />} />
      <Route path="/roster" element={<RosterManager />} />
      <Route path="/templates" element={<TemplateManager />} />
      <Route path="/incident/:incidentId/panel" element={<IncidentPanel />} />
      <Route path="/incident/:incidentId/kiosk" element={<KioskDisplay />} />
      <Route path="/incident/:incidentId/dispatch" element={<DispatchLog />} />
      <Route path="/contacts" element={<IncidentContacts />} />
      <Route path="/incident/:incidentId/contacts" element={<IncidentContacts />} />
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