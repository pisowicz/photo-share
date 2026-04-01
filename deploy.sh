#!/bin/bash

echo "🚀 Deploying Photo Share App to Render.com"
echo ""

# Check if .env has actual values
if grep -q "your_cloud_name\|your_api_key\|your_api_secret" .env 2>/dev/null; then
    echo "❌ Error: .env file still has placeholder values!"
    echo "Please update .env with your actual Cloudinary credentials:"
    echo "  CLOUDINARY_CLOUD_NAME=dedyd8imi"
    echo "  CLOUDINARY_API_KEY=747989251765642"
    echo "  CLOUDINARY_API_SECRET=SMQDnlJwOQE0e2oUa_PzRaa60RU"
    exit 1
fi

echo "✅ Environment variables configured"

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo ""
echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com and create a free account"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repo or use 'Deploy from directory'"
echo "4. Set environment variables in Render dashboard:"
echo "   - CLOUDINARY_CLOUD_NAME=dedyd8imi"
echo "   - CLOUDINARY_API_KEY=747989251765642"
echo "   - CLOUDINARY_API_SECRET=SMQDnlJwOQE0e2oUa_PzRaa60RU"
echo "5. Deploy!"
echo ""
echo "Or use Render CLI:"
echo "  npm install -g @render/cli"
echo "  render deploy"
