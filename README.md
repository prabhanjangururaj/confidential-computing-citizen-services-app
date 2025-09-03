# City Services - Citizen Services Management System
## Enterprise 3-Tier Application with Hardware-Backed Encryption

A complete citizen services management application demonstrating modern government digital services with **enterprise-grade application-level encryption** using Fortanix Data Security Manager (DSM) and Fortanix Confidential Computing Manager (CCM)

## 🏗️ Architecture

**3-Tier Architecture with Application-Level Encryption:**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   React.js      │    │   Node.js/       │    │   Fortanix DSM  │    │   SQLite         │
│   Frontend      │───▶│   Express API    │───▶│   Hardware HSM  │───▶│   Database       │
│                 │    │                  │    │                 │    │                  │
│ • Citizen Forms │    │ • Encrypt PII    │    │ • AES-256-CBC   │    │ • Encrypted JSON │
│ • Dashboard     │    │ • Decrypt for UI │    │ • FIPS 140-2 L3 │    │ • Plain analytics│
│ • Normal UX     │    │ • Zero Code Δ    │    │ • Key Management│    │ • Mixed legacy   │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
```

- **Tier 1 (Presentation)**: React.js frontend with Tailwind CSS, served by Nginx
- **Tier 2 (Business Logic)**: Node.js/Express.js API with **Fortanix DSM encryption integration**
- **Tier 3 (Data Layer)**: SQLite database with **encrypted PII storage**

## 🔐 Fortanix DSM Integration 

### ✨ Enterprise Application-Level Encryption with Dual Authentication

**🛡️ Security Model:**
- **Hardware-Backed Encryption**: AES-256-CBC using Fortanix Data Security Manager HSM
- **Dual Authentication Support**: API Key + Trusted CA (confidential computing)
- **Transparent Operations**: Zero business logic changes, encryption handled automatically
- **Selective Encryption**: Only sensitive PII encrypted, analytics fields remain queryable
- **Zero-Trust**: New citizen PII never stored in plaintext
- **Graceful Fallbacks**: Shows encrypted labels when decryption fails in constrained environments

**🔒 What Gets Encrypted:**
- **Citizen PII**: Names, email, phone, address, date of birth
- **Service Request Data**: Notes, application details
- **Database Storage**: `{"cipher":"abc123...", "iv":"def456..."}`

**📊 What Stays Unencrypted (Analytics):**
- City, State (geographic reporting)
- Service types, status, timestamps (workflow management)
- Agency information (operational routing)

### 🔑 Dual Authentication Methods

**🏗️ API Key Authentication:**
```env
FORTANIX_AUTH_METHOD=api_key
FORTANIX_DSM_ENDPOINT=https://amer.smartkey.io
FORTANIX_KEY_ID=6ebb-6ebb-6ebb-6ebb
FORTANIX_API_KEY=MTU3ZDA3YmYtNMTU3ZDA3YmYtNMTU3ZDA3YmYtNMTU3ZDA3YmYtN...
```

**🛡️ Trusted CA Authentication (Confidential Computing):**
```env
FORTANIX_AUTH_METHOD=trusted_ca
APP_FORTANIX_DSM_ENDPOINT=https://apps.amer.smartkey.io
FORTANIX_KEY_ID=6ebb-6ebb-6ebb-6ebb
FORTANIX_APP_ID=0f7385f7-6ebb-6ebb-6ebb-0f7385f7
```

**🔐 Authentication Flow Details:**

**API Key Method:**
```bash
# Authentication
POST https://<DSM_ENDPOINT>/sys/v1/session/auth
Authorization: Basic <FORTANIX_API_KEY>

# Encrypt/Decrypt Operations  
POST https://<DSM_ENDPOINT>/crypto/v1/encrypt
Authorization: Bearer <access_token>
```

**Trusted CA Method:**
```bash
# Authentication (mTLS + Basic Auth)
POST https://<APPS_DSM_ENDPOINT>/sys/v1/session/auth
Authorization: Basic <FORTANIX_APP_ID>:
--cert /opt/fortanix/enclave-os/default_cert/app_public.pem
--key /opt/fortanix/enclave-os/default_cert/app_private.pem

# Encrypt/Decrypt Operations (mTLS + Bearer)
POST https://<APPS_DSM_ENDPOINT>/crypto/v1/encrypt
Authorization: Bearer <access_token>
--cert /opt/fortanix/enclave-os/default_cert/app_public.pem  
--key /opt/fortanix/enclave-os/default_cert/app_private.pem
```

## 🔐 Fortanix CCM Integration 

**📍 Certificate Paths (Fortanix CCM attestation certificates):**
- **Public Certificate**: `/opt/fortanix/enclave-os/default_cert/app_public.pem`
- **Private Key**: `/opt/fortanix/enclave-os/default_cert/app_private.pem`
- **CA Certificate**: Download using CCM APIs 

### 🚀 Quick Start

**🏗️ Development Deployment (API Key):**
```bash
# Configure for API Key authentication
echo 'FORTANIX_AUTH_METHOD=api_key' >> fortanix-dsm.env

# Build and run with integrated encryption
docker build --platform=linux/amd64 -f Dockerfile.final -t citizen-services-system:latest .
docker run -d --name citizen-services-system -p 8080:80 --restart unless-stopped citizen-services-system:latest
# Enroll the compute node and provide workload measurements to CCM for attestation. 

# Access the application
open http://localhost:8080
```

### 📋 Login Credentials

| Username | Password | Role | Name |
|----------|----------|------|------|
| **admin** | **admin123** | Administrator | System Admin |
| **jsmith** | **password123** | Citizen | John Smith |
| **mgarcia** | **secure456** | Staff | Maria Garcia |

## 🔍 Encryption in Action

### Database Storage (Encrypted)
```sql
sqlite> SELECT firstName_encrypted FROM citizens WHERE citizenId = 'CIT2025001';
{"cipher":"W0Dkbrcr21M7TiuINDddXg==","iv":"MEgX870U8wOI52J7q5AGtA=="}
```

### API Response (Decrypted)  
```json
{
  "firstName": "John",
  "lastName": "Smith", 
  "email": "john.smith@springfield.gov",
  "city": "Springfield",
  "state": "IL"
}
```

### Graceful Fallback (Decryption Timeout)
```json
{
  "firstName": "[Encrypted]",
  "lastName": "[Data]",
  "email": "[Encrypted Email]",
  "city": "Springfield", 
  "state": "IL"
}
```

### Data Flow
```
User Input → API Encryption → HSM Processing → Database Storage
     ↓              ↓              ↓              ↓
"John Smith" → fortanixDSM.encrypt() → AES-256-CBC → {"cipher":"...", "iv":"..."}

Database Query → HSM Decryption → API Response → UI Display  
     ↓              ↓              ↓              ↓
{"cipher":"..."} → fortanixDSM.decrypt() → "John Smith" → Dashboard shows "John Smith"
```


## 📊 Database Access

```bash
# Access the running container
docker exec -it citizen-services-encrypted sh

# Navigate to database location  
cd /app/backend/database

# Open SQLite database
sqlite3 citizen_services.db

# View encrypted citizen data
SELECT citizenId, firstName_encrypted, city FROM citizens;

# View service requests with decrypted names via API
curl http://localhost:8080/api/dashboard/recent-activity
```
