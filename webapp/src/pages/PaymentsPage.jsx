import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

function PaymentsPage() {
  const { user, userData, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Initialize Gumroad JS
    const script = document.createElement('script');
    script.src = 'https://gumroad.com/js/gumroad.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  // Generate Gumroad URL with user ID as parameter
  const getGumroadUrl = () => {
    if (!user) return 'https://aladyn.gumroad.com/l/maxmemory';
    
    // Add user ID and email as URL parameters
    const baseUrl = 'https://aladyn.gumroad.com/l/maxmemory';
    const params = new URLSearchParams({
      uid: user.uid,
      email: user.email,
      referrer: window.location.href,
      wanted: true
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div className="container">
      <section className="hero">
        <h1>Payments</h1>
        <div className="payment-container">
          {user ? (
            <div className="user-profile">
              <h2>Welcome, {userData?.displayName || user.displayName}</h2>
              <p>Email: {userData?.email || user.email}</p>
              
              {userData?.photoURL && (
                <img 
                  src={userData.photoURL} 
                  alt="Profile" 
                  className="profile-image" 
                />
              )}
              
              <div className="subscription-status">
                <h3>Subscription Status</h3>
                <div className={`status-badge ${userData?.isPaid ? 'premium' : 'free'}`}>
                  {userData?.isPaid ? 'Premium' : 'Free'}
                </div>
                
                {!userData?.isPaid && (
                  <div className="upgrade-section">
                    <p>Upgrade to Premium for unlimited memories and advanced features!</p>
                    <a 
                      className="gumroad-button cta-button purchase-button" 
                      href={getGumroadUrl()} 
                      data-gumroad-overlay-checkout="true"
                    >
                      Buy Now
                    </a>
                    <p className="purchase-note">
                      After purchase, your account will be automatically upgraded.
                    </p>
                  </div>
                )}
                
                {userData?.isPaid && (
                  <div className="premium-info">
                    <p>Thank you for your purchase!</p>
                    <p>You have full access to all premium features.</p>
                  </div>
                )}
              </div>
              
              <div className="action-buttons">
                <button 
                  className="cta-button logout-button" 
                  onClick={handleSignOut}
                >
                  Sign Out
                </button>
                <button 
                  className="cta-button home-button" 
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <div className="login-container">
              <h2>Please sign in to access your payments</h2>
              <button 
                className="cta-button google-button" 
                onClick={handleSignIn}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </button>
              {error && <p className="error-message">{error}</p>}
              <button 
                className="cta-button home-button" 
                onClick={() => navigate('/')}
              >
                Back to Home
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PaymentsPage; 