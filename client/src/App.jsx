// Routes (E1). Private routes sit under RequireAuth; /login and /signup under GuestOnly.
// "/" is the public landing page (E19), replacing the earlier redirect to /dashboard (E18).
import { Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards.jsx';
import AppLayout from './components/AppLayout.jsx';
import { LoginPage, SignupPage } from './pages/AuthPages.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import SpaceCreatedPage from './pages/SpaceCreatedPage.jsx';
import { EditSpacePage, NewSpacePage } from './pages/SpaceFormPage.jsx';
import { NotFoundPage, PublicSpaceComingSoon } from './pages/SimplePages.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/spaces/new" element={<NewSpacePage />} />
          <Route path="/spaces/:id/edit" element={<EditSpacePage />} />
          <Route path="/spaces/:id/created" element={<SpaceCreatedPage />} />
        </Route>
      </Route>

      <Route path="/s/:slug" element={<PublicSpaceComingSoon />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
