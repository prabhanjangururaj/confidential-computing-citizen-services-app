const express = require('express');
const router = express.Router();
const { encryptedServiceRequestService } = require('../database/encryptedDb');
const { validateServiceRequest, sanitizeInput, sendErrorResponse, sendSuccessResponse, handleAsync, paginate } = require('../utils/helpers');

// Get all service requests with optional filtering and pagination
router.get('/', handleAsync(async (req, res) => {
  const { page = 1, limit = 10, status, category, citizenId, priority } = req.query;
  
  let requests = await encryptedServiceRequestService.getAll();
  
  // Apply filters
  if (status) {
    requests = requests.filter(req => req.status === status);
  }
  
  if (category) {
    requests = requests.filter(req => req.category === category);
  }
  
  if (citizenId) {
    requests = requests.filter(req => req.citizenId == citizenId);
  }
  
  if (priority) {
    requests = requests.filter(req => req.priority === priority);
  }
  
  // Apply pagination
  const result = paginate(requests, parseInt(page), parseInt(limit));
  
  sendSuccessResponse(res, result, 'Service requests retrieved successfully');
}));

// Get service request by ID
router.get('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!/^\d+$/.test(id)) {
    return sendErrorResponse(res, 400, 'Invalid request ID format');
  }
  
  const request = await encryptedServiceRequestService.getById(parseInt(id));
  
  if (!request) {
    return sendErrorResponse(res, 404, 'Service request not found');
  }
  
  sendSuccessResponse(res, request, 'Service request retrieved successfully');
}));

// Get service requests by citizen ID
router.get('/citizen/:citizenId', handleAsync(async (req, res) => {
  const { citizenId } = req.params;
  
  if (!/^\d+$/.test(citizenId)) {
    return sendErrorResponse(res, 400, 'Invalid citizen ID format');
  }
  
  const requests = await encryptedServiceRequestService.getByCitizenId(parseInt(citizenId));
  
  sendSuccessResponse(res, requests, 'Citizen service requests retrieved successfully');
}));

// Create new service request
router.post('/', handleAsync(async (req, res) => {
  const requestData = {
    requestNumber: await generateRequestNumber(),
    citizenId: parseInt(req.body.citizenId),
    serviceTypeId: parseInt(req.body.serviceTypeId),
    status: 'submitted',
    priority: sanitizeInput(req.body.priority) || 'normal',
    assignedAgent: sanitizeInput(req.body.assignedAgent) || 'Auto-Assigned',
    notes: sanitizeInput(req.body.notes) || '',
    applicationData: JSON.stringify(req.body.applicationData || {})
  };
  
  // Validate service request data
  const validation = validateServiceRequest(requestData);
  if (!validation.isValid) {
    return sendErrorResponse(res, 400, 'Validation failed', validation.errors);
  }
  
  try {
    const newRequest = await encryptedServiceRequestService.create(requestData);
    sendSuccessResponse(res, newRequest, 'Service request created successfully', 201);
  } catch (error) {
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return sendErrorResponse(res, 400, 'Invalid citizen ID or service type ID');
    }
    throw error;
  }
}));

// Update service request status
router.patch('/:id/status', handleAsync(async (req, res) => {
  const { id } = req.params;
  const { status, comments, changedBy } = req.body;
  
  if (!/^\d+$/.test(id)) {
    return sendErrorResponse(res, 400, 'Invalid request ID format');
  }
  
  const validStatuses = ['submitted', 'in_review', 'pending_documents', 'approved', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) {
    return sendErrorResponse(res, 400, 'Invalid status value', { validStatuses });
  }
  
  try {
    const updatedRequest = await encryptedServiceRequestService.updateStatus(
      parseInt(id), 
      sanitizeInput(status),
      sanitizeInput(comments),
      sanitizeInput(changedBy) || 'System'
    );
    
    if (!updatedRequest) {
      return sendErrorResponse(res, 404, 'Service request not found');
    }
    
    sendSuccessResponse(res, updatedRequest, 'Service request status updated successfully');
  } catch (error) {
    throw error;
  }
}));

