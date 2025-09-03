import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPayrollData();
  }, []);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const [payrollRes, statsRes] = await Promise.all([
        axios.get('/api/payroll'),
        axios.get('/api/payroll/stats')
      ]);
      
      setPayrollData(payrollRes.data);
      setStats(statsRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch payroll data');
      console.error('Error fetching payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading payroll data...
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Payroll Management</h1>
        <p className="page-subtitle">
          Overview of payroll statistics and employee compensation
        </p>
      </div>

      {/* Payroll Statistics */}
      <div className="stats-grid">
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="stat-value">{stats.totalEmployees || 0}</div>
          <div className="stat-label">Total Employees</div>
        </div>
        
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div className="stat-value">{formatCurrency(stats.totalPayroll)}</div>
          <div className="stat-label">Total Monthly Payroll</div>
        </div>
        
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <div className="stat-value">{formatCurrency(stats.avgSalary)}</div>
          <div className="stat-label">Average Salary</div>
        </div>
        
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
          <div className="stat-value">{formatCurrency(stats.totalTaxes)}</div>
          <div className="stat-label">Total Tax Deductions</div>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="card mb-6">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          Payroll by Department
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {Object.entries(
            payrollData.reduce((acc, emp) => {
              if (!acc[emp.department]) {
                acc[emp.department] = { count: 0, total: 0 };
              }
              acc[emp.department].count++;
              acc[emp.department].total += emp.grossPay || emp.salary || 0;
              return acc;
            }, {})
          ).map(([dept, data]) => (
            <div key={dept} style={{ 
              padding: '1rem', 
              backgroundColor: '#f8fafc', 
              borderRadius: '0.5rem',
              borderLeft: '4px solid #3b82f6'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>
                {dept}
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                {data.count} employees
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                {formatCurrency(data.total)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Payroll Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Base Salary</th>
              <th>Gross Pay</th>
              <th>Taxes</th>
              <th>Benefits</th>
              <th>Net Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payrollData.map(employee => (
              <tr key={employee.id || employee.employeeId}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '0.75rem'
                    }}>
                      <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 'bold' }}>
                        {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {employee.employeeId}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    {employee.department}
                  </span>
                </td>
                <td style={{ fontWeight: '600' }}>{formatCurrency(employee.salary)}</td>
                <td style={{ fontWeight: '600', color: '#059669' }}>
                  {formatCurrency(employee.grossPay || Math.round((employee.salary || 0) * 0.85))}
                </td>
                <td style={{ color: '#dc2626' }}>
                  {formatCurrency(employee.taxes || Math.round((employee.salary || 0) * 0.15))}
                </td>
                <td style={{ color: '#7c3aed' }}>
                  {formatCurrency(employee.benefits || Math.round((employee.salary || 0) * 0.05))}
                </td>
                <td style={{ fontWeight: '700', fontSize: '1rem', color: '#059669' }}>
                  {formatCurrency(employee.netPay || Math.round((employee.salary || 0) * 0.75))}
                </td>
                <td>
                  <span style={{
                    backgroundColor: '#dcfce7',
                    color: '#059669',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    Processed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payrollData.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💰</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
            No payroll data found
          </h3>
          <p style={{ color: '#6b7280' }}>
            Payroll information will appear here once processed.
          </p>
        </div>
      )}
    </div>
  );
};

export default Payroll;