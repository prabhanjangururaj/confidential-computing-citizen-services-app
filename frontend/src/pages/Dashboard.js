import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    totalCitizens: 0,
    totalRevenue: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showNewCitizenModal, setShowNewCitizenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [citizens, setCitizens] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes, serviceTypesRes, citizensRes] = await Promise.all([
        axios.get('/api/dashboard/stats'),
        axios.get('/api/dashboard/recent-activity'),
        axios.get('/api/service-types'),
        axios.get('/api/citizens')
      ]);

      setStats(statsRes.data.data);
      setRecentActivity(activityRes.data.data);
      setServiceTypes(serviceTypesRes.data.data || []);
      setCitizens(citizensRes.data.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleNewServiceRequest = async (formData) => {
    setSubmitting(true);
    try {
      await axios.post('/api/service-requests', formData);
      setShowNewRequestModal(false);
      await fetchDashboardData(); // Refresh data
      alert('Service request submitted successfully!');
    } catch (error) {
      console.error('Error creating service request:', error);
      alert('Failed to submit service request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewCitizen = async (formData) => {
    setSubmitting(true);
    try {
      // Generate citizen ID based on timestamp to ensure uniqueness
      const timestamp = Date.now().toString().slice(-4);
      const citizenId = `CTZ${timestamp}`;
      await axios.post('/api/citizens', { ...formData, citizenId });
      setShowNewCitizenModal(false);
      await fetchDashboardData(); // Refresh data
      alert('Citizen registered successfully!');
    } catch (error) {
      console.error('Error registering citizen:', error);
      const errorMessage = error.response?.data?.message || 'Failed to register citizen. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      submitted: 'bg-blue-100 text-blue-800',
      in_review: 'bg-yellow-100 text-yellow-800',
      pending_documents: 'bg-red-100 text-red-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-gray-100 text-gray-800',
      completed: 'bg-purple-100 text-purple-800'
    };

    const statusLabels = {
      submitted: 'Submitted',
      in_review: 'In Review',
      pending_documents: 'Pending Docs',
      approved: 'Approved',
      rejected: 'Rejected',
      completed: 'Completed'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status] || statusStyles.submitted}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Government Services Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to Springfield City Services - Your gateway to efficient government operations
        </p>
      </div>

      {/* Statistics Cards - Government Official Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white border-l-4 border-blue-900 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="bg-blue-900 rounded-lg p-3 mr-4">
              <div className="text-2xl text-white">📋</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalRequests}</div>
              <div className="text-sm text-gray-600">Total Requests</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-l-4 border-yellow-600 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="bg-yellow-600 rounded-lg p-3 mr-4">
              <div className="text-2xl text-white">⏳</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</div>
              <div className="text-sm text-gray-600">Pending Review</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-l-4 border-green-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="bg-green-700 rounded-lg p-3 mr-4">
              <div className="text-2xl text-white">✅</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.completedRequests}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-l-4 border-gray-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="bg-gray-700 rounded-lg p-3 mr-4">
              <div className="text-2xl text-white">👥</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalCitizens}</div>
              <div className="text-sm text-gray-600">Active Citizens</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white border-l-4 border-blue-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <div className="bg-blue-700 rounded-lg p-3 mr-4">
              <div className="text-2xl text-white">💰</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</div>
              <div className="text-sm text-gray-600">Revenue Collected</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Service Requests */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Service Requests</h2>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map(request => (
                <div key={request.requestNumber} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-gray-900">
                        {request.requestNumber}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {request.serviceName} - {request.citizenName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {request.formattedDate}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg">📄</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <div>No recent requests</div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Stats */}
        <div className="space-y-6">
          {/* Quick Actions - Government Official Style */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button 
                onClick={() => setShowNewRequestModal(true)}
                className="w-full flex items-center p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
              >
                <div className="bg-blue-900 rounded-lg p-2 mr-4">
                  <span className="text-xl text-white">📝</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">New Service Request</div>
                  <div className="text-sm text-gray-600">Submit new application</div>
                </div>
              </button>
              
              <button 
                onClick={() => setShowNewCitizenModal(true)}
                className="w-full flex items-center p-4 text-left bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-colors"
              >
                <div className="bg-green-700 rounded-lg p-2 mr-4">
                  <span className="text-xl text-white">👤</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Register Citizen</div>
                  <div className="text-sm text-gray-600">Add new citizen profile</div>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/agencies')}
                className="w-full flex items-center p-4 text-left bg-gray-50 hover:bg-yellow-50 border border-gray-200 hover:border-yellow-300 rounded-lg transition-colors"
              >
                <div className="bg-yellow-600 rounded-lg p-2 mr-4">
                  <span className="text-xl text-white">📊</span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">View Reports</div>
                  <div className="text-sm text-gray-600">Analytics & insights</div>
                </div>
              </button>
            </div>
          </div>

          {/* Performance Metrics - Government Official Style */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 border-l-4 border-blue-900 p-4 rounded-r-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                  <span className="text-xl font-bold text-blue-900">
                    {stats.totalRequests > 0 ? Math.round((stats.completedRequests / stats.totalRequests) * 100) : 0}%
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 border-l-4 border-green-700 p-4 rounded-r-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Citizen Satisfaction</span>
                  <span className="text-xl font-bold text-green-700">94%</span>
                </div>
              </div>
              
              <div className="bg-gray-50 border-l-4 border-yellow-600 p-4 rounded-r-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Avg Processing Time</span>
                  <span className="text-xl font-bold text-yellow-600">12 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Services */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Popular Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">🏗️</div>
            <div className="font-medium text-gray-900">Building Permits</div>
            <div className="text-sm text-gray-600">Construction & renovation permits</div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">🏢</div>
            <div className="font-medium text-gray-900">Business Licenses</div>
            <div className="text-sm text-gray-600">Start your business legally</div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-medium text-gray-900">Event Permits</div>
            <div className="text-sm text-gray-600">Public events & gatherings</div>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
            <div className="text-2xl mb-2">🏡</div>
            <div className="font-medium text-gray-900">Property Services</div>
            <div className="text-sm text-gray-600">Tax assessments & records</div>
          </div>
        </div>
      </div>

      {/* New Service Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">New Service Request</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleNewServiceRequest({
                citizenId: parseInt(formData.get('citizenId')),
                serviceTypeId: parseInt(formData.get('serviceTypeId')),
                priority: formData.get('priority'),
                notes: formData.get('notes')
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Citizen</label>
                  <select name="citizenId" required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Select Citizen</option>
                    {citizens.map(citizen => (
                      <option key={citizen.id} value={citizen.id}>
                        {citizen.firstName} {citizen.lastName} ({citizen.citizenId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  <select name="serviceTypeId" required className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="">Select Service</option>
                    {serviceTypes.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select name="priority" className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea name="notes" rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-md"></textarea>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Citizen Modal */}
      {showNewCitizenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Register New Citizen</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              handleNewCitizen({
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                address: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                zipCode: formData.get('zipCode'),
                dateOfBirth: formData.get('dateOfBirth')
              });
            }}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input type="text" name="firstName" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input type="text" name="lastName" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" name="email" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    required 
                    placeholder="555-123-4567"
                    pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
                    onInput={(e) => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length >= 6) {
                        value = value.substring(0, 3) + '-' + value.substring(3, 6) + '-' + value.substring(6, 10);
                      } else if (value.length >= 3) {
                        value = value.substring(0, 3) + '-' + value.substring(3);
                      }
                      e.target.value = value;
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" name="address" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" name="city" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input type="text" name="state" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                    <input type="text" name="zipCode" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" name="dateOfBirth" required className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewCitizenModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Registering...' : 'Register Citizen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;