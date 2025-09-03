const express = require('express');
const { employeeService } = require('../database/db');
const { validateEmployee, handleAsync } = require('../utils/helpers');

const router = express.Router();

// GET /api/employees - Get all employees
router.get('/', handleAsync(async (req, res) => {
  console.log('📋 Fetching all employees');
  
  const employees = await employeeService.getAll();
  
  console.log(`✅ Retrieved ${employees.length} employees`);
  
  res.json(employees.map(emp => ({
    id: emp.id,
    employeeId: emp.employeeId,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    department: emp.department,
    position: emp.position,
    salary: emp.salary,
    hireDate: emp.hireDate,
    status: emp.status || 'active',
    createdAt: emp.createdAt
  })));
}));

// GET /api/employees/:id - Get employee by ID
router.get('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  console.log(`👤 Fetching employee with ID: ${id}`);
  
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid employee ID format'
    });
  }
  
  const employee = await employeeService.getById(parseInt(id));
  
  if (!employee) {
    return res.status(404).json({
      error: true,
      message: 'Employee not found'
    });
  }
  
  console.log(`✅ Retrieved employee: ${employee.firstName} ${employee.lastName}`);
  
  res.json({
    id: employee.id,
    employeeId: employee.employeeId,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    department: employee.department,
    position: employee.position,
    salary: employee.salary,
    hireDate: employee.hireDate,
    status: employee.status || 'active',
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt
  });
}));

// POST /api/employees - Create new employee
router.post('/', handleAsync(async (req, res) => {
  const employeeData = req.body;
  
  console.log('➕ Creating new employee:', employeeData.firstName, employeeData.lastName);
  
  // Validate employee data
  const validation = validateEmployee(employeeData);
  if (!validation.isValid) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: validation.errors
    });
  }
  
  try {
    const newEmployee = await employeeService.create(employeeData);
    
    console.log(`✅ Created employee with ID: ${newEmployee.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        id: newEmployee.id,
        employeeId: newEmployee.employeeId,
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        email: newEmployee.email,
        department: newEmployee.department,
        position: newEmployee.position,
        salary: newEmployee.salary,
        hireDate: newEmployee.hireDate,
        status: newEmployee.status || 'active'
      }
    });
    
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: true,
        message: 'Employee ID or email already exists'
      });
    }
    throw error;
  }
}));

// PUT /api/employees/:id - Update employee
router.put('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  const employeeData = req.body;
  
  console.log(`📝 Updating employee with ID: ${id}`);
  
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid employee ID format'
    });
  }
  
  // Check if employee exists
  const existingEmployee = await employeeService.getById(parseInt(id));
  if (!existingEmployee) {
    return res.status(404).json({
      error: true,
      message: 'Employee not found'
    });
  }
  
  // Validate update data
  const validation = validateEmployee(employeeData, true);
  if (!validation.isValid) {
    return res.status(400).json({
      error: true,
      message: 'Validation failed',
      details: validation.errors
    });
  }
  
  try {
    const updatedEmployee = await employeeService.update(parseInt(id), employeeData);
    
    console.log(`✅ Updated employee: ${updatedEmployee.firstName} ${updatedEmployee.lastName}`);
    
    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: {
        id: updatedEmployee.id,
        employeeId: updatedEmployee.employeeId,
        firstName: updatedEmployee.firstName,
        lastName: updatedEmployee.lastName,
        email: updatedEmployee.email,
        department: updatedEmployee.department,
        position: updatedEmployee.position,
        salary: updatedEmployee.salary,
        hireDate: updatedEmployee.hireDate,
        status: updatedEmployee.status || 'active',
        updatedAt: updatedEmployee.updatedAt
      }
    });
    
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: true,
        message: 'Email already exists'
      });
    }
    throw error;
  }
}));

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  console.log(`🗑️ Deleting employee with ID: ${id}`);
  
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid employee ID format'
    });
  }
  
  // Check if employee exists
  const existingEmployee = await employeeService.getById(parseInt(id));
  if (!existingEmployee) {
    return res.status(404).json({
      error: true,
      message: 'Employee not found'
    });
  }
  
  const deleted = await employeeService.delete(parseInt(id));
  
  if (deleted) {
    console.log(`✅ Deleted employee: ${existingEmployee.firstName} ${existingEmployee.lastName}`);
    
    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } else {
    res.status(500).json({
      error: true,
      message: 'Failed to delete employee'
    });
  }
}));

// GET /api/employees/search - Search employees
router.get('/search/:term', handleAsync(async (req, res) => {
  const { term } = req.params;
  
  console.log(`🔍 Searching employees with term: ${term}`);
  
  if (!term || term.trim().length < 2) {
    return res.status(400).json({
      error: true,
      message: 'Search term must be at least 2 characters long'
    });
  }
  
  const allEmployees = await employeeService.getAll();
  const searchTerm = term.toLowerCase().trim();
  
  const filteredEmployees = allEmployees.filter(emp => 
    emp.firstName.toLowerCase().includes(searchTerm) ||
    emp.lastName.toLowerCase().includes(searchTerm) ||
    emp.email.toLowerCase().includes(searchTerm) ||
    emp.employeeId.toLowerCase().includes(searchTerm) ||
    emp.department.toLowerCase().includes(searchTerm) ||
    emp.position.toLowerCase().includes(searchTerm)
  );
  
  console.log(`✅ Found ${filteredEmployees.length} employees matching "${term}"`);
  
  res.json(filteredEmployees.map(emp => ({
    id: emp.id,
    employeeId: emp.employeeId,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: emp.email,
    department: emp.department,
    position: emp.position,
    salary: emp.salary,
    hireDate: emp.hireDate,
    status: emp.status || 'active'
  })));
}));

module.exports = router;