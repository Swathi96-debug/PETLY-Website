import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EcosystemProvider } from './context/EcosystemContext';
import { WishlistProvider } from './context/WishlistContext';
import Layout from './components/Layout/Layout';

// Pages
import Home from './pages/Home';
import PetQuiz from './pages/PetQuiz';
import HealthHub from './pages/HealthHub';
import Services from './pages/Services';
import Store from './pages/Store';
import Community from './pages/Community';
import AdminPanel from './pages/AdminPanel';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Adopt from './pages/Adopt';
import Messages from './pages/Messages';
import Wishlist from './pages/Wishlist';
import ForgotPassword from './pages/ForgotPassword';

const PetProfile = () => (
  <div className="min-h-screen pt-32 container">
    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">Pet Profile - Coming Soon</h2>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EcosystemProvider>
          <WishlistProvider>
            <Router>
            <div className="aurora-bg min-h-screen selection:bg-orange-500/30">
              <Layout>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/adopt" element={<PrivateRoute><Adopt /></PrivateRoute>} />
                  <Route path="/quiz" element={<PetQuiz />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/store" element={<Store />} />
                  <Route path="/community" element={<Community />} />
                  <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
                  <Route path="/health" element={<PrivateRoute><HealthHub /></PrivateRoute>} />
                  <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot" element={<ForgotPassword />} />
                  <Route path="/pet/:id" element={<PetProfile />} />
                  <Route path="/admin" element={<AdminPanel />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </div>
            </Router>
          </WishlistProvider>
        </EcosystemProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
