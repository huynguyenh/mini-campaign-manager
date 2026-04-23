import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/Toaster';
import { RequireAuth } from './routes/RequireAuth';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { CampaignsListPage } from './features/campaigns/CampaignsListPage';
import { CreateCampaignPage } from './features/campaigns/CreateCampaignPage';
import { CampaignDetailPage } from './features/campaigns/CampaignDetailPage';
import { AppShell } from './components/AppShell';

export function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/campaigns" replace />} />
          <Route path="/campaigns" element={<CampaignsListPage />} />
          <Route path="/campaigns/new" element={<CreateCampaignPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/campaigns" replace />} />
      </Routes>
    </>
  );
}
