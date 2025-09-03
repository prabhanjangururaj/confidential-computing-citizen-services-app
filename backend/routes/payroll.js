const express = require('express');
const { payrollService } = require('../database/db');
const { handleAsync } = require('../utils/helpers');

const router = express.Router();

// GET /api/payroll/stats - Get payroll statistics
router.get('/stats', handleAsync(async (req, res) => {
  console.log('📊 Fetching payroll statistics');
  
  const stats = await payrollService.getStats();
  
  console.log(`✅ Retrieved payroll stats - ${stats.totalEmployees} employees, $${stats.totalPayroll.toLocaleString()} total payroll`);
  
  res.json({
    totalEmployees: stats.totalEmployees,
    totalPayroll: stats.totalPayroll,
    avgSalary: stats.avgSalary,
    totalTaxes: stats.totalTaxes,
    generatedAt: new Date().toISOString(),
    period: getCurrentPayPeriod()
  });
}));

// GET /api/payroll - Get payroll data for all employees
router.get('/', handleAsync(async (req, res) => {
  console.log('💰 Fetching payroll data for all employees');
  
  const payrollData = await payrollService.getPayrollData();
  
  // Calculate payroll components with business rules
  const processedPayroll = payrollData.map(employee => {
    const baseSalary = employee.salary;
    const grossPay = Math.round(baseSalary * 0.85); // 85% of base salary
    const taxes = Math.round(baseSalary * 0.15); // 15% tax rate
    const benefits = Math.round(baseSalary * 0.05); // 5% benefits
    const deductions = Math.round(baseSalary * 0.02); // 2% other deductions
    const netPay = grossPay - taxes - deductions; // Net after taxes and deductions
    
    return {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      baseSalary: baseSalary,
      grossPay: grossPay,
      taxes: taxes,
      benefits: benefits,
      deductions: deductions,
      netPay: netPay,
      payPeriod: getCurrentPayPeriod(),
      processedAt: new Date().toISOString()
    };
  });
  
  console.log(`✅ Processed payroll for ${processedPayroll.length} employees`);
  
  res.json(processedPayroll);
}));

// GET /api/payroll/employee/:id - Get payroll data for specific employee
router.get('/employee/:id', handleAsync(async (req, res) => {
  const { id } = req.params;
  
  console.log(`👤 Fetching payroll data for employee ID: ${id}`);
  
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid employee ID format'
    });
  }
  
  const payrollData = await payrollService.getPayrollData();
  const employee = payrollData.find(emp => emp.id === parseInt(id));
  
  if (!employee) {
    return res.status(404).json({
      error: true,
      message: 'Employee payroll data not found'
    });
  }
  
  // Calculate detailed payroll breakdown
  const baseSalary = employee.salary;
  const grossPay = Math.round(baseSalary * 0.85);
  const federalTax = Math.round(baseSalary * 0.10); // 10% federal tax
  const stateTax = Math.round(baseSalary * 0.03); // 3% state tax
  const socialSecurity = Math.round(baseSalary * 0.062); // 6.2% social security
  const medicare = Math.round(baseSalary * 0.0145); // 1.45% medicare
  const totalTaxes = federalTax + stateTax + socialSecurity + medicare;
  const healthInsurance = Math.round(baseSalary * 0.03); // 3% health insurance
  const retirement401k = Math.round(baseSalary * 0.02); // 2% 401k contribution
  const totalBenefits = healthInsurance + retirement401k;
  const netPay = grossPay - totalTaxes - totalBenefits;
  
  const detailedPayroll = {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: employee.department,
      position: employee.position
    },
    payroll: {
      payPeriod: getCurrentPayPeriod(),
      baseSalary: baseSalary,
      grossPay: grossPay,
      taxes: {
        federal: federalTax,
        state: stateTax,
        socialSecurity: socialSecurity,
        medicare: medicare,
        total: totalTaxes
      },
      benefits: {
        healthInsurance: healthInsurance,
        retirement401k: retirement401k,
        total: totalBenefits
      },
      netPay: netPay,
      processedAt: new Date().toISOString()
    }
  };
  
  console.log(`✅ Retrieved detailed payroll for ${employee.firstName} ${employee.lastName}`);
  
  res.json(detailedPayroll);
}));

