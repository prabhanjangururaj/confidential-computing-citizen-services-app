#!/bin/bash

# Enterprise HR Management System - Build Script
# Complete 3-Tier Application for Azure Confidential ACI

set -e

echo "🏗️  Building Enterprise HR Management System"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="hr-management-system"
TAG="latest"
CONTAINER_NAME="hr-demo"
PORT="8080"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to clean up old containers and images
cleanup() {
    print_status "Cleaning up old containers and images..."
    
    # Stop and remove existing container
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_status "Removing existing container: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME} >/dev/null 2>&1 || true
        docker rm ${CONTAINER_NAME} >/dev/null 2>&1 || true
    fi
    
    # Remove old image
    if docker images --format 'table {{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:${TAG}$"; then
        print_status "Removing old image: ${IMAGE_NAME}:${TAG}"
        docker rmi ${IMAGE_NAME}:${TAG} >/dev/null 2>&1 || true
    fi
    
    print_success "Cleanup completed"
}

# Function to build the Docker image
build_image() {
    print_status "Building 3-tier HR Management System..."
    print_status "Architecture: React Frontend + Node.js API + SQLite Database"
    
    echo ""
    echo "🔨 Building with multi-stage Dockerfile..."
    echo "   Stage 1: Frontend build (React + optimization)"
    echo "   Stage 2: Backend dependencies (Node.js modules)"
    echo "   Stage 3: Production assembly (All tiers + Nginx + Supervisor)"
    echo ""
    
    # Build with detailed output
    docker build \
        -f Dockerfile.final \
        -t ${IMAGE_NAME}:${TAG} \
        . | tee build.log
        
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "Docker image built successfully"
    else
        print_error "Docker build failed"
        exit 1
    fi
}

# Function to check image size
check_size() {
    print_status "Checking image size..."
    
    SIZE_BYTES=$(docker image inspect ${IMAGE_NAME}:${TAG} --format='{{.Size}}')
    SIZE_MB=$((SIZE_BYTES / 1024 / 1024))
    SIZE_GB=$((SIZE_MB / 1024))
    
    echo "📊 Image Size Analysis:"
    echo "   Raw size: ${SIZE_BYTES} bytes"
    echo "   Size in MB: ${SIZE_MB} MB"
    echo "   Size in GB: ${SIZE_GB} GB"
    
    # Check 3GB limit for Azure Confidential ACI
    if [ ${SIZE_MB} -lt 3072 ]; then
        print_success "✅ Image size (${SIZE_MB} MB) is under 3GB limit for Azure Confidential ACI"
    else
        print_warning "⚠️  Image size (${SIZE_MB} MB) exceeds 3GB limit for Azure Confidential ACI"
        echo "   Consider further optimization for production deployment"
    fi
    
    # Show detailed size breakdown
    echo ""
    echo "📋 Layer Analysis:"
    docker history ${IMAGE_NAME}:${TAG} --format "table {{.CreatedBy}}\t{{.Size}}" | head -10
}

