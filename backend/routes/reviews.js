const express = require('express');
const { reviewService, employeeService } = require('../database/db');
const { handleAsync, validateReview } = require('../utils/helpers');

const router = express.Router();

// GET /api/reviews - Get all performance reviews
router.get('/', handleAsync(async (req, res) => {
  console.log('📝 Fetching all performance reviews');
  
  const reviews = await reviewService.getAll();
  
  console.log(`✅ Retrieved ${reviews.length} performance reviews`);
  
  res.json(reviews.map(review => ({
    id: review.id,
    employeeId: review.employeeId,
    employee: {
      id: review.employeeId,
      employeeId: review.employeeId,
      firstName: review.firstName,
      lastName: review.lastName,
      department: review.department
    },
    reviewPeriod: review.reviewPeriod,
    overallScore: parseFloat(review.overallScore),
    goalsAchievement: parseInt(review.goalsAchievement),
    comments: review.comments,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt
  })));
}));

// GET /api/reviews/employee/:id - Get reviews for specific employee
router.get('/employee/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  console.log(`👤 Fetching reviews for employee ID: ${id}`);
  
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid employee ID format'
    });
  }
  
  const reviews = await reviewService.getByEmployeeId(parseInt(id));
  
  if (reviews.length === 0) {
    // Check if employee exists
    const employee = await employeeService.getById(parseInt(id));
    if (!employee) {
      return res.status(404).json({
        error: true,
        message: 'Employee not found'
      });
    }
    
    return res.json({
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        department: employee.department
      },
      reviews: []
    });
  }
  
  console.log(`✅ Retrieved ${reviews.length} reviews for employee`);
  
  res.json({
    employee: {
      id: reviews[0].employeeId,
      firstName: reviews[0].firstName,
      lastName: reviews[0].lastName,
      department: reviews[0].department
    },
    reviews: reviews.map(review => ({
      id: review.id,
      reviewPeriod: review.reviewPeriod,
      overallScore: parseFloat(review.overallScore),
      goalsAchievement: parseInt(review.goalsAchievement),
      comments: review.comments,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }))
  });
}));

// GET /api/reviews/stats - Get review statistics
router.get('/stats', handleAsync(async (req, res) => {
  console.log('📊 Fetching performance review statistics');
  
  const reviews = await reviewService.getAll();
  
  if (reviews.length === 0) {
    return res.json({
      totalReviews: 0,
      averageScore: 0,
      averageGoalsAchievement: 0,
      scoreDistribution: {},
      departmentStats: {},
      generatedAt: new Date().toISOString()
    });
  }
  
  // Calculate statistics
  const totalReviews = reviews.length;
  const averageScore = reviews.reduce((sum, r) => sum + parseFloat(r.overallScore), 0) / totalReviews;
  const averageGoalsAchievement = reviews.reduce((sum, r) => sum + parseInt(r.goalsAchievement), 0) / totalReviews;
  
  // Score distribution
  const scoreDistribution = {
    excellent: reviews.filter(r => parseFloat(r.overallScore) >= 4.5).length,
    good: reviews.filter(r => parseFloat(r.overallScore) >= 4.0 && parseFloat(r.overallScore) < 4.5).length,
    average: reviews.filter(r => parseFloat(r.overallScore) >= 3.0 && parseFloat(r.overallScore) < 4.0).length,
    needsImprovement: reviews.filter(r => parseFloat(r.overallScore) < 3.0).length
  };
  
  // Department statistics
  const departmentStats = reviews.reduce((acc, review) => {
    const dept = review.department;
    if (!acc[dept]) {
      acc[dept] = {
        count: 0,
        avgScore: 0,
        avgGoals: 0,
        scores: []
      };
    }
    acc[dept].count++;
    acc[dept].scores.push(parseFloat(review.overallScore));
    return acc;
  }, {});
  
  // Calculate department averages
  Object.keys(departmentStats).forEach(dept => {
    const deptData = departmentStats[dept];
    deptData.avgScore = deptData.scores.reduce((sum, score) => sum + score, 0) / deptData.count;
    deptData.avgGoals = reviews
      .filter(r => r.department === dept)
      .reduce((sum, r) => sum + parseInt(r.goalsAchievement), 0) / deptData.count;
    delete deptData.scores; // Remove raw scores from response
  });
  
  const stats = {
    totalReviews,
    averageScore: Math.round(averageScore * 10) / 10,
    averageGoalsAchievement: Math.round(averageGoalsAchievement),
    scoreDistribution,
    departmentStats,
    generatedAt: new Date().toISOString()
  };
  
  console.log(`✅ Generated review statistics - ${totalReviews} reviews, avg score: ${stats.averageScore}`);
  
  res.json(stats);
}));

