import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Citizens = () => {
  const [citizens, setCitizens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCitizens, setFilteredCitizens] = useState([]);

  useEffect(() => {
    fetchCitizens();
  }, []);

  useEffect(() => {
    // Filter citizens based on search term
    if (searchTerm.trim() === '') {
      setFilteredCitizens(citizens);
    } else {
      const filtered = citizens.filter(citizen =>
        `${citizen.firstName} ${citizen.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        citizen.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        citizen.citizenId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCitizens(filtered);
    }
  }, [searchTerm, citizens]);

  const fetchCitizens = async () => {
    try {
      const response = await axios.get('/api/citizens');
      setCitizens(response.data.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching citizens:', error);
      setError('Failed to load citizens data');
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading citizens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-400">⚠️</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Citizens Registry</h1>
          <p className="mt-2 text-gray-600">
            Manage citizen profiles and registration information
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
          + Register New Citizen
        </button>
      </div>

      {/* Search and Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="text"
                placeholder="Search citizens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{citizens.length}</div>
              <div className="text-sm text-gray-600">Total Citizens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {citizens.filter(c => c.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {searchTerm ? filteredCitizens.length : citizens.length}
              </div>
              <div className="text-sm text-gray-600">
                {searchTerm ? 'Filtered' : 'Showing'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Citizens Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCitizens.map(citizen => (
          <div key={citizen.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">👤</span>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {citizen.citizenId}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900">
                  {citizen.firstName} {citizen.lastName}
                </h3>
                
                <div className="space-y-2 mt-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📧</span>
                    <span className="truncate">{citizen.email}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📱</span>
                    <span>{citizen.phone}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">📍</span>
                    <span className="truncate">
                      {citizen.city}, {citizen.state} {citizen.zipCode}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🎂</span>
                    <span>
                      Age {calculateAge(citizen.dateOfBirth)} 
                      ({formatDate(citizen.dateOfBirth)})
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        citizen.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                      }`}></span>
                      <span className="text-sm text-gray-600 capitalize">
                        {citizen.status}
                      </span>
                    </div>
                    
                    <span className="text-xs text-gray-500">
                      Registered {formatDate(citizen.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCitizens.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No matching citizens found' : 'No citizens registered yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms to find citizens.' 
              : 'Start by registering the first citizen in the system.'
            }
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Citizens;