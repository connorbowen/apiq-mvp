#!/bin/bash

# APIQ Development Startup Script
# This script automates the common startup sequence for development

set -e  # Exit on any error

echo "🚀 Starting APIQ Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if PostgreSQL is running
print_status "Checking PostgreSQL status..."
if ! brew services list | grep -q "postgresql@15.*started"; then
    print_warning "PostgreSQL is not running. Starting it now..."
    brew services start postgresql@15
    sleep 3
else
    print_success "PostgreSQL is already running"
fi

# Check if database exists
print_status "Checking if database exists..."
if ! psql -lqt | cut -d \| -f 1 | grep -qw apiq; then
    print_warning "Database 'apiq' does not exist. Creating it now..."
    createdb apiq
    print_success "Database 'apiq' created"
else
    print_success "Database 'apiq' exists"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        print_success ".env file created from template"
        print_warning "Please update .env with your configuration values"
    else
        print_error "env.example not found. Please create .env file manually"
        exit 1
    fi
else
    print_success ".env file exists"
fi

# Run Prisma migrations
print_status "Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Test database connection
print_status "Testing database connection..."
if npx tsx scripts/test-db.ts > /dev/null 2>&1; then
    print_success "Database connection test passed"
else
    print_error "Database connection test failed"
    exit 1
fi

print_success "🎉 Setup complete! Starting development server..."
print_status "The application will be available at http://localhost:3000"
print_status "Press Ctrl+C to stop the server"

# Start the development server
npm run dev 