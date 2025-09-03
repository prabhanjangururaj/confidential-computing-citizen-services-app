#!/bin/bash
# Setup script for Fortanix DSM encryption with Springfield City Services

echo "🔐 Setting up Fortanix DSM Encryption for Springfield City Services"
echo ""

# Check if fortanix-dsm.env exists
if [ ! -f "fortanix-dsm.env" ]; then
    echo "❌ Error: fortanix-dsm.env file not found!"
    echo "   Please ensure fortanix-dsm.env exists in the current directory"
    exit 1
fi

echo "📋 Found fortanix-dsm.env configuration file"

# Check if API key is set
if grep -q "your-api-key-here" fortanix-dsm.env; then
    echo "⚠️  Warning: Please update FORTANIX_API_KEY in fortanix-dsm.env with your actual API key"
    echo ""
fi

# Build the container
echo "🏗️  Building container with encryption support..."
docker build -f Dockerfile.final -t citizen-services-system:latest . || {
    echo "❌ Container build failed"
    exit 1
}

echo "✅ Container built successfully"

# Stop and remove existing container if it exists
echo "🔄 Stopping existing containers..."
docker stop citizen-services-demo-fixed citizen-services-encrypted 2>/dev/null || true
docker rm citizen-services-demo-fixed citizen-services-encrypted 2>/dev/null || true

# Start container with encryption
echo "🚀 Starting Springfield City Services with Fortanix DSM encryption..."
docker run -d --name citizen-services-encrypted \
  -p 8080:80 \
  --env-file fortanix-dsm.env \
  --restart unless-stopped \
  citizen-services-system:latest || {
    echo "❌ Failed to start container"
    exit 1
}

echo ""
echo "✅ Springfield City Services started successfully!"
echo ""
echo "🌐 Application URL: http://localhost:8080"
echo "🔐 Encryption: Enabled with Fortanix DSM"
echo ""
echo "📊 Check logs:"
echo "   docker logs citizen-services-encrypted"
echo ""
echo "🔍 Monitor container:"
echo "   docker exec -it citizen-services-encrypted sh"
echo ""
echo "Login credentials:"
echo "   Admin: admin / admin123"
echo "   Citizen: jsmith / password123"
echo "   Staff: mgarcia / secure456"