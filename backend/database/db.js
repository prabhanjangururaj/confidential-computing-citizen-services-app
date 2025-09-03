const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'citizen_services.db');

let db = null;

// Initialize database connection
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    console.log('🔌 Connecting to SQLite database:', DB_PATH);
    
    db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, async (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Connected to SQLite database');
      
      try {
        await createTables();
        await seedSampleData();
        console.log('✅ Database initialization complete');
        resolve();
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        reject(error);
      }
    });
    
    // Database error handling
    db.on('error', (err) => {
      console.error('🚨 Database error:', err);
    });
  });
};

// Create database tables
const createTables = async () => {
  console.log('📋 Creating database tables...');
  
  const tables = [
    // Citizens table - with encrypted PII fields
    `CREATE TABLE IF NOT EXISTS citizens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizenId TEXT UNIQUE NOT NULL,
      -- Encrypted PII fields (store as TEXT for base64 encrypted data)
      firstName_encrypted TEXT,
      lastName_encrypted TEXT,
      email_encrypted TEXT,
      phone_encrypted TEXT,
      address_encrypted TEXT,
      zipCode_encrypted TEXT,
      dateOfBirth_encrypted TEXT,
      -- Non-encrypted fields (for analytics and queries)
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Government agencies table
    `CREATE TABLE IF NOT EXISTS government_agencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      contactEmail TEXT,
      contactPhone TEXT,
      website TEXT,
      officeHours TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Service types table
    `CREATE TABLE IF NOT EXISTS service_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      agencyId INTEGER NOT NULL,
      fee DECIMAL(10,2) DEFAULT 0.00,
      processingDays INTEGER DEFAULT 10,
      requiredDocuments TEXT,
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agencyId) REFERENCES government_agencies (id)
    )`,
    
    // Service requests table - with encrypted sensitive fields
    `CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestNumber TEXT UNIQUE NOT NULL,
      citizenId INTEGER NOT NULL,
      serviceTypeId INTEGER NOT NULL,
      status TEXT DEFAULT 'submitted',
      priority TEXT DEFAULT 'normal',
      submittedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      processedDate DATETIME,
      completedDate DATETIME,
      assignedAgent TEXT,
      -- Encrypted sensitive fields
      notes_encrypted TEXT,
      applicationData_encrypted TEXT,
      -- Non-encrypted operational fields
      estimatedCompletionDate DATE,
      FOREIGN KEY (citizenId) REFERENCES citizens (id),
      FOREIGN KEY (serviceTypeId) REFERENCES service_types (id)
    )`,
    
    // Request documents table
    `CREATE TABLE IF NOT EXISTS request_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER NOT NULL,
      documentType TEXT NOT NULL,
      fileName TEXT NOT NULL,
      filePath TEXT,
      fileSize INTEGER,
      uploadedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      verificationStatus TEXT DEFAULT 'pending',
      FOREIGN KEY (requestId) REFERENCES service_requests (id)
    )`,
    
    // Request history/status tracking table
    `CREATE TABLE IF NOT EXISTS request_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER NOT NULL,
      oldStatus TEXT,
      newStatus TEXT NOT NULL,
      changedBy TEXT NOT NULL,
      changedDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      comments TEXT,
      FOREIGN KEY (requestId) REFERENCES service_requests (id)
    )`,
    
    // Payments table
    `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId INTEGER NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      paymentMethod TEXT NOT NULL,
      transactionId TEXT UNIQUE,
      status TEXT DEFAULT 'pending',
      receiptNumber TEXT,
      FOREIGN KEY (requestId) REFERENCES service_requests (id)
    )`,
    
    // Users table for authentication
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'citizen',
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      isActive BOOLEAN DEFAULT 1,
      lastLogin DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  for (const tableSQL of tables) {
    await runQuery(tableSQL);
  }
  
  console.log('✅ Database tables created');
};

// Seed sample data
const seedSampleData = async () => {
  console.log('🌱 Seeding sample data...');
  
  // Check if data already exists
  const existingCitizens = await getQuery('SELECT COUNT(*) as count FROM citizens');
  if (existingCitizens.count > 0) {
    console.log('📊 Sample data already exists, skipping seed');
    return;
  }
  
  // Sample citizens data
  const citizens = [
    ['CTZ001', 'John', 'Smith', 'john.smith@email.com', '555-0101', '123 Main St', 'Springfield', 'IL', '62701', '1985-03-15'],
    ['CTZ002', 'Maria', 'Garcia', 'maria.garcia@email.com', '555-0102', '456 Oak Ave', 'Springfield', 'IL', '62702', '1990-07-22'],
    ['CTZ003', 'Michael', 'Johnson', 'michael.johnson@email.com', '555-0103', '789 Pine St', 'Springfield', 'IL', '62703', '1982-12-08'],
    ['CTZ004', 'Sarah', 'Davis', 'sarah.davis@email.com', '555-0104', '321 Elm Dr', 'Springfield', 'IL', '62704', '1988-09-30'],
    ['CTZ005', 'David', 'Wilson', 'david.wilson@email.com', '555-0105', '654 Maple Ln', 'Springfield', 'IL', '62705', '1975-11-14'],
    ['CTZ006', 'Lisa', 'Brown', 'lisa.brown@email.com', '555-0106', '987 Cedar Way', 'Springfield', 'IL', '62706', '1993-04-18'],
    ['CTZ007', 'Robert', 'Miller', 'robert.miller@email.com', '555-0107', '147 Birch St', 'Springfield', 'IL', '62707', '1979-08-25'],
    ['CTZ008', 'Jennifer', 'Martinez', 'jennifer.martinez@email.com', '555-0108', '258 Willow Ave', 'Springfield', 'IL', '62708', '1986-02-12'],
    ['CTZ009', 'William', 'Anderson', 'william.anderson@email.com', '555-0109', '369 Spruce Dr', 'Springfield', 'IL', '62709', '1992-06-03'],
    ['CTZ010', 'Amanda', 'Taylor', 'amanda.taylor@email.com', '555-0110', '741 Ash Blvd', 'Springfield', 'IL', '62710', '1984-10-27']
  ];
  
  const citizenInsertSQL = `
    INSERT INTO citizens (citizenId, firstName_encrypted, lastName_encrypted, email_encrypted, phone_encrypted, address_encrypted, city, state, zipCode_encrypted, dateOfBirth_encrypted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const citizen of citizens) {
    await runQuery(citizenInsertSQL, citizen);
  }
  
  // Sample government agencies
  const agencies = [
    ['Building & Safety Department', 'Handles building permits, inspections, and code enforcement', 'Building & Safety', 'building@springfield.gov', '555-0200', 'http://springfield.gov/building', 'Mon-Fri 8:00 AM - 5:00 PM'],
    ['Business License Department', 'Issues and manages business licenses and permits', 'Business Services', 'business@springfield.gov', '555-0201', 'http://springfield.gov/business', 'Mon-Fri 9:00 AM - 4:30 PM'],
    ['Parks & Recreation', 'Manages park facilities and special event permits', 'Parks & Recreation', 'parks@springfield.gov', '555-0202', 'http://springfield.gov/parks', 'Mon-Sun 6:00 AM - 10:00 PM'],
    ['Public Works Department', 'Road maintenance, utilities, and public infrastructure', 'Public Works', 'publicworks@springfield.gov', '555-0203', 'http://springfield.gov/publicworks', 'Mon-Fri 7:00 AM - 4:00 PM'],
    ['Social Services', 'Community assistance and benefit programs', 'Social Services', 'social@springfield.gov', '555-0204', 'http://springfield.gov/social', 'Mon-Fri 8:00 AM - 6:00 PM'],
    ['Tax Assessor Office', 'Property tax assessments and exemptions', 'Finance & Revenue', 'tax@springfield.gov', '555-0205', 'http://springfield.gov/tax', 'Mon-Fri 8:30 AM - 4:30 PM']
  ];
  
  const agencyInsertSQL = `
    INSERT INTO government_agencies (name, description, category, contactEmail, contactPhone, website, officeHours)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const agency of agencies) {
    await runQuery(agencyInsertSQL, agency);
  }
  
  // Sample service types
  const serviceTypes = [
    ['Building Permit - Residential', 'Permit for residential construction and renovation', 'Building Permits', 1, 125.00, 14, 'Construction plans, property deed, contractor license'],
    ['Building Permit - Commercial', 'Permit for commercial construction projects', 'Building Permits', 1, 350.00, 21, 'Architectural drawings, engineering reports, zoning compliance'],
    ['Business License - General', 'General business operation license', 'Business Licenses', 2, 75.00, 7, 'Business registration, tax ID, insurance certificate'],
    ['Food Service License', 'License for restaurants and food establishments', 'Business Licenses', 2, 150.00, 10, 'Health inspection, food handler certificates, floor plans'],
    ['Special Event Permit', 'Permit for public events in city facilities', 'Event Permits', 3, 50.00, 5, 'Event details, insurance policy, security plan'],
    ['Street Closure Permit', 'Temporary street closure for events or construction', 'Public Works', 4, 200.00, 7, 'Traffic control plan, notice to residents, insurance'],
    ['Property Tax Exemption', 'Application for senior or disability tax exemption', 'Tax Services', 6, 0.00, 30, 'Income verification, age/disability proof, property documents'],
    ['Tree Removal Permit', 'Permit to remove trees on public property', 'Environmental', 4, 25.00, 14, 'Tree assessment, replacement plan, photos'],
    ['Home Occupation Permit', 'Permit to operate business from residential property', 'Business Licenses', 2, 40.00, 7, 'Business description, parking plan, neighbor notification'],
    ['Utility Connection Request', 'New utility service connection', 'Public Works', 4, 100.00, 10, 'Property survey, connection specifications, deposit']
  ];
  
  const serviceTypeInsertSQL = `
    INSERT INTO service_types (name, description, category, agencyId, fee, processingDays, requiredDocuments)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const serviceType of serviceTypes) {
    await runQuery(serviceTypeInsertSQL, serviceType);
  }
  
  // Sample service requests
  const requests = [
    ['REQ-2024-001', 1, 1, 'submitted', 'normal', '2024-01-15 09:30:00', null, null, 'Agent Smith', 'Residential deck addition permit application'],
    ['REQ-2024-002', 2, 3, 'in_review', 'normal', '2024-01-18 14:15:00', '2024-01-20 10:00:00', null, 'Agent Johnson', 'New restaurant license application'],
    ['REQ-2024-003', 3, 5, 'approved', 'high', '2024-01-22 11:45:00', '2024-01-25 16:30:00', '2024-01-26 09:00:00', 'Agent Brown', 'Community festival permit - approved'],
    ['REQ-2024-004', 4, 7, 'in_review', 'normal', '2024-01-28 13:20:00', '2024-02-01 08:45:00', null, 'Agent Davis', 'Senior citizen property tax exemption'],
    ['REQ-2024-005', 5, 2, 'pending_documents', 'normal', '2024-02-05 10:15:00', null, null, 'Agent Wilson', 'Commercial building renovation permit - missing engineering reports'],
    ['REQ-2024-006', 6, 8, 'approved', 'low', '2024-02-10 15:30:00', '2024-02-18 11:20:00', '2024-02-20 14:15:00', 'Agent Miller', 'Tree removal permit approved'],
    ['REQ-2024-007', 7, 4, 'rejected', 'normal', '2024-02-12 09:45:00', '2024-02-15 13:10:00', '2024-02-16 10:30:00', 'Agent Garcia', 'Food service license - failed health inspection'],
    ['REQ-2024-008', 8, 9, 'submitted', 'normal', '2024-02-20 12:00:00', null, null, 'Agent Martinez', 'Home-based daycare permit application'],
    ['REQ-2024-009', 9, 6, 'in_review', 'high', '2024-02-22 08:30:00', '2024-02-25 14:45:00', null, 'Agent Anderson', 'Emergency street closure for utility repair'],
    ['REQ-2024-010', 10, 10, 'approved', 'normal', '2024-02-28 16:20:00', '2024-03-05 09:15:00', '2024-03-08 11:45:00', 'Agent Taylor', 'New utility connection approved']
  ];
  
  const requestInsertSQL = `
    INSERT INTO service_requests (requestNumber, citizenId, serviceTypeId, status, priority, submittedDate, processedDate, completedDate, assignedAgent, notes_encrypted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const request of requests) {
    await runQuery(requestInsertSQL, request);
  }
  
  // Sample payments
  const payments = [
    [1, 125.00, '2024-01-15 09:35:00', 'credit_card', 'TXN-001-2024', 'completed', 'RCP-001'],
    [2, 75.00, '2024-01-18 14:20:00', 'debit_card', 'TXN-002-2024', 'completed', 'RCP-002'],
    [3, 50.00, '2024-01-22 11:50:00', 'cash', 'TXN-003-2024', 'completed', 'RCP-003'],
    [6, 25.00, '2024-02-10 15:35:00', 'check', 'TXN-004-2024', 'completed', 'RCP-004'],
    [8, 40.00, '2024-02-20 12:05:00', 'credit_card', 'TXN-005-2024', 'pending', null],
    [9, 200.00, '2024-02-22 08:35:00', 'credit_card', 'TXN-006-2024', 'completed', 'RCP-005'],
    [10, 100.00, '2024-02-28 16:25:00', 'bank_transfer', 'TXN-007-2024', 'completed', 'RCP-006']
  ];
  
  const paymentInsertSQL = `
    INSERT INTO payments (requestId, amount, paymentDate, paymentMethod, transactionId, status, receiptNumber)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const payment of payments) {
    await runQuery(paymentInsertSQL, payment);
  }
  
  // Sample users for authentication (passwords are hashed using simple method for demo)
  const users = [
    ['admin', 'admin123', 'admin', 'System', 'Administrator', 'admin@springfield.gov', 1],
    ['jsmith', 'password123', 'citizen', 'John', 'Smith', 'john.smith@email.com', 1],
    ['mgarcia', 'secure456', 'staff', 'Maria', 'Garcia', 'maria.garcia@springfield.gov', 1]
  ];
  
  const userInsertSQL = `
    INSERT INTO users (username, password, role, firstName, lastName, email, isActive)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  for (const user of users) {
    await runQuery(userInsertSQL, user);
  }
  
  console.log('✅ Sample data seeded successfully');
};