// POST /api/reviews - Create new performance review
router.post('/', handleAsync(async (req, res) => {
  const reviewData = req.body;
  
  console.log(`➕ Creating new performance review for employee ID: ${reviewData.employeeId}`);
  
  // Validate review data
  const validation = validateReview(reviewData);
  if (!validation.isValid) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: validation.errors
    });
  }
  
  // Check if employee exists
  const employee = await employeeService.getById(reviewData.employeeId);
  if (!employee) {
    return res.status(404).json({
      error: true,
      message: 'Employee not found'
    });
  }
  
  // Check for duplicate review period
  const existingReviews = await reviewService.getByEmployeeId(reviewData.employeeId);
  const duplicateReview = existingReviews.find(r => r.reviewPeriod === reviewData.reviewPeriod);
  
  if (duplicateReview) {
    return res.status(409).json({
      error: true,
      message: `Performance review for ${reviewData.reviewPeriod} already exists for this employee`
    });
  }
  
  try {
    const newReview = await reviewService.create({
      employeeId: reviewData.employeeId,
      reviewPeriod: reviewData.reviewPeriod,
      overallScore: parseFloat(reviewData.overallScore),
      goalsAchievement: parseInt(reviewData.goalsAchievement),
      comments: reviewData.comments || null
    });
    
    console.log(`✅ Created performance review with ID: ${newReview.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Performance review created successfully',
      data: {
        id: newReview.id,
        employeeId: newReview.employeeId,
        employee: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          department: employee.department
        },
        reviewPeriod: newReview.reviewPeriod,
        overallScore: parseFloat(newReview.overallScore),
        goalsAchievement: parseInt(newReview.goalsAchievement),
        comments: newReview.comments,
        createdAt: newReview.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
}));

// GET /api/reviews/period/:period - Get reviews for specific period
router.get('/period/:period', handleAsync(async (req, res) => {
  const { period } = req.params;
  
  console.log(`📅 Fetching reviews for period: ${period}`);
  
  // Validate period format (e.g., 2023-Q4, 2023-H1, 2023)
  if (!/^\d{4}(-Q[1-4]|-H[1-2])?$/.test(period)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid period format. Use formats like: 2023, 2023-Q4, 2023-H1'
    });
  }
  
  const allReviews = await reviewService.getAll();
  const periodReviews = allReviews.filter(review => 
    review.reviewPeriod === period || review.reviewPeriod.startsWith(period)
  );
  
  if (periodReviews.length === 0) {
    return res.json({
      period: period,
      reviews: [],
      summary: {
        totalReviews: 0,
        averageScore: 0,
        averageGoalsAchievement: 0
      }
    });
  }
  
  // Calculate period summary
  const totalReviews = periodReviews.length;
  const averageScore = periodReviews.reduce((sum, r) => sum + parseFloat(r.overallScore), 0) / totalReviews;
  const averageGoalsAchievement = periodReviews.reduce((sum, r) => sum + parseInt(r.goalsAchievement), 0) / totalReviews;
  
  console.log(`✅ Retrieved ${periodReviews.length} reviews for period ${period}`);
  
  res.json({
    period: period,
    summary: {
      totalReviews,
      averageScore: Math.round(averageScore * 10) / 10,
      averageGoalsAchievement: Math.round(averageGoalsAchievement)
    },
    reviews: periodReviews.map(review => ({
      id: review.id,
      employeeId: review.employeeId,
      employee: {
        firstName: review.firstName,
        lastName: review.lastName,
        department: review.department
      },
      reviewPeriod: review.reviewPeriod,
      overallScore: parseFloat(review.overallScore),
      goalsAchievement: parseInt(review.goalsAchievement),
      comments: review.comments,
      createdAt: review.createdAt
    }))
  });
}));

// GET /api/reviews/department/:dept - Get reviews by department
router.get('/department/:dept', handleAsync(async (req, res) => {
  const { dept } = req.params;
  
  console.log(`🏢 Fetching reviews for department: ${dept}`);
  
  const allReviews = await reviewService.getAll();
  const departmentReviews = allReviews.filter(review => 
    review.department.toLowerCase() === dept.toLowerCase()
  );
  
  if (departmentReviews.length === 0) {
    return res.json({
      department: dept,
      reviews: [],
      summary: {
        totalReviews: 0,
        averageScore: 0,
        averageGoalsAchievement: 0
      }
    });
  }
  
  // Calculate department summary
  const totalReviews = departmentReviews.length;
  const averageScore = departmentReviews.reduce((sum, r) => sum + parseFloat(r.overallScore), 0) / totalReviews;
  const averageGoalsAchievement = departmentReviews.reduce((sum, r) => sum + parseInt(r.goalsAchievement), 0) / totalReviews;
  
  console.log(`✅ Retrieved ${departmentReviews.length} reviews for department ${dept}`);
  
  res.json({
    department: dept,
    summary: {
      totalReviews,
      averageScore: Math.round(averageScore * 10) / 10,
      averageGoalsAchievement: Math.round(averageGoalsAchievement)
    },
    reviews: departmentReviews.map(review => ({
      id: review.id,
      employeeId: review.employeeId,
      employee: {
        firstName: review.firstName,
        lastName: review.lastName
      },
      reviewPeriod: review.reviewPeriod,
      overallScore: parseFloat(review.overallScore),
      goalsAchievement: parseInt(review.goalsAchievement),
      comments: review.comments,
      createdAt: review.createdAt
    }))
  });
}));

module.exports = router;