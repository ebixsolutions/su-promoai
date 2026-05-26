import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { RoleProvider } from '@/lib/roleContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import AIAdvisor from '@/pages/AIAdvisor';
import CampaignMonitor from '@/pages/CampaignMonitor';
import PromotionBuilder from '@/pages/PromotionBuilder';
import Analytics from '@/pages/Analytics';
import AuditLog from '@/pages/AuditLog';
import Intelligence from '@/pages/Intelligence';
import ConflictCenter from '@/pages/ConflictCenter';
import PolicyRules from '@/pages/PolicyRules';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/advisor" element={<AIAdvisor />} />
        <Route path="/campaigns" element={<CampaignMonitor />} />
        <Route path="/builder" element={<PromotionBuilder />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/intelligence" element={<Intelligence />} />
        <Route path="/conflicts" element={<ConflictCenter />} />
        <Route path="/policy" element={<PolicyRules />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <RoleProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </RoleProvider>
    </AuthProvider>
  );
}

export default App;