const express = require('express');
const router = express.Router();
const { encryptedCitizenService } = require('../database/encryptedDb');
const { validateCitizen, sanitizeInput, sendErrorResponse, sendSuccessResponse, handleAsync, paginate } = require('../utils/helpers');

// Get all citizens with optional pagination and search
router.get('/', handleAsync(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  
  let citizens = await encryptedCitizenService.getAll();
  
  // Apply search filter if provided
  if (search) {
    const searchTerm = search.toLowerCase();
    citizens = citizens.filter(citizen => 
      citizen.firstName.toLowerCase().includes(searchTerm) ||
      citizen.lastName.toLowerCase().includes(searchTerm) ||
      citizen.email.toLowerCase().includes(searchTerm) ||
      citizen.citizenId.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply pagination
  const result = paginate(citizens, parseInt(page), parseInt(limit));
  
  sendSuccessResponse(res, result, 'Citizens retrieved successfully');
}));

// Get citizen by ID
router.get('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!/^\d+$/.test(id)) {
    return sendErrorResponse(res, 400, 'Invalid citizen ID format');
  }
  
  const citizen = await encryptedCitizenService.getById(parseInt(id));
  
  if (!citizen) {
    return sendErrorResponse(res, 404, 'Citizen not found');
  }
  
  sendSuccessResponse(res, citizen, 'Citizen retrieved successfully');
}));

// Get citizen by citizen ID (e.g., CTZ001)
router.get('/citizen-id/:citizenId', handleAsync(async (req, res) => {
  const { citizenId } = req.params;
  
  const citizen = await encryptedCitizenService.getByCitizenId(sanitizeInput(citizenId));
  
  if (!citizen) {
    return sendErrorResponse(res, 404, 'Citizen not found');
  }
  
  sendSuccessResponse(res, citizen, 'Citizen retrieved successfully');
}));

// Create new citizen
router.post('/', handleAsync(async (req, res) => {
  const citizenData = {
    citizenId: sanitizeInput(req.body.citizenId),
    firstName: sanitizeInput(req.body.firstName),
    lastName: sanitizeInput(req.body.lastName),
    email: sanitizeInput(req.body.email) || 'demo@example.com',
    phone: sanitizeInput(req.body.phone) || '000-000-0000',
    address: sanitizeInput(req.body.address) || 'Demo Address',
    city: sanitizeInput(req.body.city) || 'Springfield',
    state: sanitizeInput(req.body.state) || 'IL',
    zipCode: sanitizeInput(req.body.zipCode) || '62701',
    dateOfBirth: sanitizeInput(req.body.dateOfBirth) || '1990-01-01'
  };
  
  // Validate citizen data
  const validation = validateCitizen(citizenData);
  if (!validation.isValid) {
    return sendErrorResponse(res, 400, 'Validation failed', validation.errors);
  }
  
  try {
    const newCitizen = await encryptedCitizenService.create(citizenData);
    sendSuccessResponse(res, newCitizen, 'Citizen created successfully', 201);
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return sendErrorResponse(res, 409, 'Citizen ID or email already exists');
    }
    throw error;
  }
}));

// Update citizen
router.put('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!/^\d+$/.test(id)) {
    return sendErrorResponse(res, 400, 'Invalid citizen ID format');
  }
  
  const citizenData = {
    firstName: sanitizeInput(req.body.firstName),
    lastName: sanitizeInput(req.body.lastName),
    email: sanitizeInput(req.body.email),
    phone: sanitizeInput(req.body.phone),
    address: sanitizeInput(req.body.address),
    city: sanitizeInput(req.body.city),
    state: sanitizeInput(req.body.state),
    zipCode: sanitizeInput(req.body.zipCode)
  };
  
  // Validate citizen data (for update)
  const validation = validateCitizen(citizenData, true);
  if (!validation.isValid) {
    return sendErrorResponse(res, 400, 'Validation failed', validation.errors);
  }
  
  const updatedCitizen = await encryptedCitizenService.update(parseInt(id), citizenData);
  
  if (!updatedCitizen) {
    return sendErrorResponse(res, 404, 'Citizen not found');
  }
  
  sendSuccessResponse(res, updatedCitizen, 'Citizen updated successfully');
}));

// Get citizen statistics
router.get('/stats/overview', handleAsync(async (req, res) => {
  const citizens = await encryptedCitizenService.getAll();
  
  // Calculate age groups
  const today = new Date();
  const ageGroups = {
    '18-25': 0,
    '26-35': 0,
    '36-50': 0,
    '51-65': 0,
    '65+': 0
  };
  
  // Calculate city distribution
  const cityStats = {};
  
  citizens.forEach(citizen => {
    const birthDate = new Date(citizen.dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age >= 18 && age <= 25) ageGroups['18-25']++;
    else if (age >= 26 && age <= 35) ageGroups['26-35']++;
    else if (age >= 36 && age <= 50) ageGroups['36-50']++;
    else if (age >= 51 && age <= 65) ageGroups['51-65']++;
    else if (age > 65) ageGroups['65+']++;
    
    cityStats[citizen.city] = (cityStats[citizen.city] || 0) + 1;
  });
  
  const stats = {
    totalCitizens: citizens.length,
    activeAccounts: citizens.filter(c => c.status === 'active').length,
    ageDistribution: ageGroups,
    topCities: Object.entries(cityStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([city, count]) => ({ city, count })),
    registrationsByMonth: getRegistrationsByMonth(citizens)
  };
  
  sendSuccessResponse(res, stats, 'Citizen statistics retrieved successfully');
}));

// Helper function for registration statistics
function getRegistrationsByMonth(citizens) {
  const monthlyStats = {};
  const today = new Date();
  
  // Get last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = date.toISOString().slice(0, 7); // YYYY-MM format
    monthlyStats[key] = 0;
  }
  
  citizens.forEach(citizen => {
    const createdDate = new Date(citizen.createdAt);
    const monthKey = createdDate.toISOString().slice(0, 7);
    if (monthlyStats.hasOwnProperty(monthKey)) {
      monthlyStats[monthKey]++;
    }
  });
  
  return Object.entries(monthlyStats).map(([month, count]) => ({ month, count }));
}

module.exports = router;