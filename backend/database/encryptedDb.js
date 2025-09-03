const EncryptionService = require('../services/encryptionService');
const { runQuery, getQuery, allQuery } = require('./db');

// Initialize encryption service
let encryptionService = null;

const initializeEncryption = async () => {
  encryptionService = new EncryptionService();
  await encryptionService.initialize();
  console.log('🔐 Encryption service initialized for database operations');
};

// Encrypted Citizen Service
const encryptedCitizenService = {
  async getAll() {
    console.log('📋 Retrieving all citizens with decryption...');
    
    // Get encrypted data from database using new schema
    const encryptedCitizens = await allQuery(`
      SELECT id, citizenId, 
             firstName_encrypted, lastName_encrypted, email_encrypted, 
             phone_encrypted, address_encrypted, zipCode_encrypted, dateOfBirth_encrypted,
             city, state, status, createdAt, updatedAt
      FROM citizens 
      ORDER BY createdAt DESC
    `);

    // Decrypt sensitive fields for each citizen
    const decryptedCitizens = await Promise.all(
      encryptedCitizens.map(async (citizen) => {
        return await encryptionService.decryptCitizenData(citizen);
      })
    );

    console.log(`✅ Retrieved and decrypted ${decryptedCitizens.length} citizens`);
    return decryptedCitizens;
  },
  
  async getById(id) {
    console.log(`🔍 Retrieving citizen ID ${id} with decryption...`);
    
    // Get encrypted data from database
    const encryptedCitizen = await getQuery(`
      SELECT id, citizenId, 
             firstName_encrypted, lastName_encrypted, email_encrypted, 
             phone_encrypted, address_encrypted, zipCode_encrypted, dateOfBirth_encrypted,
             city, state, status, createdAt, updatedAt
      FROM citizens 
      WHERE id = ?
    `, [id]);

    if (!encryptedCitizen) {
      console.log(`❌ Citizen ID ${id} not found`);
      return null;
    }

    // Decrypt sensitive fields
    const decryptedCitizen = await encryptionService.decryptCitizenData(encryptedCitizen);
    console.log(`✅ Retrieved and decrypted citizen: ${decryptedCitizen.firstName} ${decryptedCitizen.lastName}`);
    
    return decryptedCitizen;
  },
  
  async getByCitizenId(citizenId) {
    console.log(`🔍 Retrieving citizen ${citizenId} with decryption...`);
    
    // Get encrypted data from database
    const encryptedCitizen = await getQuery(`
      SELECT id, citizenId, 
             firstName_encrypted, lastName_encrypted, email_encrypted, 
             phone_encrypted, address_encrypted, zipCode_encrypted, dateOfBirth_encrypted,
             city, state, status, createdAt, updatedAt
      FROM citizens 
      WHERE citizenId = ?
    `, [citizenId]);

    if (!encryptedCitizen) {
      console.log(`❌ Citizen ${citizenId} not found`);
      return null;
    }

    // Decrypt sensitive fields
    const decryptedCitizen = await encryptionService.decryptCitizenData(encryptedCitizen);
    console.log(`✅ Retrieved and decrypted citizen: ${decryptedCitizen.firstName} ${decryptedCitizen.lastName}`);
    
    return decryptedCitizen;
  },
  
  async create(citizenData) {
    console.log(`🔐 Creating new citizen with encryption: ${citizenData.firstName} ${citizenData.lastName}`);
    
    // Encrypt sensitive fields before storing
    const encryptedData = await encryptionService.encryptCitizenData(citizenData);
    
    // Insert encrypted data into database using new schema
    const result = await runQuery(
      `INSERT INTO citizens (
        citizenId, 
        firstName_encrypted, lastName_encrypted, email_encrypted, 
        phone_encrypted, address_encrypted, zipCode_encrypted, dateOfBirth_encrypted,
        city, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        encryptedData.citizenId,
        encryptedData.firstName_encrypted,
        encryptedData.lastName_encrypted, 
        encryptedData.email_encrypted,
        encryptedData.phone_encrypted,
        encryptedData.address_encrypted,
        encryptedData.zipCode_encrypted,
        encryptedData.dateOfBirth_encrypted,
        encryptedData.city,
        encryptedData.state
      ]
    );

    console.log(`✅ Citizen created successfully with encrypted PII data (ID: ${result.id})`);
    
    // Return the original unencrypted data with the new ID
    return { id: result.id, ...citizenData };
  },
  
  async update(id, citizenData) {
    console.log(`🔐 Updating citizen ID ${id} with encryption...`);
    
    // Encrypt sensitive fields before storing
    const encryptedData = await encryptionService.encryptCitizenData(citizenData);
    
    // Update encrypted data in database
    await runQuery(
      `UPDATE citizens 
       SET firstName_encrypted = ?, lastName_encrypted = ?, email_encrypted = ?, 
           phone_encrypted = ?, address_encrypted = ?, zipCode_encrypted = ?, 
           dateOfBirth_encrypted = ?, city = ?, state = ?, 
           updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        encryptedData.firstName_encrypted,
        encryptedData.lastName_encrypted,
        encryptedData.email_encrypted,
        encryptedData.phone_encrypted,
        encryptedData.address_encrypted,
        encryptedData.zipCode_encrypted,
        encryptedData.dateOfBirth_encrypted,
        encryptedData.city,
        encryptedData.state,
        id
      ]
    );

    console.log(`✅ Citizen ID ${id} updated successfully with encrypted PII data`);
    
    // Return updated citizen data
    return await this.getById(id);
  },

  // Analytics method that works with non-encrypted fields only
  async getAnalytics() {
    console.log('📊 Generating citizen analytics from non-encrypted fields...');
    
    const citizens = await allQuery(`
      SELECT citizenId, city, state, status, createdAt
      FROM citizens
    `);

    return encryptionService.getCitizenAnalytics(citizens);
  }
};