// GET /api/payroll/department/:dept - Get payroll data by department
router.get('/department/:dept', handleAsync(async (req, res) => {
  const { dept } = req.params;
  
  console.log(`🏢 Fetching payroll data for department: ${dept}`);
  
  const payrollData = await payrollService.getPayrollData();
  const departmentEmployees = payrollData.filter(
    emp => emp.department.toLowerCase() === dept.toLowerCase()
  );
  
  if (departmentEmployees.length === 0) {
    return res.status(404).json({
      error: true,
      message: `No employees found in department: ${dept}`
    });
  }
  
  // Calculate department summary
  const totalSalary = departmentEmployees.reduce((sum, emp) => sum + emp.salary, 0);
  const avgSalary = Math.round(totalSalary / departmentEmployees.length);
  const totalTaxes = Math.round(totalSalary * 0.15);
  const totalBenefits = Math.round(totalSalary * 0.05);
  
  const departmentPayroll = {
    department: dept,
    summary: {
      totalEmployees: departmentEmployees.length,
      totalSalary: totalSalary,
      avgSalary: avgSalary,
      totalTaxes: totalTaxes,
      totalBenefits: totalBenefits,
      payPeriod: getCurrentPayPeriod()
    },
    employees: departmentEmployees.map(employee => {
      const baseSalary = employee.salary;
      const grossPay = Math.round(baseSalary * 0.85);
      const taxes = Math.round(baseSalary * 0.15);
      const benefits = Math.round(baseSalary * 0.05);
      const netPay = Math.round(baseSalary * 0.75);
      
      return {
        id: employee.id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position,
        baseSalary: baseSalary,
        grossPay: grossPay,
        taxes: taxes,
        benefits: benefits,
        netPay: netPay
      };
    })
  };
  
  console.log(`✅ Retrieved payroll data for ${departmentEmployees.length} employees in ${dept}`);
  
  res.json(departmentPayroll);
}));

// POST /api/payroll/process - Process payroll for all employees
router.post('/process', handleAsync(async (req, res) => {
  console.log('⚡ Processing payroll for all employees');
  
  const payrollData = await payrollService.getPayrollData();
  
  // Simulate payroll processing
  const processedEmployees = payrollData.map(employee => {
    const baseSalary = employee.salary;
    const grossPay = Math.round(baseSalary * 0.85);
    const taxes = Math.round(baseSalary * 0.15);
    const benefits = Math.round(baseSalary * 0.05);
    const netPay = Math.round(baseSalary * 0.75);
    
    return {
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      department: employee.department,
      baseSalary: baseSalary,
      grossPay: grossPay,
      taxes: taxes,
      benefits: benefits,
      netPay: netPay,
      status: 'processed'
    };
  });
  
  const summary = {
    totalProcessed: processedEmployees.length,
    totalGrossPay: processedEmployees.reduce((sum, emp) => sum + emp.grossPay, 0),
    totalTaxes: processedEmployees.reduce((sum, emp) => sum + emp.taxes, 0),
    totalBenefits: processedEmployees.reduce((sum, emp) => sum + emp.benefits, 0),
    totalNetPay: processedEmployees.reduce((sum, emp) => sum + emp.netPay, 0),
    processedAt: new Date().toISOString(),
    payPeriod: getCurrentPayPeriod()
  };
  
  console.log(`✅ Processed payroll for ${processedEmployees.length} employees - Total net pay: $${summary.totalNetPay.toLocaleString()}`);
  
  res.json({
    success: true,
    message: 'Payroll processed successfully',
    summary: summary,
    employees: processedEmployees
  });
}));

// Helper function to get current pay period
function getCurrentPayPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  
  return `${year}-Q${quarter}`;
}

module.exports = router;