import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthChange } from './services/authService';
import LoginPage from './pages/LoginPage';
import ObservationPage from './pages/ObservationPage';
import VisitsPage from './pages/VisitsPage';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/observation" /> : <LoginPage />} 
        />
        <Route 
          path="/observation" 
          element={user ? <ObservationPage /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/visits" 
          element={user ? <VisitsPage /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={user ? "/observation" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

