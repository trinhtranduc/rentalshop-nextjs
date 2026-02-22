#!/bin/bash

# ========================================
# Docker Local Development Helper Script
# ========================================
# Quick commands for Docker local development
#
# Usage:
#   ./scripts/docker-dev.sh start      # Start all services
#   ./scripts/docker-dev.sh stop       # Stop all services
#   ./scripts/docker-dev.sh logs       # View logs
#   ./scripts/docker-dev.sh rebuild    # Rebuild and start
#   ./scripts/docker-dev.sh clean      # Stop and remove volumes
# ========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

COMPOSE_FILE="docker-compose.dev.yml"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Use docker compose (newer) or docker-compose (older)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

# Function to start services
start_services() {
    print_info "Starting Docker services..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d
    
    print_info "Waiting for services to be healthy..."
    sleep 5
    
    print_success "Services started!"
    echo ""
    print_info "Services:"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Qdrant:     http://localhost:6333"
    echo "  - API:        http://localhost:3002"
    echo "  - Admin:      http://localhost:3001"
    echo "  - Client:     http://localhost:3000"
    echo ""
    print_info "View logs: ./scripts/docker-dev.sh logs"
}

# Function to stop services
stop_services() {
    print_info "Stopping Docker services..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE down
    print_success "Services stopped!"
}

# Function to view logs
view_logs() {
    if [ -z "$2" ]; then
        print_info "Viewing logs for all services (Ctrl+C to exit)..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f
    else
        print_info "Viewing logs for $2 (Ctrl+C to exit)..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f "$2"
    fi
}

# Function to rebuild services
rebuild_services() {
    print_info "Rebuilding Docker services..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE build --no-cache
    print_info "Starting services..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE up -d
    print_success "Services rebuilt and started!"
}

# Function to clean everything
clean_services() {
    print_warning "This will stop all services and remove volumes (data will be lost)!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping services and removing volumes..."
        $DOCKER_COMPOSE -f $COMPOSE_FILE down -v
        print_success "Services cleaned!"
    else
        print_info "Cancelled."
    fi
}

# Function to show status
show_status() {
    print_info "Service status:"
    $DOCKER_COMPOSE -f $COMPOSE_FILE ps
    echo ""
    print_info "Health checks:"
    echo "  PostgreSQL: $(curl -s http://localhost:5432 > /dev/null 2>&1 && echo '✅' || echo '❌')"
    echo "  Qdrant:     $(curl -s http://localhost:6333/health > /dev/null 2>&1 && echo '✅' || echo '❌')"
    echo "  API:        $(curl -s http://localhost:3002/api/health > /dev/null 2>&1 && echo '✅' || echo '❌')"
    echo "  Admin:      $(curl -s http://localhost:3001 > /dev/null 2>&1 && echo '✅' || echo '❌')"
    echo "  Client:     $(curl -s http://localhost:3000 > /dev/null 2>&1 && echo '✅' || echo '❌')"
}

# Function to setup database
setup_database() {
    print_info "Setting up database..."
    
    # Check if API container is running
    if ! $DOCKER_COMPOSE -f $COMPOSE_FILE ps api | grep -q "Up"; then
        print_error "API service is not running. Please start services first."
        exit 1
    fi
    
    print_info "Generating Prisma Client..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T api npx prisma generate --schema=../../prisma/schema.prisma || \
    yarn db:generate
    
    print_info "Running migrations..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T api npx prisma migrate deploy --schema=../../prisma/schema.prisma || \
    yarn db:migrate:dev
    
    print_success "Database setup complete!"
    print_info "To seed database: yarn db:regenerate-system"
}

# Main command handler
case "$1" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    logs)
        view_logs "$@"
        ;;
    rebuild)
        rebuild_services
        ;;
    clean)
        clean_services
        ;;
    status)
        show_status
        ;;
    setup-db)
        setup_database
        ;;
    *)
        echo "Usage: $0 {start|stop|logs|rebuild|clean|status|setup-db}"
        echo ""
        echo "Commands:"
        echo "  start      Start all Docker services"
        echo "  stop       Stop all Docker services"
        echo "  logs       View logs (optionally specify service: api, admin, client, postgres, qdrant)"
        echo "  rebuild    Rebuild and start all services"
        echo "  clean      Stop services and remove volumes (⚠️  deletes data)"
        echo "  status     Show service status and health checks"
        echo "  setup-db   Setup database (generate Prisma, run migrations)"
        echo ""
        echo "Examples:"
        echo "  $0 start"
        echo "  $0 logs api"
        echo "  $0 setup-db"
        exit 1
        ;;
esac
