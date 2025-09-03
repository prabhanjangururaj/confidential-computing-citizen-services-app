const axios = require('axios');
const fs = require('fs');
const https = require('https');

class FortanixDSMService {
  constructor() {
    this.authMethod = process.env.FORTANIX_AUTH_METHOD || 'api_key';
    
    // Use correct endpoint based on authentication method
    if (this.authMethod === 'trusted_ca') {
      this.endpoint = process.env.APP_FORTANIX_DSM_ENDPOINT || 'https://apps.amer.smartkey.io';
    } else {
      this.endpoint = process.env.FORTANIX_DSM_ENDPOINT || 'https://amer.smartkey.io';
    }
    
    this.apiKey = process.env.FORTANIX_API_KEY;
    this.appId = process.env.FORTANIX_APP_ID;
    this.keyId = process.env.FORTANIX_KEY_ID;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.demoMode = false;
  }

  /**
   * Authenticate to DSM based on configured method
   */
  async authenticate() {
    if (this.authMethod === 'trusted_ca') {
      return await this.authenticateWithTrustedCA();
    } else {
      return await this.authenticateWithAPIKey();
    }
  }

  /**
   * Authenticate to DSM using API Key and get Bearer token
   */
  async authenticateWithAPIKey() {
    try {
      console.log('🔐 Authenticating to Fortanix DSM with API Key...');
      
      // Check if using demo/placeholder credentials or if API key looks like a demo key
      if (this.apiKey.includes('fff-ff-ff-ff-ff-f') || this.apiKey.includes('your-') || !this.apiKey || this.apiKey.length < 10) {
        console.log('🧪 Demo mode: Using simulated encryption for demonstration');
        this.accessToken = 'demo-access-token';
        this.tokenExpiry = Date.now() + (3600 * 1000);
        this.demoMode = true;
        return this.accessToken;
      }
      
      const response = await axios({
        method: 'POST',
        url: `${this.endpoint}/sys/v1/session/auth`,
        headers: {
          'Authorization': `Basic ${this.apiKey}`
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      this.demoMode = false;
      
      console.log('✅ Successfully authenticated with Fortanix DSM using API Key');
      return this.accessToken;
    } catch (error) {
      console.error('❌ DSM API Key Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Authenticate using Trusted CA Certificates
   * Uses enclave certificates for production deployment
   */
  async authenticateWithTrustedCA() {
    try {
      console.log('🔐 Authenticating to Fortanix DSM with Trusted CA Certificates...');
      
      // Check if certificate files exist (CCM only provides cert and key, not ca.pem)
      const certPaths = {
        cert: '/opt/fortanix/enclave-os/default_cert/app_public.pem',
        key: '/opt/fortanix/enclave-os/default_cert/app_private.pem'
      };
      
      // Verify required certificate files exist
      const missingFiles = [];
      for (const [type, path] of Object.entries(certPaths)) {
        if (!fs.existsSync(path)) {
          missingFiles.push(`${type}: ${path}`);
        }
      }
      
      if (missingFiles.length > 0) {
        throw new Error(`Certificate files not found: ${missingFiles.join(', ')}. Trusted CA authentication requires certificates to be present in the confidential computing environment.`);
      }
      
      console.log(`📜 Using certificates:`);
      console.log(`   Public Key: ${certPaths.cert}`);
      console.log(`   Private Key: ${certPaths.key}`);
      
      const httpsAgent = new https.Agent({
        cert: fs.readFileSync(certPaths.cert),
        key: fs.readFileSync(certPaths.key),
        rejectUnauthorized: false  // No CA cert validation needed
      });
      
      console.log('📤 Making Trusted CA authentication request:');
      console.log(`   Endpoint: ${this.endpoint}/sys/v1/session/auth`);
      console.log(`   Method: POST`);
      console.log(`   Auth: -u ${this.appId} (Basic auth with app_id)`);
      console.log(`   Body: (empty)`);
      console.log(`   mTLS: Using client certificates`);
      
      const response = await axios({
        method: 'POST',
        url: `${this.endpoint}/sys/v1/session/auth`,
        auth: {
          username: this.appId,
          password: ''  // Empty password, just app_id as username
        },
        httpsAgent: httpsAgent,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      this.demoMode = false;
      
      console.log('✅ Successfully authenticated with Fortanix DSM using Trusted CA');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Trusted CA Authentication failed:', error.response?.data || error.message);
      console.error('   Make sure certificates are properly installed and CA is uploaded to DSM');
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.authenticate();
    }
    return this.accessToken;
  }

  /**
   * Encrypt data using Fortanix DSM
   * @param {string} plaintext - Data to encrypt
   * @returns {string} - Base64 encoded encrypted data
   */
  async encryptData(plaintext) {
    try {
      if (!plaintext) return null;

      await this.ensureAuthenticated();
      
      // Demo mode simulation
      if (this.demoMode) {
        const simulatedCipher = Buffer.from(`encrypted:${plaintext}:${Date.now()}`).toString('base64');
        console.log(`🧪 Demo encryption: "${plaintext}" -> "${simulatedCipher.substring(0, 20)}..."`);
        return simulatedCipher;
      }

      // For Trusted CA, use BOTH Bearer token AND certificates for crypto operations
      let requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      };

      if (this.authMethod === 'trusted_ca') {
        // Use certificate authentication along with Bearer token
        requestConfig.httpsAgent = new https.Agent({
          cert: fs.readFileSync('/opt/fortanix/enclave-os/default_cert/app_public.pem'),
          key: fs.readFileSync('/opt/fortanix/enclave-os/default_cert/app_private.pem'),
          rejectUnauthorized: false
        });
      }

      const response = await axios.post(
        `${this.endpoint}/crypto/v1/encrypt`,
        {
          key: { kid: this.keyId },
          alg: 'AES',
          mode: 'CBC',
          plain: Buffer.from(plaintext, 'utf8').toString('base64')
        },
        requestConfig
      );

      // Store both cipher and iv as JSON string for decryption
      return JSON.stringify({
        cipher: response.data.cipher,
        iv: response.data.iv
      });
    } catch (error) {
      console.error('❌ Encryption failed:', error.response?.data || error.message);
      throw new Error('Failed to encrypt data with Fortanix DSM');
    }
  }

  /**
   * Decrypt data using Fortanix DSM
   * @param {string} ciphertext - Base64 encoded encrypted data
   * @returns {string} - Decrypted plaintext
   */
  async decryptData(ciphertext) {
    try {
      if (!ciphertext) return null;

      await this.ensureAuthenticated();

      // Check if this is legacy plaintext or encrypted JSON data
      let cipherData;
      try {
        cipherData = JSON.parse(ciphertext);
        // Verify it has the expected structure
        if (!cipherData.cipher || !cipherData.iv) {
          throw new Error('Invalid cipher format');
        }
      } catch (error) {
        // This is legacy plaintext data, return as-is
        console.log('📄 Legacy plaintext data detected, returning as-is');
        return ciphertext;
      }

      // For Trusted CA, use BOTH Bearer token AND certificates for crypto operations
      let requestConfig = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        }
      };

      if (this.authMethod === 'trusted_ca') {
        // Use certificate authentication along with Bearer token
        requestConfig.httpsAgent = new https.Agent({
          cert: fs.readFileSync('/opt/fortanix/enclave-os/default_cert/app_public.pem'),
          key: fs.readFileSync('/opt/fortanix/enclave-os/default_cert/app_private.pem'),
          rejectUnauthorized: false
        });
      }

      const response = await axios.post(
        `${this.endpoint}/crypto/v1/decrypt`,
        {
          key: { kid: this.keyId },
          alg: 'AES',
          mode: 'CBC',
          cipher: cipherData.cipher,
          iv: cipherData.iv
        },
        requestConfig
      );

      // Return the decrypted plaintext
      return Buffer.from(response.data.plain, 'base64').toString('utf8');
    } catch (error) {
      console.error('❌ Decryption failed:', error.response?.data || error.message);
      throw new Error('Failed to decrypt data with Fortanix DSM');
    }
  }

  /**
   * Initialize the service and test connectivity
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Fortanix DSM Service...');
      console.log(`📡 DSM Endpoint: ${this.endpoint}`);
      console.log(`🔑 Key ID: ${this.keyId}`);
      console.log(`📱 App ID: ${this.appId}`);
      console.log(`🔐 Auth Method: ${this.authMethod}`);
      
      if (this.authMethod === 'trusted_ca') {
        console.log('🔗 Using APP_FORTANIX_DSM_ENDPOINT for Trusted CA authentication');
      } else {
        console.log('🔗 Using FORTANIX_DSM_ENDPOINT for API Key authentication');
      }

      // Test authentication
      await this.authenticate();
      
      // Test encryption/decryption with a simple string
      const testData = 'Springfield City Services - Test Encryption';
      console.log('🧪 Testing encryption/decryption...');
      
      const encrypted = await this.encryptData(testData);
      console.log('✅ Test data encrypted successfully');
      
      const decrypted = await this.decryptData(encrypted);
      console.log('✅ Test data decrypted successfully');
      
      if (decrypted === testData) {
        console.log('🎉 Fortanix DSM Service initialized successfully!');
        console.log(`🛡️  All citizen data will be encrypted with ${this.authMethod.toUpperCase()} authentication`);
        console.log('✅ Application-level encryption ready');
      } else {
        throw new Error('Encryption/Decryption test failed');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Fortanix DSM Service:', error.message);
      throw error;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck() {
    try {
      await this.ensureAuthenticated();
      return {
        status: 'healthy',
        endpoint: this.endpoint,
        authenticated: !!this.accessToken,
        keyId: this.keyId
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        endpoint: this.endpoint
      };
    }
  }
}

module.exports = FortanixDSMService;
