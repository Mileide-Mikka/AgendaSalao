import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { PreferencesProvider } from './preferences/PreferencesContext';
import { AgendaPage } from './pages/AgendaPage';
import { ClientsPage } from './pages/ClientsPage';
import { DashboardPage } from './pages/DashboardPage';
import { FirstAccessPage } from './pages/FirstAccessPage';
import { LoginPage } from './pages/LoginPage';
import { GuidePage } from './pages/GuidePage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/primeiro-acesso" element={<FirstAccessPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="clientes" element={<ClientsPage />} />
            <Route path="comunicacoes" element={<MessagesPage />} />
            <Route path="servicos" element={<ServicesPage />} />
            <Route path="profissionais" element={<ProfessionalsPage />} />
            <Route path="como-usar" element={<GuidePage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </PreferencesProvider>
  );
}