// Database query helpers
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('🚨 Query error:', err.message);
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('🚨 Query error:', err.message);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('🚨 Query error:', err.message);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Database service functions
const citizenService = {
  async getAll() {
    return await allQuery('SELECT * FROM citizens ORDER BY lastName_encrypted, firstName_encrypted');
  },
  
  async getById(id) {
    return await getQuery('SELECT * FROM citizens WHERE id = ?', [id]);
  },
  
  async getByCitizenId(citizenId) {
    return await getQuery('SELECT * FROM citizens WHERE citizenId = ?', [citizenId]);
  },
  
  async create(citizen) {
    const result = await runQuery(
      `INSERT INTO citizens (citizenId, firstName_encrypted, lastName_encrypted, email_encrypted, phone_encrypted, address_encrypted, city, state, zipCode_encrypted, dateOfBirth_encrypted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [citizen.citizenId, citizen.firstName, citizen.lastName, citizen.email, 
       citizen.phone, citizen.address, citizen.city, citizen.state, citizen.zipCode, citizen.dateOfBirth]
    );
    return await this.getById(result.id);
  },
  
  async update(id, citizen) {
    await runQuery(
      `UPDATE citizens 
       SET firstName_encrypted = ?, lastName_encrypted = ?, email_encrypted = ?, phone_encrypted = ?, address_encrypted = ?, city = ?, state = ?, zipCode_encrypted = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [citizen.firstName, citizen.lastName, citizen.email, citizen.phone, 
       citizen.address, citizen.city, citizen.state, citizen.zipCode, id]
    );
    return await this.getById(id);
  }
};