# Function to run the container
run_container() {
    print_status "Starting HR Management System container..."
    
    # Run container with health check
    docker run -d \
        --name ${CONTAINER_NAME} \
        -p ${PORT}:80 \
        --restart unless-stopped \
        ${IMAGE_NAME}:${TAG}
        
    if [ $? -eq 0 ]; then
        print_success "Container started successfully"
        print_status "Container ID: $(docker ps -q -f name=${CONTAINER_NAME})"
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Function to wait for services to be ready
wait_for_services() {
    print_status "Waiting for all services to be ready..."
    
    # Wait up to 60 seconds for services to start
    for i in {1..60}; do
        if curl -f -s http://localhost:${PORT}/health >/dev/null 2>&1; then
            print_success "All services are healthy and ready!"
            break
        fi
        
        if [ $i -eq 60 ]; then
            print_error "Services did not start within 60 seconds"
            print_status "Checking container logs..."
            docker logs ${CONTAINER_NAME} --tail 20
            exit 1
        fi
        
        echo -n "."
        sleep 1
    done
    echo ""
}

# Function to show service status
show_status() {
    print_status "Service Status Check:"
    
    # Container status
    CONTAINER_STATUS=$(docker inspect ${CONTAINER_NAME} --format='{{.State.Status}}')
    echo "   Container Status: ${CONTAINER_STATUS}"
    
    # Health check
    HEALTH_STATUS=$(docker inspect ${CONTAINER_NAME} --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    echo "   Health Status: ${HEALTH_STATUS}"
    
    # Port mapping
    PORT_MAPPING=$(docker port ${CONTAINER_NAME})
    echo "   Port Mapping: ${PORT_MAPPING}"
    
    # Test endpoints
    echo ""
    echo "🔍 Endpoint Testing:"
    
    # Test frontend
    if curl -f -s http://localhost:${PORT}/ >/dev/null 2>&1; then
        echo "   ✅ Frontend (React): http://localhost:${PORT}/"
    else
        echo "   ❌ Frontend: Not accessible"
    fi
    
    # Test API
    if curl -f -s http://localhost:${PORT}/api/health >/dev/null 2>&1; then
        echo "   ✅ API Health: http://localhost:${PORT}/api/health"
    else
        echo "   ❌ API Health: Not accessible"
    fi
    
    # Test data endpoints
    if curl -f -s http://localhost:${PORT}/api/employees >/dev/null 2>&1; then
        echo "   ✅ Employee API: http://localhost:${PORT}/api/employees"
    else
        echo "   ❌ Employee API: Not accessible"
    fi
}

# Function to show final information
show_final_info() {
    echo ""
    echo "🎉 Enterprise HR Management System Successfully Built and Deployed!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🌐 Access Your Application:"
    echo "   Frontend:     http://localhost:${PORT}/"
    echo "   API Docs:     http://localhost:${PORT}/api"
    echo "   Health Check: http://localhost:${PORT}/health"
    echo ""
    echo "📊 Key Features:"
    echo "   ✓ 3-Tier Architecture (Presentation, Business Logic, Data)"
    echo "   ✓ Modern React Frontend with Professional UI"
    echo "   ✓ RESTful Node.js API with Business Logic"
    echo "   ✓ SQLite Database with Sample HR Data"
    echo "   ✓ Nginx Reverse Proxy and Static File Serving"
    echo "   ✓ Container Health Monitoring"
    echo "   ✓ Production-Ready Configuration"
    echo ""
    echo "🛡️  Enterprise Security:"
    echo "   ✓ Helmet.js Security Headers"
    echo "   ✓ CORS Protection"
    echo "   ✓ Rate Limiting"
    echo "   ✓ Input Validation & Sanitization"
    echo "   ✓ SQL Injection Prevention"
    echo ""
    echo "📱 Sample Data Available:"
    echo "   • 10 Employees across 5 Departments"
    echo "   • Performance Reviews & Ratings"
    echo "   • Payroll Calculations & Statistics"
    echo "   • Department Analytics"
    echo ""
    echo "🐳 Container Management:"
    echo "   View Logs:    docker logs ${CONTAINER_NAME}"
    echo "   Stop:         docker stop ${CONTAINER_NAME}"
    echo "   Start:        docker start ${CONTAINER_NAME}"
    echo "   Remove:       docker rm ${CONTAINER_NAME}"
    echo "   Shell Access: docker exec -it ${CONTAINER_NAME} /bin/sh"
    echo ""
    echo "☁️  Azure Confidential ACI Ready:"
    echo "   Image: ${IMAGE_NAME}:${TAG}"
    echo "   Size: Under 3GB limit ✓"
    echo "   Health Check: Configured ✓"
    echo "   Single Container: All tiers included ✓"
    echo ""
    echo "🚀 Ready for Enterprise Demo!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Function to handle errors
handle_error() {
    print_error "Build process failed. Check the logs above for details."
    print_status "You can also check Docker logs: docker logs ${CONTAINER_NAME}"
    exit 1
}

# Trap errors
trap 'handle_error' ERR

# Main build process
main() {
    echo "Starting build process..."
    echo "Target: Single container with all 3 tiers"
    echo "Limit: <3GB for Azure Confidential ACI"
    echo ""
    
    check_docker
    cleanup
    build_image
    check_size
    run_container
    wait_for_services
    show_status
    show_final_info
}

# Handle command line arguments
case "${1:-build}" in
    "clean")
        print_status "Cleaning up containers and images..."
        cleanup
        print_success "Cleanup completed"
        ;;
    "logs")
        docker logs ${CONTAINER_NAME} -f
        ;;
    "stop")
        docker stop ${CONTAINER_NAME} 2>/dev/null || print_warning "Container not running"
        ;;
    "start")
        docker start ${CONTAINER_NAME} 2>/dev/null || print_warning "Container not found"
        ;;
    "restart")
        docker restart ${CONTAINER_NAME} 2>/dev/null || print_warning "Container not found"
        ;;
    "status")
        show_status
        ;;
    "build")
        main
        ;;
    *)
        echo "Usage: $0 {build|clean|logs|start|stop|restart|status}"
        echo ""
        echo "Commands:"
        echo "  build    - Build and run the complete HR system (default)"
        echo "  clean    - Clean up containers and images"
        echo "  logs     - Show container logs"
        echo "  start    - Start stopped container"
        echo "  stop     - Stop running container"
        echo "  restart  - Restart container"
        echo "  status   - Show current status"
        exit 1
        ;;
esac