// Get service request statistics
router.get('/stats/overview', handleAsync(async (req, res) => {
  const requests = await encryptedServiceRequestService.getAll();
  
  // Status distribution
  const statusStats = {};
  const categoryStats = {};
  const priorityStats = {};
  const agencyStats = {};
  
  requests.forEach(req => {
    statusStats[req.status] = (statusStats[req.status] || 0) + 1;
    categoryStats[req.category] = (categoryStats[req.category] || 0) + 1;
    priorityStats[req.priority] = (priorityStats[req.priority] || 0) + 1;
    agencyStats[req.agencyName] = (agencyStats[req.agencyName] || 0) + 1;
  });
  
  // Calculate processing times
  const completedRequests = requests.filter(req => req.completedDate);
  const avgProcessingTime = completedRequests.length > 0 
    ? completedRequests.reduce((sum, req) => {
        const submitted = new Date(req.submittedDate);
        const completed = new Date(req.completedDate);
        return sum + (completed - submitted);
      }, 0) / completedRequests.length / (1000 * 60 * 60 * 24) // Convert to days
    : 0;
  
  // Recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentRequests = requests.filter(req => 
    new Date(req.submittedDate) >= thirtyDaysAgo
  ).length;
  
  const stats = {
    totalRequests: requests.length,
    statusDistribution: statusStats,
    categoryDistribution: categoryStats,
    priorityDistribution: priorityStats,
    agencyWorkload: agencyStats,
    averageProcessingDays: Math.round(avgProcessingTime * 10) / 10,
    recentActivity: recentRequests,
    pendingRequests: (statusStats.submitted || 0) + (statusStats.in_review || 0) + (statusStats.pending_documents || 0),
    completionRate: requests.length > 0 ? Math.round(((statusStats.approved || 0) + (statusStats.completed || 0)) / requests.length * 100) : 0
  };
  
  sendSuccessResponse(res, stats, 'Service request statistics retrieved successfully');
}));

// Get requests by status
router.get('/status/:status', handleAsync(async (req, res) => {
  const { status } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const validStatuses = ['submitted', 'in_review', 'pending_documents', 'approved', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) {
    return sendErrorResponse(res, 400, 'Invalid status value', { validStatuses });
  }
  
  let requests = await encryptedServiceRequestService.getAll();
  requests = requests.filter(req => req.status === status);
  
  const result = paginate(requests, parseInt(page), parseInt(limit));
  
  sendSuccessResponse(res, result, `Service requests with status '${status}' retrieved successfully`);
}));

// Search service requests
router.get('/search/:term', handleAsync(async (req, res) => {
  const { term } = req.params;
  const { page = 1, limit = 10 } = req.query;
  
  const searchTerm = term.toLowerCase();
  let requests = await encryptedServiceRequestService.getAll();
  
  // Search across multiple fields
  requests = requests.filter(req => 
    req.requestNumber.toLowerCase().includes(searchTerm) ||
    req.serviceName.toLowerCase().includes(searchTerm) ||
    req.firstName.toLowerCase().includes(searchTerm) ||
    req.lastName.toLowerCase().includes(searchTerm) ||
    req.agencyName.toLowerCase().includes(searchTerm) ||
    (req.notes && req.notes.toLowerCase().includes(searchTerm))
  );
  
  const result = paginate(requests, parseInt(page), parseInt(limit));
  
  sendSuccessResponse(res, result, `Search results for '${term}'`);
}));

// Generate unique request number
async function generateRequestNumber() {
  const year = new Date().getFullYear();
  const requests = await encryptedServiceRequestService.getAll();
  
  // Find the highest number for current year
  const currentYearRequests = requests.filter(req => 
    req.requestNumber.startsWith(`REQ-${year}-`)
  );
  
  let highestNumber = 0;
  currentYearRequests.forEach(req => {
    const num = parseInt(req.requestNumber.split('-')[2]);
    if (num > highestNumber) highestNumber = num;
  });
  
  const nextNumber = (highestNumber + 1).toString().padStart(3, '0');
  return `REQ-${year}-${nextNumber}`;
}

module.exports = router;