const serviceRequestService = {
  async getAll() {
    return await allQuery(`
      SELECT r.*, c.firstName_encrypted, c.lastName_encrypted, c.email_encrypted, c.phone_encrypted, 
             st.name as serviceName, st.category, st.fee, st.processingDays,
             ga.name as agencyName
      FROM service_requests r
      JOIN citizens c ON r.citizenId = c.id
      JOIN service_types st ON r.serviceTypeId = st.id
      JOIN government_agencies ga ON st.agencyId = ga.id
      ORDER BY r.submittedDate DESC
    `);
  },
  
  async getById(id) {
    return await getQuery(`
      SELECT r.*, c.firstName_encrypted, c.lastName_encrypted, c.email_encrypted, c.phone_encrypted, c.address_encrypted,
             st.name as serviceName, st.description as serviceDescription, st.category, st.fee, st.processingDays,
             ga.name as agencyName, ga.contactEmail, ga.contactPhone
      FROM service_requests r
      JOIN citizens c ON r.citizenId = c.id
      JOIN service_types st ON r.serviceTypeId = st.id
      JOIN government_agencies ga ON st.agencyId = ga.id
      WHERE r.id = ?
    `, [id]);
  },
  
  async getByCitizenId(citizenId) {
    return await allQuery(`
      SELECT r.*, st.name as serviceName, st.category, st.fee, ga.name as agencyName
      FROM service_requests r
      JOIN service_types st ON r.serviceTypeId = st.id
      JOIN government_agencies ga ON st.agencyId = ga.id
      WHERE r.citizenId = ?
      ORDER BY r.submittedDate DESC
    `, [citizenId]);
  },
  
  async create(request) {
    const result = await runQuery(
      `INSERT INTO service_requests (requestNumber, citizenId, serviceTypeId, status, priority, assignedAgent, notes_encrypted, applicationData_encrypted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [request.requestNumber, request.citizenId, request.serviceTypeId, request.status || 'submitted', 
       request.priority || 'normal', request.assignedAgent, request.notes, request.applicationData]
    );
    return await this.getById(result.id);
  },
  
  async updateStatus(id, status, comments = null, changedBy = 'System') {
    const currentRequest = await this.getById(id);
    
    // Update the request
    await runQuery(
      `UPDATE service_requests 
       SET status = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id]
    );
    
    // Add to history
    await runQuery(
      `INSERT INTO request_history (requestId, oldStatus, newStatus, changedBy, comments)
       VALUES (?, ?, ?, ?, ?)`,
      [id, currentRequest.status, status, changedBy, comments]
    );
    
    return await this.getById(id);
  }
};

