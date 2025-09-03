const express = require('express');
const router = express.Router();
const { serviceTypeService } = require('../database/db');
const { sanitizeInput, sendErrorResponse, sendSuccessResponse, handleAsync, formatCurrency } = require('../utils/helpers');

// Get all service types
router.get('/', handleAsync(async (req, res) => {
  const { category, agency } = req.query;
  
  let services = await serviceTypeService.getAll();
  
  // Apply category filter if provided
  if (category) {
    services = services.filter(service => 
      service.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Apply agency filter if provided
  if (agency) {
    services = services.filter(service => 
      service.agencyName.toLowerCase().includes(agency.toLowerCase())
    );
  }
  
  // Format the response with additional calculated fields
  const formattedServices = services.map(service => ({
    ...service,
    formattedFee: service.fee > 0 ? formatCurrency(service.fee) : 'Free',
    estimatedCompletion: `${service.processingDays} business days`,
    requiredDocumentsList: service.requiredDocuments ? service.requiredDocuments.split(', ') : []
  }));
  
  sendSuccessResponse(res, formattedServices, 'Service types retrieved successfully');
}));

// Get service type by ID
router.get('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!/^\d+$/.test(id)) {
    return sendErrorResponse(res, 400, 'Invalid service type ID format');
  }
  
  const services = await serviceTypeService.getAll();
  const service = services.find(s => s.id === parseInt(id));
  
  if (!service) {
    return sendErrorResponse(res, 404, 'Service type not found');
  }
  
  // Enhanced service details
  const detailedService = {
    ...service,
    formattedFee: service.fee > 0 ? formatCurrency(service.fee) : 'Free',
    estimatedCompletion: `${service.processingDays} business days`,
    requiredDocumentsList: service.requiredDocuments ? service.requiredDocuments.split(', ') : [],
    costCategory: getCostCategory(service.fee),
    urgencyLevel: getUrgencyLevel(service.processingDays)
  };
  
  sendSuccessResponse(res, detailedService, 'Service type retrieved successfully');
}));

// Get services by category
router.get('/category/:category', handleAsync(async (req, res) => {
  const { category } = req.params;
  
  const services = await serviceTypeService.getByCategory(sanitizeInput(category));
  
  if (services.length === 0) {
    return sendErrorResponse(res, 404, 'No services found for this category');
  }
  
  const formattedServices = services.map(service => ({
    ...service,
    formattedFee: service.fee > 0 ? formatCurrency(service.fee) : 'Free',
    estimatedCompletion: `${service.processingDays} business days`,
    requiredDocumentsList: service.requiredDocuments ? service.requiredDocuments.split(', ') : []
  }));
  
  sendSuccessResponse(res, formattedServices, `Services in category '${category}' retrieved successfully`);
}));

// Get all available categories
router.get('/meta/categories', handleAsync(async (req, res) => {
  const services = await serviceTypeService.getAll();
  
  const categoryStats = {};
  services.forEach(service => {
    if (!categoryStats[service.category]) {
      categoryStats[service.category] = {
        name: service.category,
        count: 0,
        services: [],
        averageFee: 0,
        averageProcessingDays: 0
      };
    }
    
    categoryStats[service.category].count++;
    categoryStats[service.category].services.push({
      id: service.id,
      name: service.name,
      fee: service.fee,
      processingDays: service.processingDays
    });
  });
  
  // Calculate averages for each category
  Object.values(categoryStats).forEach(category => {
    const totalFees = category.services.reduce((sum, service) => sum + service.fee, 0);
    const totalDays = category.services.reduce((sum, service) => sum + service.processingDays, 0);
    
    category.averageFee = totalFees / category.count;
    category.averageProcessingDays = Math.round(totalDays / category.count);
    category.formattedAverageFee = category.averageFee > 0 ? formatCurrency(category.averageFee) : 'Free';
    
    // Remove individual services from response to keep it concise
    delete category.services;
  });
  
  sendSuccessResponse(res, Object.values(categoryStats), 'Service categories retrieved successfully');
}));

// Get popular services (most requested)
router.get('/meta/popular', handleAsync(async (req, res) => {
  const { limit = 5 } = req.query;
  
  // This would ideally count actual requests, but for now we'll return a curated list
  const services = await serviceTypeService.getAll();
  
  // Simulate popularity based on service characteristics
  const popularServices = services
    .map(service => ({
      ...service,
      formattedFee: service.fee > 0 ? formatCurrency(service.fee) : 'Free',
      estimatedCompletion: `${service.processingDays} business days`,
      popularityScore: calculatePopularityScore(service)
    }))
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, parseInt(limit));
  
  sendSuccessResponse(res, popularServices, 'Popular services retrieved successfully');
}));

