const express = require('express');
const router = express.Router();
const { dashboardService, serviceTypeService, agencyService } = require('../database/db');
const { encryptedServiceRequestService, encryptedCitizenService } = require('../database/encryptedDb');
const { sendErrorResponse, sendSuccessResponse, handleAsync, formatCurrency } = require('../utils/helpers');

// Get main dashboard statistics
router.get('/stats', handleAsync(async (req, res) => {
  const stats = await dashboardService.getStats();
  
  // Add formatted versions
  const enhancedStats = {
    ...stats,
    formattedRevenue: formatCurrency(stats.totalRevenue),
    completionRate: stats.totalRequests > 0 
      ? Math.round((stats.completedRequests / stats.totalRequests) * 100) 
      : 0,
    pendingRequestsPercentage: stats.totalRequests > 0 
      ? Math.round((stats.pendingRequests / stats.totalRequests) * 100) 
      : 0
  };
  
  sendSuccessResponse(res, enhancedStats, 'Dashboard statistics retrieved successfully');
}));

// Get recent activity
router.get('/recent-activity', handleAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  
  try {
    // Get recent service requests using encrypted service
    const allRequests = await encryptedServiceRequestService.getAll();
    const recentRequests = allRequests
      .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
      .slice(0, parseInt(limit));
    
    // Get all citizens using encrypted service - handle the response structure
    const citizensData = await encryptedCitizenService.getAll();
    const citizensList = Array.isArray(citizensData) ? citizensData : 
                         (citizensData && citizensData.data ? citizensData.data : []);
    
    const citizensMap = {};
    citizensList.forEach(citizen => {
      citizensMap[citizen.id] = citizen;
    });
    
    // Enhance with status icons, colors, and decrypted citizen names
    const enhancedActivity = recentRequests.map(request => {
      const citizen = citizensMap[request.citizenId];
      return {
        ...request,
        statusInfo: getStatusInfo(request.status),
        formattedDate: new Date(request.submittedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        citizenName: citizen ? `${citizen.firstName} ${citizen.lastName}` : 'Unknown Citizen'
      };
    });
    
    sendSuccessResponse(res, enhancedActivity, 'Recent activity retrieved successfully');
  } catch (error) {
    console.error('Dashboard recent activity error:', error);
    throw error;
  }
}));

// Get service request trends
router.get('/trends/requests', handleAsync(async (req, res) => {
  const { period = '30' } = req.query; // days
  
  const allRequests = await encryptedServiceRequestService.getAll();
  
  // Filter requests by period
  const periodDays = parseInt(period);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  
  const filteredRequests = allRequests.filter(request => 
    new Date(request.submittedDate) >= cutoffDate
  );
  
  // Group by day
  const dailyStats = {};
  
  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    dailyStats[dateKey] = {
      date: dateKey,
      submitted: 0,
      completed: 0,
      total: 0
    };
  }
  
  filteredRequests.forEach(request => {
    const dateKey = new Date(request.submittedDate).toISOString().split('T')[0];
    if (dailyStats[dateKey]) {
      dailyStats[dateKey].total++;
      if (request.status === 'submitted') dailyStats[dateKey].submitted++;
      if (request.status === 'approved' || request.status === 'completed') {
        dailyStats[dateKey].completed++;
      }
    }
  });
  
  const trends = Object.values(dailyStats);
  
  sendSuccessResponse(res, trends, `Request trends for last ${period} days retrieved successfully`);
}));

