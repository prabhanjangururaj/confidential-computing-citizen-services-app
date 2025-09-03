const express = require('express');
const router = express.Router();
const { agencyService, serviceTypeService } = require('../database/db');
const { sanitizeInput, sendErrorResponse, sendSuccessResponse, handleAsync } = require('../utils/helpers');

// Get all government agencies
router.get('/', handleAsync(async (req, res) => {
  const { category } = req.query;
  
  let agencies = await agencyService.getAll();
  
  // Apply category filter if provided
  if (category) {
    agencies = agencies.filter(agency => 
      agency.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Enhance each agency with additional information
  const enhancedAgencies = await Promise.all(
    agencies.map(async (agency) => {
      const services = await serviceTypeService.getAll();
      const agencyServices = services.filter(service => service.agencyId === agency.id);
      
      return {
        ...agency,
        serviceCount: agencyServices.length,
        serviceCategories: [...new Set(agencyServices.map(s => s.category))],
        contactInfo: {
          email: agency.contactEmail,
          phone: agency.contactPhone,
          website: agency.website,
          hours: agency.officeHours
        }
      };
    })
  );
  
  sendSuccessResponse(res, enhancedAgencies, 'Government agencies retrieved successfully');
}));

// Get agency by ID
router.get('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  if (!/^\d+$/.test(id)) {
    return sendErrorResponse(res, 400, 'Invalid agency ID format');
  }
  
  const agency = await agencyService.getById(parseInt(id));
  
  if (!agency) {
    return sendErrorResponse(res, 404, 'Government agency not found');
  }
  
  // Get services offered by this agency
  const allServices = await serviceTypeService.getAll();
  const agencyServices = allServices.filter(service => service.agencyId === agency.id);
  
  const detailedAgency = {
    ...agency,
    services: agencyServices.map(service => ({
      id: service.id,
      name: service.name,
      category: service.category,
      fee: service.fee,
      processingDays: service.processingDays,
      description: service.description
    })),
    statistics: {
      totalServices: agencyServices.length,
      servicesByCategory: agencyServices.reduce((acc, service) => {
        acc[service.category] = (acc[service.category] || 0) + 1;
        return acc;
      }, {}),
      averageProcessingTime: agencyServices.length > 0 
        ? Math.round(agencyServices.reduce((sum, s) => sum + s.processingDays, 0) / agencyServices.length)
        : 0,
      totalFees: agencyServices.reduce((sum, s) => sum + s.fee, 0)
    },
    contactInfo: {
      email: agency.contactEmail,
      phone: agency.contactPhone,
      website: agency.website,
      hours: agency.officeHours
    }
  };
  
  sendSuccessResponse(res, detailedAgency, 'Government agency details retrieved successfully');
}));

// Get agencies by category
router.get('/category/:category', handleAsync(async (req, res) => {
  const { category } = req.params;
  
  const agencies = await agencyService.getAll();
  const categoryAgencies = agencies.filter(agency => 
    agency.category.toLowerCase() === category.toLowerCase()
  );
  
  if (categoryAgencies.length === 0) {
    return sendErrorResponse(res, 404, 'No agencies found for this category');
  }
  
  // Enhance with service information
  const enhancedAgencies = await Promise.all(
    categoryAgencies.map(async (agency) => {
      const allServices = await serviceTypeService.getAll();
      const agencyServices = allServices.filter(service => service.agencyId === agency.id);
      
      return {
        ...agency,
        serviceCount: agencyServices.length,
        popularServices: agencyServices.slice(0, 3).map(s => ({ id: s.id, name: s.name })),
        contactInfo: {
          email: agency.contactEmail,
          phone: agency.contactPhone,
          website: agency.website,
          hours: agency.officeHours
        }
      };
    })
  );
  
  sendSuccessResponse(res, enhancedAgencies, `Agencies in category '${category}' retrieved successfully`);
}));

// Get all agency categories
router.get('/meta/categories', handleAsync(async (req, res) => {
  const agencies = await agencyService.getAll();
  
  const categoryStats = {};
  
  agencies.forEach(agency => {
    if (!categoryStats[agency.category]) {
      categoryStats[agency.category] = {
        name: agency.category,
        count: 0,
        agencies: []
      };
    }
    
    categoryStats[agency.category].count++;
    categoryStats[agency.category].agencies.push({
      id: agency.id,
      name: agency.name,
      description: agency.description
    });
  });
  
  sendSuccessResponse(res, Object.values(categoryStats), 'Agency categories retrieved successfully');
}));

