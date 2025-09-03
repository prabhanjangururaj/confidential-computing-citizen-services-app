import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch employees');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const departments = [...new Set(employees.map(emp => emp.department))];
  
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = 
      employee.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === '' || employee.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const formatSalary = (salary) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(salary);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading employees...
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
        <h1 className="page-title">Employee Directory</h1>
        <p className="page-subtitle">
          Manage and view all employee information
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                minWidth: '150px'
              }}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Showing {filteredEmployees.length} of {employees.length} employees
          </div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="employees-grid">
        {filteredEmployees.map(employee => (
          <div key={employee.id} className="employee-card card">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '1rem'
              }}>
                <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                </span>
              </div>
              <div>
                <div className="employee-name">{employee.firstName} {employee.lastName}</div>
                <div className="employee-role">{employee.position}</div>
              </div>
            </div>

            <div className="employee-details">
              <div className="employee-detail">
                <span className="label">Employee ID:</span>
                <span className="value">{employee.employeeId}</span>
              </div>
              <div className="employee-detail">
                <span className="label">Department:</span>
                <span className="value">{employee.department}</span>
              </div>
              <div className="employee-detail">
                <span className="label">Email:</span>
                <span className="value" style={{ fontSize: '0.75rem' }}>{employee.email}</span>
              </div>
              <div className="employee-detail">
                <span className="label">Salary:</span>
                <span className="value" style={{ color: '#059669', fontWeight: 'bold' }}>
                  {formatSalary(employee.salary)}
                </span>
              </div>
              <div className="employee-detail">
                <span className="label">Hire Date:</span>
                <span className="value">{formatDate(employee.hireDate)}</span>
              </div>
              <div className="employee-detail">
                <span className="label">Status:</span>
                <span className="value">
                  <span style={{
                    backgroundColor: '#dcfce7',
                    color: '#059669',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    Active
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👤</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
            No employees found
          </h3>
          <p style={{ color: '#6b7280' }}>
            Try adjusting your search criteria or filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default Employees;