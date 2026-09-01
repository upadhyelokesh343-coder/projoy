import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import TournamentDetails from './pages/TournamentDetails';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import Winners from './pages/Winners';
import Rewards from './pages/Rewards';

export default function App() {
  const currentUser = useStore(state => state.currentUser);
  const initFirebaseSync = useStore(state => state.initFirebaseSync);

  useEffect(() => {
    initFirebaseSync();
  }, [initFirebaseSync]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route 
          path="/login" 
          element={!currentUser ? <Login /> : <Navigate to="/" />} 
        />
        <Route 
          path="/signup" 
          element={!currentUser ? <Login /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/" 
          element={currentUser ? <Home /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/rewards" 
          element={currentUser ? <Rewards /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/winners" 
          element={currentUser ? <Winners /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/tournament/:id" 
          element={currentUser ? <TournamentDetails /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/wallet" 
          element={currentUser ? <Wallet /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/profile" 
          element={currentUser ? <Profile /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/admin/*" 
          element={currentUser?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} 
        />
      </Route>
    </Routes>
  );
}
