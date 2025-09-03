import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = ({ user, onLogout }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/citizens', label: 'Citizens', icon: '👥' },
    { path: '/service-requests', label: 'Service Requests', icon: '📋' },
    { path: '/services', label: 'Services Catalog', icon: '🏛️' },
    { path: '/agencies', label: 'Agencies', icon: '🏢' }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 text-gray-800 font-bold text-lg">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <span className="text-xl">🏛️</span>
            </div>
            <span>Citizen Services Portal</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm border border-blue-200">
              <span className="mr-2">👤</span>
              <span className="font-medium">{user?.firstName} {user?.lastName}</span>
              <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">{user?.role}</span>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <span className="mr-2">🚪</span>
              Logout
            </button>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="text-gray-400 hover:text-gray-500 focus:outline-none">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className="md:hidden border-t border-gray-200 pt-2 pb-3 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2 text-base font-medium ${
                  isActive 
                    ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;