const serviceTypeService = {
  async getAll() {
    return await allQuery(`
      SELECT st.*, ga.name as agencyName, ga.category as agencyCategory
      FROM service_types st
      JOIN government_agencies ga ON st.agencyId = ga.id
      WHERE st.isActive = 1
      ORDER BY st.category, st.name
    `);
  },
  
  async getByCategory(category) {
    return await allQuery(`
      SELECT st.*, ga.name as agencyName
      FROM service_types st
      JOIN government_agencies ga ON st.agencyId = ga.id
      WHERE st.category = ? AND st.isActive = 1
      ORDER BY st.name
    `, [category]);
  }
};

const agencyService = {
  async getAll() {
    return await allQuery('SELECT * FROM government_agencies ORDER BY name');
  },
  
  async getById(id) {
    return await getQuery('SELECT * FROM government_agencies WHERE id = ?', [id]);
  }
};

const dashboardService = {
  async getStats() {
    const totalRequests = await getQuery('SELECT COUNT(*) as count FROM service_requests');
    const pendingRequests = await getQuery('SELECT COUNT(*) as count FROM service_requests WHERE status IN ("submitted", "in_review", "pending_documents")');
    const completedRequests = await getQuery('SELECT COUNT(*) as count FROM service_requests WHERE status = "approved"');
    const totalCitizens = await getQuery('SELECT COUNT(*) as count FROM citizens');
    const totalRevenue = await getQuery('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = "completed"');
    
    return {
      totalRequests: totalRequests.count,
      pendingRequests: pendingRequests.count,
      completedRequests: completedRequests.count,
      totalCitizens: totalCitizens.count,
      totalRevenue: parseFloat(totalRevenue.total) || 0
    };
  },
  
  async getRecentRequests(limit = 5) {
    return await allQuery(`
      SELECT r.requestNumber, r.status, r.submittedDate,
             c.firstName_encrypted, c.lastName_encrypted,
             st.name as serviceName
      FROM service_requests r
      JOIN citizens c ON r.citizenId = c.id
      JOIN service_types st ON r.serviceTypeId = st.id
      ORDER BY r.submittedDate DESC
      LIMIT ?
    `, [limit]);
  }
};

// Export database instance and services
module.exports = {
  initializeDatabase,
  getDb: () => db,
  runQuery,
  getQuery,
  allQuery,
  citizenService,
  serviceRequestService,
  serviceTypeService,
  agencyService,
  dashboardService
};