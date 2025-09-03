const FortanixDSMService = require('./fortanixService');

class EncryptionService {
  constructor() {
    this.fortanixService = new FortanixDSMService();
    
    // Define which fields should be encrypted for each entity
    this.encryptionConfig = {
      citizens: {
        sensitiveFields: [
          'firstName', 'lastName', 'email', 'phone', 
          'address', 'zipCode', 'dateOfBirth'
        ],
        publicFields: [
          'citizenId', 'city', 'state', 'status', 
          'createdAt', 'updatedAt'
        ]
      },
      serviceRequests: {
        sensitiveFields: [
          'notes', 'applicationData'
        ],
        publicFields: [
          'requestNumber', 'citizenId', 'serviceTypeId', 
          'status', 'priority', 'submittedDate', 'assignedAgent'
        ]
      }
    };
  }

  /**
   * Initialize the encryption service
   */
  async initialize() {
    await this.fortanixService.initialize();
  }

  /**
   * Encrypt citizen data before saving to database
   * @param {Object} citizenData - Raw citizen data
   * @returns {Object} - Citizen data with encrypted sensitive fields
   */
  async encryptCitizenData(citizenData) {
    try {
      const encryptedData = { ...citizenData };
      const { sensitiveFields } = this.encryptionConfig.citizens;

      console.log('🔐 Encrypting citizen PII data...');
      
      for (const field of sensitiveFields) {
        if (citizenData[field]) {
          // Encrypt the field and store with _encrypted suffix
          encryptedData[`${field}_encrypted`] = await this.fortanixService.encryptData(citizenData[field]);
          
          // Remove the plaintext field for security
          delete encryptedData[field];
          
          console.log(`  ✓ Encrypted field: ${field}`);
        }
      }

      console.log('✅ Citizen data encrypted and ready for database storage');
      return encryptedData;
    } catch (error) {
      console.error('❌ Failed to encrypt citizen data:', error.message);
      throw error;
    }
  }

  /**
   * Decrypt citizen data after retrieving from database
   * @param {Object} encryptedCitizenData - Citizen data with encrypted fields
   * @returns {Object} - Citizen data with decrypted sensitive fields (or fallback labels)
   */
  async decryptCitizenData(encryptedCitizenData) {
    if (!encryptedCitizenData) return null;

    const decryptedData = { ...encryptedCitizenData };
    const { sensitiveFields } = this.encryptionConfig.citizens;

    console.log('🔓 Decrypting citizen PII data...');

    for (const field of sensitiveFields) {
      const encryptedField = `${field}_encrypted`;
      if (encryptedCitizenData[encryptedField]) {
        try {
          // Decrypt the field and restore original field name
          decryptedData[field] = await this.fortanixService.decryptData(encryptedCitizenData[encryptedField]);
          
          // Remove the encrypted field from response
          delete decryptedData[encryptedField];
          
          console.log(`  ✓ Decrypted field: ${field}`);
        } catch (error) {
          // Graceful fallback for decryption failures
          console.warn(`⚠️  Decryption failed for field ${field}, using fallback: ${error.message}`);
          
          // Provide user-friendly fallback values
          const fallbackValues = {
            'firstName': '[Encrypted]',
            'lastName': '[Data]',
            'email': '[Encrypted Email]',
            'phone': '[Encrypted Phone]',
            'address': '[Encrypted Address]',
            'zipCode': '[Protected]',
            'dateOfBirth': '[Protected DOB]'
          };
          
          decryptedData[field] = fallbackValues[field] || '[Encrypted Data]';
          
          // Remove the encrypted field from response
          delete decryptedData[encryptedField];
        }
      }
    }

    console.log('✅ Citizen data processed (with fallbacks for failed decryption)');
    return decryptedData;
  }

