import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import LandingPage from './pages/LandingPage';
import PaymentsPage from './pages/PaymentsPage';
import { AuthProvider } from './context/AuthContext';
import { app, analytics } from './config/firebase';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
