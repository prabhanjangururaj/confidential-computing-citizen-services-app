// Utility functions and middleware helpers

// Async error handler wrapper
const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Citizen validation - DEMO MODE (Minimal validation)
const validateCitizen = (citizenData, isUpdate = false) => {
  const errors = [];
  const requiredFields = isUpdate 
    ? ['firstName', 'lastName']
    : ['citizenId', 'firstName', 'lastName'];
  
  // Check only essential required fields
  requiredFields.forEach(field => {
    if (!citizenData[field] || (typeof citizenData[field] === 'string' && citizenData[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  });
  
  // Very basic email check only if provided
  if (citizenData.email && citizenData.email.trim() && !citizenData.email.includes('@')) {
    errors.push('Email must contain @ symbol');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Service request validation - DEMO MODE (Minimal validation)
const validateServiceRequest = (requestData) => {
  const errors = [];
  const requiredFields = ['citizenId', 'serviceTypeId'];
  
  // Check required fields
  requiredFields.forEach(field => {
    if (requestData[field] === undefined || requestData[field] === null || requestData[field] === '') {
      errors.push(`${field} is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Employee validation (kept for backward compatibility)
const validateEmployee = (employeeData, isUpdate = false) => {
  const errors = [];
  const requiredFields = isUpdate 
    ? ['firstName', 'lastName', 'email', 'department', 'position']
    : ['employeeId', 'firstName', 'lastName', 'email', 'department', 'position', 'salary', 'hireDate'];
  
  // Check required fields
  requiredFields.forEach(field => {
    if (!employeeData[field] || (typeof employeeData[field] === 'string' && employeeData[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  });
  
  // Validate email format
  if (employeeData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeData.email)) {
    errors.push('Invalid email format');
  }
  
  // Validate employee ID format (if provided)
  if (employeeData.employeeId && !/^EMP\d{3,}$/.test(employeeData.employeeId)) {
    errors.push('Employee ID must be in format EMP### (e.g., EMP001)');
  }
  
  // Validate salary
  if (employeeData.salary !== undefined) {
    const salary = parseInt(employeeData.salary);
    if (isNaN(salary) || salary < 30000 || salary > 500000) {
      errors.push('Salary must be a number between 30,000 and 500,000');
    }
  }
  
  // Validate hire date
  if (employeeData.hireDate && !isValidDate(employeeData.hireDate)) {
    errors.push('Invalid hire date format. Use YYYY-MM-DD');
  }
  
  // Validate department
  const validDepartments = ['Engineering', 'Marketing', 'Finance', 'HR', 'Sales', 'Operations'];
  if (employeeData.department && !validDepartments.includes(employeeData.department)) {
    errors.push(`Department must be one of: ${validDepartments.join(', ')}`);
  }
  
  // Validate names (no special characters, reasonable length)
  if (employeeData.firstName && !/^[a-zA-Z\s]{1,50}$/.test(employeeData.firstName)) {
    errors.push('First name must contain only letters and spaces, max 50 characters');
  }
  
  if (employeeData.lastName && !/^[a-zA-Z\s]{1,50}$/.test(employeeData.lastName)) {
    errors.push('Last name must contain only letters and spaces, max 50 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Performance review validation
const validateReview = (reviewData) => {
  const errors = [];
  const requiredFields = ['employeeId', 'reviewPeriod', 'overallScore', 'goalsAchievement'];
  
  // Check required fields
  requiredFields.forEach(field => {
    if (reviewData[field] === undefined || reviewData[field] === null || reviewData[field] === '') {
      errors.push(`${field} is required`);
    }
  });
  
  // Validate employee ID
  if (reviewData.employeeId !== undefined) {
    const empId = parseInt(reviewData.employeeId);
    if (isNaN(empId) || empId <= 0) {
      errors.push('Employee ID must be a positive number');
    }
  }
  
  // Validate review period format
  if (reviewData.reviewPeriod && !/^\d{4}-Q[1-4]$/.test(reviewData.reviewPeriod)) {
    errors.push('Review period must be in format YYYY-Q# (e.g., 2023-Q4)');
  }
  
  // Validate overall score
  if (reviewData.overallScore !== undefined) {
    const score = parseFloat(reviewData.overallScore);
    if (isNaN(score) || score < 1 || score > 5) {
      errors.push('Overall score must be a number between 1 and 5');
    }
  }
  
  // Validate goals achievement
  if (reviewData.goalsAchievement !== undefined) {
    const goals = parseInt(reviewData.goalsAchievement);
    if (isNaN(goals) || goals < 0 || goals > 100) {
      errors.push('Goals achievement must be a number between 0 and 100');
    }
  }
  
  // Validate comments length
  if (reviewData.comments && reviewData.comments.length > 1000) {
    errors.push('Comments must be less than 1000 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Date validation helper
const isValidDate = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  
  return date.getFullYear() === year && 
         date.getMonth() + 1 === month && 
         date.getDate() === day &&
         year >= 1950 && year <= new Date().getFullYear() + 1;
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, url, ip } = req;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const logColor = statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red for errors, green for success
    const resetColor = '\x1b[0m';
    
    console.log(
      `${logColor}${method} ${url} ${statusCode} - ${duration}ms - ${ip}${resetColor}`
    );
  });
  
  next();
};

// Data sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

// Generate employee ID
const generateEmployeeId = (lastId = 0) => {
  const nextNumber = lastId + 1;
  return `EMP${nextNumber.toString().padStart(3, '0')}`;
};

// Format currency
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Calculate payroll taxes (US rates)
const calculatePayrollTaxes = (grossPay) => {
  const federalTaxRate = 0.12; // 12% federal income tax
  const stateTaxRate = 0.05; // 5% state income tax (varies by state)
  const socialSecurityRate = 0.062; // 6.2% social security
  const medicareRate = 0.0145; // 1.45% medicare
  
  const federalTax = Math.round(grossPay * federalTaxRate);
  const stateTax = Math.round(grossPay * stateTaxRate);
  const socialSecurity = Math.round(grossPay * socialSecurityRate);
  const medicare = Math.round(grossPay * medicareRate);
  
  return {
    federal: federalTax,
    state: stateTax,
    socialSecurity: socialSecurity,
    medicare: medicare,
    total: federalTax + stateTax + socialSecurity + medicare
  };
};

// Performance rating helper
const getPerformanceRating = (score) => {
  if (score >= 4.5) return { rating: 'Excellent', color: '#059669', bgcolor: '#dcfce7' };
  if (score >= 4.0) return { rating: 'Good', color: '#2563eb', bgcolor: '#dbeafe' };
  if (score >= 3.0) return { rating: 'Satisfactory', color: '#d97706', bgcolor: '#fef3c7' };
  if (score >= 2.0) return { rating: 'Needs Improvement', color: '#dc2626', bgcolor: '#fee2e2' };
  return { rating: 'Poor', color: '#991b1b', bgcolor: '#fecaca' };
};

// Error response helper
const sendErrorResponse = (res, statusCode, message, details = null) => {
  const response = {
    error: true,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
};

// Success response helper
const sendSuccessResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Pagination helper
const paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);
  
  return {
    data: paginatedItems,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNext: offset + limit < array.length,
      hasPrevious: page > 1
    }
  };
};

// Database connection health check
const checkDatabaseHealth = async (db) => {
  try {
    await new Promise((resolve, reject) => {
      db.get('SELECT 1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return { status: 'healthy', message: 'Database connection successful' };
  } catch (error) {
    return { status: 'unhealthy', message: 'Database connection failed', error: error.message };
  }
};

module.exports = {
  handleAsync,
  validateCitizen,
  validateServiceRequest,
  validateEmployee,
  validateReview,
  isValidDate,
  requestLogger,
  sanitizeInput,
  generateEmployeeId,
  formatCurrency,
  calculatePayrollTaxes,
  getPerformanceRating,
  sendErrorResponse,
  sendSuccessResponse,
  paginate,
  checkDatabaseHealth
};