  /**
   * Encrypt service request data before saving to database
   * @param {Object} requestData - Raw service request data
   * @returns {Object} - Service request data with encrypted sensitive fields
   */
  async encryptServiceRequestData(requestData) {
    try {
      const encryptedData = { ...requestData };
      const { sensitiveFields } = this.encryptionConfig.serviceRequests;

      console.log('🔐 Encrypting service request sensitive data...');

      for (const field of sensitiveFields) {
        if (requestData[field]) {
          // Encrypt the field and store with _encrypted suffix
          encryptedData[`${field}_encrypted`] = await this.fortanixService.encryptData(requestData[field]);
          
          // Remove the plaintext field for security
          delete encryptedData[field];
          
          console.log(`  ✓ Encrypted field: ${field}`);
        }
      }

      console.log('✅ Service request data encrypted and ready for database storage');
      return encryptedData;
    } catch (error) {
      console.error('❌ Failed to encrypt service request data:', error.message);
      throw error;
    }
  }

  /**
   * Decrypt service request data after retrieving from database
   * @param {Object} encryptedRequestData - Service request data with encrypted fields
   * @returns {Object} - Service request data with decrypted sensitive fields (or fallback labels)
   */
  async decryptServiceRequestData(encryptedRequestData) {
    if (!encryptedRequestData) return null;

    const decryptedData = { ...encryptedRequestData };
    const { sensitiveFields } = this.encryptionConfig.serviceRequests;

    console.log('🔓 Decrypting service request sensitive data...');

    for (const field of sensitiveFields) {
      const encryptedField = `${field}_encrypted`;
      if (encryptedRequestData[encryptedField]) {
        try {
          // Decrypt the field and restore original field name
          decryptedData[field] = await this.fortanixService.decryptData(encryptedRequestData[encryptedField]);
          
          // Remove the encrypted field from response
          delete decryptedData[encryptedField];
          
          console.log(`  ✓ Decrypted field: ${field}`);
        } catch (error) {
          // Graceful fallback for decryption failures
          console.warn(`⚠️  Decryption failed for field ${field}, using fallback: ${error.message}`);
          
          // Provide user-friendly fallback values for service requests
          const fallbackValues = {
            'notes': '[Encrypted Notes]',
            'applicationData': '[Encrypted Application Data]'
          };
          
          decryptedData[field] = fallbackValues[field] || '[Encrypted Data]';
          
          // Remove the encrypted field from response
          delete decryptedData[encryptedField];
        }
      }
    }

    console.log('✅ Service request data processed (with fallbacks for failed decryption)');
    return decryptedData;
  }

  /**
   * Get analytics data without decrypting sensitive fields
   * This is efficient for dashboard statistics
   * @param {Array} citizenRecords - Array of citizen records from database
   * @returns {Object} - Analytics data using only public fields
   */
  getCitizenAnalytics(citizenRecords) {
    console.log('📊 Generating analytics from non-encrypted fields...');
    
    const analytics = {
      totalCitizens: citizenRecords.length,
      citiesCounts: {},
      statesCounts: {},
      statusCounts: {},
      monthlyRegistrations: {}
    };

    citizenRecords.forEach(citizen => {
      // Count by city (not encrypted)
      analytics.citiesCounts[citizen.city] = (analytics.citiesCounts[citizen.city] || 0) + 1;
      
      // Count by state (not encrypted)
      analytics.statesCounts[citizen.state] = (analytics.statesCounts[citizen.state] || 0) + 1;
      
      // Count by status (not encrypted)
      analytics.statusCounts[citizen.status] = (analytics.statusCounts[citizen.status] || 0) + 1;
      
      // Monthly registrations (not encrypted)
      const month = citizen.createdAt.substring(0, 7); // YYYY-MM
      analytics.monthlyRegistrations[month] = (analytics.monthlyRegistrations[month] || 0) + 1;
    });

    console.log('✅ Analytics generated without decrypting PII data');
    return analytics;
  }

  /**
   * Health check for encryption service
   */
  async healthCheck() {
    return await this.fortanixService.healthCheck();
  }

  /**
   * Get encryption configuration for debugging
   */
  getEncryptionConfig() {
    return {
      endpoint: this.fortanixService.endpoint,
      keyId: this.fortanixService.keyId,
      encryptionConfig: this.encryptionConfig
    };
  }
}

module.exports = EncryptionService;