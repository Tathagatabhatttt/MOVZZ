#!/bin/bash

# MOVZZ Backend Setup Script (No Docker)
# This script automates the manual setup process

set -e  # Exit on error

echo "🚀 MOVZZ Backend Setup"
echo "====================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo "📦 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo ""
    echo "Please install PostgreSQL 14+:"
    echo "  macOS:   brew install postgresql@14"
    echo "  Ubuntu:  sudo apt install postgresql"
    echo "  Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL $(psql --version | awk '{print $3}') detected${NC}"

# Check if PostgreSQL is running
if ! pg_isready &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL is not running${NC}"
    echo "Starting PostgreSQL..."
    
    # Try to start PostgreSQL based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql@14 || brew services start postgresql
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo systemctl start postgresql
    fi
    
    sleep 2
    
    if ! pg_isready &> /dev/null; then
        echo -e "${RED}❌ Could not start PostgreSQL${NC}"
        echo "Please start it manually and run this script again"
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Set up environment variables
if [ ! -f .env ]; then
    echo "⚙️  Setting up environment variables..."
    cp .env.example .env
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        sed -i '' "s/your-refresh-token-secret/$REFRESH_SECRET/" .env
    else
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
        sed -i "s/your-refresh-token-secret/$REFRESH_SECRET/" .env
    fi
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
    echo -e "${YELLOW}⚠️  Please update DATABASE_URL in .env with your PostgreSQL credentials${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists, skipping...${NC}"
fi
echo ""

# Database setup instructions
echo "🗄️  Database Setup"
echo "=================="
echo ""
echo "Please run the following SQL commands in PostgreSQL:"
echo ""
echo -e "${YELLOW}psql postgres${NC}"
echo ""
echo "Then execute:"
echo -e "${GREEN}"
echo "CREATE DATABASE movzz_dev;"
echo "CREATE USER movzz WITH PASSWORD 'movzz_secure_password_123';"
echo "GRANT ALL PRIVILEGES ON DATABASE movzz_dev TO movzz;"
echo "\c movzz_dev"
echo "GRANT ALL ON SCHEMA public TO movzz;"
echo "\q"
echo -e "${NC}"
echo ""
read -p "Press Enter after you've created the database..."
echo ""

# Update DATABASE_URL in .env
echo "⚙️  Updating DATABASE_URL in .env..."
DB_URL="postgresql://movzz:movzz_secure_password_123@localhost:5432/movzz_dev?schema=public"

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" .env
else
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"$DB_URL\"|" .env
fi

echo -e "${GREEN}✅ DATABASE_URL updated${NC}"
echo ""

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run prisma:generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
npm run prisma:migrate dev --name initial_schema
echo -e "${GREEN}✅ Database migrations completed${NC}"
echo ""

# Success message
echo ""
echo "🎉 =================================="
echo "🎉 Setup Complete!"
echo "🎉 =================================="
echo ""
echo "Your backend is ready to run!"
echo ""
echo "Next steps:"
echo "  1. Review .env file and update if needed"
echo "  2. Start the server: ${GREEN}npm run dev${NC}"
echo "  3. Test health check: ${GREEN}curl http://localhost:5000/health${NC}"
echo ""
echo "Optional:"
echo "  - View database: ${GREEN}npm run prisma:studio${NC}"
echo "  - Check logs: ${GREEN}tail -f logs/combined.log${NC}"
echo ""
echo "Documentation:"
echo "  - Setup Guide: backend/MANUAL_SETUP.md"
echo "  - API Docs: backend/README.md"
echo ""
echo "Happy coding! 🚀"
echo ""