// Search agencies
router.get('/search/:term', handleAsync(async (req, res) => {
  const { term } = req.params;
  
  const searchTerm = term.toLowerCase();
  const agencies = await agencyService.getAll();
  
  const matchingAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchTerm) ||
    agency.description.toLowerCase().includes(searchTerm) ||
    agency.category.toLowerCase().includes(searchTerm)
  );
  
  // Enhance with service information
  const enhancedAgencies = await Promise.all(
    matchingAgencies.map(async (agency) => {
      const allServices = await serviceTypeService.getAll();
      const agencyServices = allServices.filter(service => service.agencyId === agency.id);
      
      return {
        ...agency,
        serviceCount: agencyServices.length,
        contactInfo: {
          email: agency.contactEmail,
          phone: agency.contactPhone,
          website: agency.website,
          hours: agency.officeHours
        }
      };
    })
  );
  
  sendSuccessResponse(res, enhancedAgencies, `Search results for '${term}'`);
}));

// Get agency contact directory
router.get('/meta/directory', handleAsync(async (req, res) => {
  const agencies = await agencyService.getAll();
  
  const directory = agencies.map(agency => ({
    id: agency.id,
    name: agency.name,
    category: agency.category,
    contact: {
      email: agency.contactEmail,
      phone: agency.contactPhone,
      website: agency.website,
      hours: agency.officeHours
    },
    description: agency.description
  }));
  
  // Sort by name for easy browsing
  directory.sort((a, b) => a.name.localeCompare(b.name));
  
  sendSuccessResponse(res, directory, 'Agency contact directory retrieved successfully');
}));

// Get agency workload statistics
router.get('/meta/workload', handleAsync(async (req, res) => {
  const agencies = await agencyService.getAll();
  const allServices = await serviceTypeService.getAll();
  
  const workloadStats = agencies.map(agency => {
    const agencyServices = allServices.filter(service => service.agencyId === agency.id);
    
    return {
      agencyId: agency.id,
      agencyName: agency.name,
      category: agency.category,
      serviceCount: agencyServices.length,
      totalFees: agencyServices.reduce((sum, s) => sum + s.fee, 0),
      averageProcessingTime: agencyServices.length > 0 
        ? Math.round(agencyServices.reduce((sum, s) => sum + s.processingDays, 0) / agencyServices.length)
        : 0,
      serviceTypes: [...new Set(agencyServices.map(s => s.category))]
    };
  });
  
  // Sort by service count descending
  workloadStats.sort((a, b) => b.serviceCount - a.serviceCount);
  
  sendSuccessResponse(res, workloadStats, 'Agency workload statistics retrieved successfully');
}));

// Get agency performance metrics
router.get('/meta/performance', handleAsync(async (req, res) => {
  const agencies = await agencyService.getAll();
  const allServices = await serviceTypeService.getAll();
  
  const performanceMetrics = agencies.map(agency => {
    const agencyServices = allServices.filter(service => service.agencyId === agency.id);
    
    // Calculate efficiency scores
    const avgProcessingTime = agencyServices.length > 0 
      ? agencyServices.reduce((sum, s) => sum + s.processingDays, 0) / agencyServices.length
      : 0;
    
    // Efficiency score: lower processing time = higher efficiency
    const efficiencyScore = avgProcessingTime > 0 ? Math.max(1, 10 - (avgProcessingTime / 3)) : 5;
    
    // Service diversity score
    const uniqueCategories = [...new Set(agencyServices.map(s => s.category))].length;
    const diversityScore = Math.min(10, uniqueCategories * 2);
    
    // Overall performance score
    const overallScore = (efficiencyScore + diversityScore) / 2;
    
    return {
      agencyId: agency.id,
      agencyName: agency.name,
      category: agency.category,
      metrics: {
        efficiency: Math.round(efficiencyScore * 10) / 10,
        diversity: Math.round(diversityScore * 10) / 10,
        overall: Math.round(overallScore * 10) / 10
      },
      serviceCount: agencyServices.length,
      averageProcessingDays: Math.round(avgProcessingTime)
    };
  });
  
  // Sort by overall performance descending
  performanceMetrics.sort((a, b) => b.metrics.overall - a.metrics.overall);
  
  sendSuccessResponse(res, performanceMetrics, 'Agency performance metrics retrieved successfully');
}));

// Get agency office hours summary
router.get('/meta/hours', handleAsync(async (req, res) => {
  const agencies = await agencyService.getAll();
  
  const hoursInfo = agencies.map(agency => ({
    agencyId: agency.id,
    agencyName: agency.name,
    category: agency.category,
    officeHours: agency.officeHours,
    contact: {
      phone: agency.contactPhone,
      email: agency.contactEmail
    }
  }));
  
  // Group by hours pattern for analysis
  const hoursPatterns = {};
  hoursInfo.forEach(agency => {
    const hours = agency.officeHours;
    if (!hoursPatterns[hours]) {
      hoursPatterns[hours] = [];
    }
    hoursPatterns[hours].push({
      id: agency.agencyId,
      name: agency.agencyName,
      category: agency.category
    });
  });
  
  sendSuccessResponse(res, {
    agencies: hoursInfo,
    patterns: hoursPatterns
  }, 'Agency office hours retrieved successfully');
}));

module.exports = router;