// Get service category performance
router.get('/performance/categories', handleAsync(async (req, res) => {
  const allRequests = await encryptedServiceRequestService.getAll();
  const allServices = await serviceTypeService.getAll();
  
  // Group requests by category
  const categoryStats = {};
  
  allRequests.forEach(request => {
    const category = request.category;
    if (!categoryStats[category]) {
      categoryStats[category] = {
        category,
        totalRequests: 0,
        completed: 0,
        pending: 0,
        rejected: 0,
        averageProcessingTime: 0,
        totalRevenue: 0
      };
    }
    
    categoryStats[category].totalRequests++;
    
    if (request.status === 'approved' || request.status === 'completed') {
      categoryStats[category].completed++;
    } else if (request.status === 'submitted' || request.status === 'in_review' || request.status === 'pending_documents') {
      categoryStats[category].pending++;
    } else if (request.status === 'rejected') {
      categoryStats[category].rejected++;
    }
    
    if (request.fee) {
      categoryStats[category].totalRevenue += request.fee;
    }
  });
  
  // Calculate completion rates and format
  const performanceData = Object.values(categoryStats).map(category => ({
    ...category,
    completionRate: category.totalRequests > 0 
      ? Math.round((category.completed / category.totalRequests) * 100) 
      : 0,
    formattedRevenue: formatCurrency(category.totalRevenue)
  }));
  
  // Sort by completion rate
  performanceData.sort((a, b) => b.completionRate - a.completionRate);
  
  sendSuccessResponse(res, performanceData, 'Category performance data retrieved successfully');
}));

// Get agency workload distribution
router.get('/workload/agencies', handleAsync(async (req, res) => {
  const allRequests = await encryptedServiceRequestService.getAll();
  const agencies = await agencyService.getAll();
  
  const agencyWorkload = agencies.map(agency => {
    const agencyRequests = allRequests.filter(request => request.agencyName === agency.name);
    
    const statusDistribution = {
      submitted: 0,
      in_review: 0,
      pending_documents: 0,
      approved: 0,
      rejected: 0,
      completed: 0
    };
    
    let totalRevenue = 0;
    
    agencyRequests.forEach(request => {
      statusDistribution[request.status] = (statusDistribution[request.status] || 0) + 1;
      totalRevenue += request.fee || 0;
    });
    
    return {
      agencyId: agency.id,
      agencyName: agency.name,
      category: agency.category,
      totalRequests: agencyRequests.length,
      statusDistribution,
      pendingRequests: statusDistribution.submitted + statusDistribution.in_review + statusDistribution.pending_documents,
      completedRequests: statusDistribution.approved + statusDistribution.completed,
      totalRevenue,
      formattedRevenue: formatCurrency(totalRevenue),
      workloadPercentage: allRequests.length > 0 
        ? Math.round((agencyRequests.length / allRequests.length) * 100) 
        : 0
    };
  });
  
  // Sort by total requests
  agencyWorkload.sort((a, b) => b.totalRequests - a.totalRequests);
  
  sendSuccessResponse(res, agencyWorkload, 'Agency workload distribution retrieved successfully');
}));

