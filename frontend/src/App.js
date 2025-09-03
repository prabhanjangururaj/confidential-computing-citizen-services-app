import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Citizens from './pages/Citizens';
import ServiceRequests from './pages/ServiceRequests';
import Services from './pages/Services';
import Agencies from './pages/Agencies';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navigation user={user} onLogout={handleLogout} />
        
        {/* Government Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className="bg-white p-2 rounded-lg">
                  <span className="text-2xl">🏛️</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Springfield City Services</h1>
                  <p className="text-blue-200 text-sm">Government Citizen Services Portal</p>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-6 text-white">
                <div className="text-center">
                  <div className="text-sm text-blue-200">Office Hours</div>
                  <div className="font-semibold">Mon-Fri 8:00 AM - 5:00 PM</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-200">Help Desk</div>
                  <div className="font-semibold">555-CITY (2489)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/citizens" element={<Citizens />} />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/services" element={<Services />} />
            <Route path="/agencies" element={<Agencies />} />
          </Routes>
        </main>
        
        {/* Government Footer */}
        <footer className="bg-gray-800 text-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#" className="hover:text-white">City Services</a></li>
                  <li><a href="#" className="hover:text-white">Apply for Permits</a></li>
                  <li><a href="#" className="hover:text-white">Pay Bills</a></li>
                  <li><a href="#" className="hover:text-white">Submit Request</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Departments</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><a href="#" className="hover:text-white">Building & Safety</a></li>
                  <li><a href="#" className="hover:text-white">Business Services</a></li>
                  <li><a href="#" className="hover:text-white">Public Works</a></li>
                  <li><a href="#" className="hover:text-white">Parks & Recreation</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>📞 555-CITY (2489)</li>
                  <li>✉️ services@springfield.gov</li>
                  <li>🏛️ 100 City Hall Plaza</li>
                  <li>Springfield, IL 62701</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Office Hours</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>Monday - Friday</li>
                  <li>8:00 AM - 5:00 PM</li>
                  <li className="mt-4">
                    <span className="inline-block bg-green-600 text-white text-xs px-2 py-1 rounded">
                      🔒 Confidential Computing Protected
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 Springfield City Government. All rights reserved.</p>
              <p className="mt-2 text-sm">
                🛡️ Powered by Azure Confidential Computing | 
                🏗️ 3-Tier Architecture | 
                🔐 Enterprise Security
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;