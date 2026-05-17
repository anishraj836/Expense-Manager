import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './store/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Friends } from './pages/Friends';
import { Activity } from './pages/Activity';
import { AuthPage } from './pages/AuthPage';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '601324788389-vf465g38so83ksljhsa74vntfsk6cnda.apps.googleusercontent.com';

const AppRoutes = () => {
  const { currentUser } = useAppContext();
  
  if (!currentUser) return <AuthPage />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="friends" element={<Friends />} />
          <Route path="activity" element={<Activity />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
