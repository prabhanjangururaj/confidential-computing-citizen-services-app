import React from 'react';

const ServiceRequests = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Service Requests</h1>
        <p className="mt-2 text-gray-600">
          Manage citizen applications, permits, and service requests
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Service Requests Module
        </h3>
        <p className="text-gray-600">
          This page will display and manage all citizen service requests, applications, and permits.
        </p>
      </div>
    </div>
  );
};

export default ServiceRequests;