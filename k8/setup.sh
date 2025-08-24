#!/bin/bash
set -e

echo "🏌️ Setting up Putty Putting Coach Kubernetes Deployment"

# Configuration
REGISTRY="registry.digitalocean.com/resourceloop"
IMAGE_NAME="putty-frontend"
VERSION="v1.0.0"
NAMESPACE="putty"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the putty-app root directory"
    exit 1
fi

echo "📦 Building Expo web application..."
yarn build:web

echo "🐳 Building Docker image..."
docker build -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} .

echo "🚀 Pushing Docker image to registry..."
docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}

echo "☸️ Applying Kubernetes manifests..."
kubectl apply -f k8/

echo "⏳ Waiting for deployment to be ready..."
kubectl rollout status deployment/putty-app -n ${NAMESPACE} --timeout=300s

echo "🌐 Getting ingress status..."
kubectl get ingress -n ${NAMESPACE}

echo "✅ Deployment complete!"
echo "🎯 Your Putty app should be available at: https://putty.scalebase.io"

# Optional: Show pod status
echo "📊 Pod status:"
kubectl get pods -n ${NAMESPACE}