// Search service types
router.get('/search/:term', handleAsync(async (req, res) => {
  const { term } = req.params;
  
  const searchTerm = term.toLowerCase();
  const services = await serviceTypeService.getAll();
  
  const matchingServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm) ||
    service.description.toLowerCase().includes(searchTerm) ||
    service.category.toLowerCase().includes(searchTerm) ||
    service.agencyName.toLowerCase().includes(searchTerm)
  );
  
  const formattedServices = matchingServices.map(service => ({
    ...service,
    formattedFee: service.fee > 0 ? formatCurrency(service.fee) : 'Free',
    estimatedCompletion: `${service.processingDays} business days`,
    requiredDocumentsList: service.requiredDocuments ? service.requiredDocuments.split(', ') : []
  }));
  
  sendSuccessResponse(res, formattedServices, `Search results for '${term}'`);
}));

// Get service fees summary
router.get('/meta/fees', handleAsync(async (req, res) => {
  const services = await serviceTypeService.getAll();
  
  const freeServices = services.filter(s => s.fee === 0);
  const paidServices = services.filter(s => s.fee > 0);
  
  const feeStats = {
    totalServices: services.length,
    freeServices: freeServices.length,
    paidServices: paidServices.length,
    averageFee: paidServices.length > 0 
      ? paidServices.reduce((sum, s) => sum + s.fee, 0) / paidServices.length 
      : 0,
    highestFee: paidServices.length > 0 
      ? Math.max(...paidServices.map(s => s.fee)) 
      : 0,
    lowestFee: paidServices.length > 0 
      ? Math.min(...paidServices.map(s => s.fee)) 
      : 0,
    formattedAverageFee: formatCurrency(
      paidServices.length > 0 
        ? paidServices.reduce((sum, s) => sum + s.fee, 0) / paidServices.length 
        : 0
    ),
    formattedHighestFee: formatCurrency(
      paidServices.length > 0 
        ? Math.max(...paidServices.map(s => s.fee)) 
        : 0
    ),
    formattedLowestFee: formatCurrency(
      paidServices.length > 0 
        ? Math.min(...paidServices.map(s => s.fee)) 
        : 0
    )
  };
  
  sendSuccessResponse(res, feeStats, 'Service fee statistics retrieved successfully');
}));

// Get processing time statistics
router.get('/meta/processing-times', handleAsync(async (req, res) => {
  const services = await serviceTypeService.getAll();
  
  const processingStats = {
    averageProcessingDays: Math.round(
      services.reduce((sum, s) => sum + s.processingDays, 0) / services.length
    ),
    fastestService: Math.min(...services.map(s => s.processingDays)),
    slowestService: Math.max(...services.map(s => s.processingDays)),
    distributionBySpeed: {
      fast: services.filter(s => s.processingDays <= 7).length,      // <= 1 week
      medium: services.filter(s => s.processingDays > 7 && s.processingDays <= 21).length, // 1-3 weeks
      slow: services.filter(s => s.processingDays > 21).length       // > 3 weeks
    }
  };
  
  sendSuccessResponse(res, processingStats, 'Processing time statistics retrieved successfully');
}));

// Helper functions
function getCostCategory(fee) {
  if (fee === 0) return 'Free';
  if (fee <= 50) return 'Low Cost';
  if (fee <= 150) return 'Moderate Cost';
  return 'High Cost';
}

function getUrgencyLevel(processingDays) {
  if (processingDays <= 5) return 'Fast';
  if (processingDays <= 14) return 'Standard';
  return 'Extended';
}

function calculatePopularityScore(service) {
  // Simple scoring algorithm based on service characteristics
  let score = 0;
  
  // Free services tend to be more popular
  if (service.fee === 0) score += 3;
  else if (service.fee <= 100) score += 2;
  else score += 1;
  
  // Faster processing tends to be more popular
  if (service.processingDays <= 7) score += 3;
  else if (service.processingDays <= 14) score += 2;
  else score += 1;
  
  // Some categories are inherently more popular
  if (service.category.includes('Permits') || service.category.includes('Licenses')) score += 2;
  
  return score;
}

module.exports = router;