#!/bin/bash

# Test deployment script
echo "🚀 Testing deployment setup..."

# Check if required files exist
echo "📁 Checking required files..."

FILES=(
    "frontend/vercel.json"
    "frontend/.env.production"
    "backend/render.yaml"
    "backend/.env"
    "DEPLOYMENT.md"
    "QUICK_DEPLOY.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

# Test backend build
echo ""
echo "🔧 Testing backend..."
cd backend
if npm install --silent; then
    echo "✅ Backend dependencies installed"
else
    echo "❌ Backend dependencies failed"
fi

if npm run build --silent; then
    echo "✅ Backend build successful"
else
    echo "❌ Backend build failed"
fi

# Test frontend build
echo ""
echo "🔧 Testing frontend..."
cd ../frontend
if npm install --silent; then
    echo "✅ Frontend dependencies installed"
else
    echo "❌ Frontend dependencies failed"
fi

if npm run build --silent; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
fi

echo ""
echo "🎉 Deployment test completed!"
echo ""
echo "Next steps:"
echo "1. Push code to GitHub"
echo "2. Follow QUICK_DEPLOY.md instructions"
echo "3. Deploy backend to Render"
echo "4. Deploy frontend to Vercel"
