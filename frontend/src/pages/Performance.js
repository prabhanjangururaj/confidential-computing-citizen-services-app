import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Performance = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/reviews');
      setReviews(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch performance reviews');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 4.5) return { bg: '#dcfce7', color: '#059669', label: 'Excellent' };
    if (score >= 4.0) return { bg: '#dbeafe', color: '#2563eb', label: 'Good' };
    if (score >= 3.0) return { bg: '#fef3c7', color: '#d97706', label: 'Average' };
    return { bg: '#fee2e2', color: '#dc2626', label: 'Needs Improvement' };
  };

  const getGoalsColor = (achievement) => {
    if (achievement >= 90) return { bg: '#dcfce7', color: '#059669' };
    if (achievement >= 75) return { bg: '#dbeafe', color: '#2563eb' };
    if (achievement >= 60) return { bg: '#fef3c7', color: '#d97706' };
    return { bg: '#fee2e2', color: '#dc2626' };
  };

  const calculateOverallStats = () => {
    if (reviews.length === 0) return { avgScore: 0, avgGoals: 0, distribution: {} };
    
    const avgScore = reviews.reduce((sum, review) => sum + review.overallScore, 0) / reviews.length;
    const avgGoals = reviews.reduce((sum, review) => sum + review.goalsAchievement, 0) / reviews.length;
    
    const distribution = reviews.reduce((acc, review) => {
      const scoreInfo = getScoreColor(review.overallScore);
      acc[scoreInfo.label] = (acc[scoreInfo.label] || 0) + 1;
      return acc;
    }, {});
    
    return { avgScore, avgGoals, distribution };
  };

  const stats = calculateOverallStats();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading performance reviews...
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
        <h1 className="page-title">Performance Reviews</h1>
        <p className="page-subtitle">
          Track and manage employee performance evaluations
        </p>
      </div>

      {/* Performance Statistics */}
      <div className="stats-grid">
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="stat-value">{reviews.length}</div>
          <div className="stat-label">Total Reviews</div>
        </div>
        
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
          <div className="stat-value">{stats.avgScore.toFixed(1)}</div>
          <div className="stat-label">Average Score</div>
        </div>
        
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
          <div className="stat-value">{Math.round(stats.avgGoals)}%</div>
          <div className="stat-label">Goals Achievement</div>
        </div>
        
        <div className="card stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
          <div className="stat-value">{stats.distribution.Excellent || 0}</div>
          <div className="stat-label">Excellent Performers</div>
        </div>
      </div>

      {/* Performance Distribution */}
      <div className="card mb-6">
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
          Performance Distribution
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.entries(stats.distribution).map(([category, count]) => {
            const colors = {
              'Excellent': { bg: '#dcfce7', color: '#059669' },
              'Good': { bg: '#dbeafe', color: '#2563eb' },
              'Average': { bg: '#fef3c7', color: '#d97706' },
              'Needs Improvement': { bg: '#fee2e2', color: '#dc2626' }
            };
            const style = colors[category] || colors['Average'];
            
            return (
              <div key={category} style={{
                padding: '1rem',
                backgroundColor: style.bg,
                borderRadius: '0.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: style.color }}>
                  {count}
                </div>
                <div style={{ color: style.color, fontSize: '0.875rem', fontWeight: '600' }}>
                  {category}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Review Period</th>
              <th>Overall Score</th>
              <th>Goals Achievement</th>
              <th>Performance Level</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review, index) => {
              const scoreStyle = getScoreColor(review.overallScore);
              const goalsStyle = getGoalsColor(review.goalsAchievement);
              
              return (
                <tr key={index}>
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
                          {review.firstName?.charAt(0)}{review.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>
                          {review.firstName} {review.lastName}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          ID: {review.employeeId}
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
                      {review.department}
                    </span>
                  </td>
                  <td style={{ fontWeight: '500' }}>{review.reviewPeriod}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: scoreStyle.color }}>
                        {review.overallScore}
                      </span>
                      <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>/5.0</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      backgroundColor: goalsStyle.bg,
                      color: goalsStyle.color,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {review.goalsAchievement}%
                    </span>
                  </td>
                  <td>
                    <span style={{
                      backgroundColor: scoreStyle.bg,
                      color: scoreStyle.color,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {scoreStyle.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ maxWidth: '300px' }}>
                      {review.comments || 'No comments provided'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reviews.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
            No performance reviews found
          </h3>
          <p style={{ color: '#6b7280' }}>
            Performance reviews will appear here once they are completed.
          </p>
        </div>
      )}
    </div>
  );
};

export default Performance;