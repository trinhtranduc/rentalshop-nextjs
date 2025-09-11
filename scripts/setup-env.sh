#!/bin/bash

# ============================================================================
# ENVIRONMENT SETUP SCRIPT
# ============================================================================

echo "🚀 Setting up RentalShop environment configuration..."

# Function to create .env.local file
create_env_file() {
    local app_dir=$1
    local env_file="$app_dir/.env.local"
    
    if [ -f "$env_file" ]; then
        echo "⚠️  $env_file already exists. Skipping..."
        return
    fi
    
    echo "📝 Creating $env_file..."
    
    case "$app_dir" in
        "apps/client")
            cat > "$env_file" << EOF
# Application Environment
NEXT_PUBLIC_APP_ENV=local

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3002

# Client App Configuration
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG_LOGGING=true
EOF
            ;;
        "apps/api")
            cat > "$env_file" << EOF
# Application Environment
APP_ENV=local

# Database Configuration
DATABASE_URL="file:./dev.db"

# JWT Configuration
JWT_SECRET="local-jwt-secret-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3002
HOST=localhost

# CORS Origins
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:3002"
EOF
            ;;
        *)
            echo "❌ Unknown app directory: $app_dir"
            return 1
            ;;
    esac
    
    echo "✅ Created $env_file"
}

# Create environment files
echo "🔧 Setting up environment files..."

# Client app
if [ -d "apps/client" ]; then
    create_env_file "apps/client"
else
    echo "⚠️  Client app directory not found"
fi

# API server
if [ -d "apps/api" ]; then
    create_env_file "apps/api"
else
    echo "⚠️  API server directory not found"
fi

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review the created .env.local files"
echo "2. Update any values as needed"
echo "3. Restart your development servers"
echo ""
echo "🚀 To start development:"
echo "Terminal 1: cd apps/api && yarn dev"
echo "Terminal 2: cd apps/client && yarn dev"
echo ""
echo "📚 For more information, see: docs/ENVIRONMENT_SETUP.md"