// Get citizen engagement metrics
router.get('/engagement/citizens', handleAsync(async (req, res) => {
  const citizens = await encryptedCitizenService.getAll();
  const allRequests = await encryptedServiceRequestService.getAll();
  
  // Calculate engagement metrics
  const totalCitizens = citizens.length;
  const activeCitizens = [...new Set(allRequests.map(r => r.citizenId))].length;
  const engagementRate = totalCitizens > 0 ? Math.round((activeCitizens / totalCitizens) * 100) : 0;
  
  // Age group analysis
  const today = new Date();
  const ageGroups = {
    '18-25': { count: 0, active: 0 },
    '26-35': { count: 0, active: 0 },
    '36-50': { count: 0, active: 0 },
    '51-65': { count: 0, active: 0 },
    '65+': { count: 0, active: 0 }
  };
  
  const activeCitizenIds = new Set(allRequests.map(r => r.citizenId));
  
  citizens.forEach(citizen => {
    const birthDate = new Date(citizen.dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    const isActive = activeCitizenIds.has(citizen.id);
    
    let ageGroup;
    if (age >= 18 && age <= 25) ageGroup = '18-25';
    else if (age >= 26 && age <= 35) ageGroup = '26-35';
    else if (age >= 36 && age <= 50) ageGroup = '36-50';
    else if (age >= 51 && age <= 65) ageGroup = '51-65';
    else if (age > 65) ageGroup = '65+';
    
    if (ageGroup) {
      ageGroups[ageGroup].count++;
      if (isActive) ageGroups[ageGroup].active++;
    }
  });
  
  // Calculate engagement rates by age group
  Object.keys(ageGroups).forEach(group => {
    ageGroups[group].engagementRate = ageGroups[group].count > 0 
      ? Math.round((ageGroups[group].active / ageGroups[group].count) * 100) 
      : 0;
  });
  
  const engagementMetrics = {
    totalCitizens,
    activeCitizens,
    engagementRate,
    averageRequestsPerCitizen: activeCitizens > 0 
      ? Math.round((allRequests.length / activeCitizens) * 10) / 10 
      : 0,
    ageGroupEngagement: ageGroups,
    newRegistrationsLastMonth: getNewRegistrationsLastMonth(citizens)
  };
  
  sendSuccessResponse(res, engagementMetrics, 'Citizen engagement metrics retrieved successfully');
}));

// Get revenue analytics
router.get('/analytics/revenue', handleAsync(async (req, res) => {
  const allRequests = await encryptedServiceRequestService.getAll();
  const { period = '12' } = req.query; // months
  
  // Monthly revenue for the specified period
  const monthlyRevenue = {};
  const today = new Date();
  
  for (let i = parseInt(period) - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
    monthlyRevenue[monthKey] = 0;
  }
  
  allRequests.forEach(request => {
    const requestDate = new Date(request.submittedDate);
    const monthKey = requestDate.toISOString().slice(0, 7);
    
    if (monthlyRevenue.hasOwnProperty(monthKey) && request.fee) {
      monthlyRevenue[monthKey] += request.fee;
    }
  });
  
  const revenueByCategory = {};
  const revenueByAgency = {};
  
  allRequests.forEach(request => {
    if (request.fee) {
      revenueByCategory[request.category] = (revenueByCategory[request.category] || 0) + request.fee;
      revenueByAgency[request.agencyName] = (revenueByAgency[request.agencyName] || 0) + request.fee;
    }
  });
  
  const totalRevenue = Object.values(monthlyRevenue).reduce((sum, amount) => sum + amount, 0);
  const averageMonthlyRevenue = totalRevenue / parseInt(period);
  
  const revenueAnalytics = {
    totalRevenue,
    formattedTotalRevenue: formatCurrency(totalRevenue),
    averageMonthlyRevenue: Math.round(averageMonthlyRevenue),
    formattedAverageMonthlyRevenue: formatCurrency(averageMonthlyRevenue),
    monthlyBreakdown: Object.entries(monthlyRevenue).map(([month, amount]) => ({
      month,
      amount,
      formattedAmount: formatCurrency(amount)
    })),
    topRevenueCategories: Object.entries(revenueByCategory)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        formattedAmount: formatCurrency(amount)
      })),
    topRevenueAgencies: Object.entries(revenueByAgency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([agency, amount]) => ({
        agency,
        amount,
        formattedAmount: formatCurrency(amount)
      }))
  };
  
  sendSuccessResponse(res, revenueAnalytics, 'Revenue analytics retrieved successfully');
}));

// Helper functions
function getStatusInfo(status) {
  const statusMap = {
    submitted: { color: '#3b82f6', icon: '📝', label: 'Submitted' },
    in_review: { color: '#f59e0b', icon: '👀', label: 'In Review' },
    pending_documents: { color: '#ef4444', icon: '📋', label: 'Pending Docs' },
    approved: { color: '#10b981', icon: '✅', label: 'Approved' },
    rejected: { color: '#dc2626', icon: '❌', label: 'Rejected' },
    completed: { color: '#059669', icon: '🎉', label: 'Completed' }
  };
  
  return statusMap[status] || { color: '#6b7280', icon: '❓', label: 'Unknown' };
}

function getNewRegistrationsLastMonth(citizens) {
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  
  return citizens.filter(citizen => 
    new Date(citizen.createdAt) >= oneMonthAgo
  ).length;
}

module.exports = router;