// Encrypted Service Request Service  
const encryptedServiceRequestService = {
  async getAll() {
    console.log('📋 Retrieving all service requests with decryption...');
    
    // Get data with encrypted fields from database
    const encryptedRequests = await allQuery(`
      SELECT r.id, r.requestNumber, r.citizenId, r.serviceTypeId, r.status, r.priority,
             r.submittedDate, r.processedDate, r.completedDate, r.assignedAgent,
             r.notes_encrypted, r.applicationData_encrypted, r.estimatedCompletionDate,
             c.firstName_encrypted, c.lastName_encrypted, c.email_encrypted, c.phone_encrypted,
             c.address_encrypted, c.city, c.state,
             st.name as serviceName, st.category, st.fee, st.processingDays,
             ga.name as agencyName, ga.contactEmail, ga.contactPhone
      FROM service_requests r
      JOIN citizens c ON r.citizenId = c.id
      JOIN service_types st ON r.serviceTypeId = st.id
      JOIN government_agencies ga ON st.agencyId = ga.id
      ORDER BY r.submittedDate DESC
    `);

    // Decrypt sensitive fields for each request
    const decryptedRequests = await Promise.all(
      encryptedRequests.map(async (request) => {
        // Decrypt citizen data
        const citizenData = {
          firstName_encrypted: request.firstName_encrypted,
          lastName_encrypted: request.lastName_encrypted,
          email_encrypted: request.email_encrypted,
          phone_encrypted: request.phone_encrypted,
          address_encrypted: request.address_encrypted
        };
        const decryptedCitizen = await encryptionService.decryptCitizenData(citizenData);
        
        // Decrypt service request data
        const serviceRequestData = {
          notes_encrypted: request.notes_encrypted,
          applicationData_encrypted: request.applicationData_encrypted
        };
        const decryptedServiceRequest = await encryptionService.decryptServiceRequestData(serviceRequestData);

        return {
          ...request,
          // Replace encrypted citizen fields with decrypted versions
          firstName: decryptedCitizen.firstName,
          lastName: decryptedCitizen.lastName,
          email: decryptedCitizen.email,
          phone: decryptedCitizen.phone,
          address: decryptedCitizen.address,
          // Replace encrypted service request fields
          notes: decryptedServiceRequest.notes,
          applicationData: decryptedServiceRequest.applicationData,
          // Remove encrypted field references
          firstName_encrypted: undefined,
          lastName_encrypted: undefined,
          email_encrypted: undefined,
          phone_encrypted: undefined,
          address_encrypted: undefined,
          notes_encrypted: undefined,
          applicationData_encrypted: undefined
        };
      })
    );

    console.log(`✅ Retrieved and decrypted ${decryptedRequests.length} service requests`);
    return decryptedRequests;
  },

  async create(requestData) {
    console.log(`🔐 Creating new service request with encryption: ${requestData.requestNumber}`);
    
    // Encrypt sensitive fields before storing
    const encryptedData = await encryptionService.encryptServiceRequestData(requestData);
    
    // Insert encrypted data into database
    const result = await runQuery(
      `INSERT INTO service_requests (
        requestNumber, citizenId, serviceTypeId, status, priority, 
        assignedAgent, notes_encrypted, applicationData_encrypted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        encryptedData.requestNumber,
        encryptedData.citizenId,
        encryptedData.serviceTypeId,
        encryptedData.status,
        encryptedData.priority,
        encryptedData.assignedAgent,
        encryptedData.notes_encrypted,
        encryptedData.applicationData_encrypted
      ]
    );

    console.log(`✅ Service request created successfully with encrypted sensitive data (ID: ${result.id})`);
    
    // Return the original unencrypted data with the new ID
    return { id: result.id, ...requestData };
  }
};

module.exports = {
  initializeEncryption,
  encryptedCitizenService,
  encryptedServiceRequestService
};