# Putty Putting Coach - Deployment Makefile

# Configuration
REGISTRY = registry.digitalocean.com/resourceloop
IMAGE_NAME = putty-frontend
NAMESPACE = putty
PLATFORM = linux/amd64

# Auto-generate version from git commit hash and timestamp
GIT_COMMIT := $(shell git rev-parse --short HEAD)
TIMESTAMP := $(shell date +%Y%m%d-%H%M%S)
VERSION := v1.0.$(shell echo $(GIT_COMMIT) | cut -c1-7)-$(TIMESTAMP)

# Build Expo web application
build-web:
	@echo "📦 Building Expo web application..."
	npx expo export --platform web --clear

# Build Docker image for the correct platform
build-docker:
	@echo "🐳 Building Docker image for $(PLATFORM)..."
	docker buildx build --platform $(PLATFORM) -t $(REGISTRY)/$(IMAGE_NAME):$(VERSION) .

# Push Docker image to registry
push-docker:
	@echo "🚀 Pushing Docker image to registry..."
	docker buildx build --platform $(PLATFORM) -t $(REGISTRY)/$(IMAGE_NAME):$(VERSION) . --push

# Update deployment YAML with current version
update-deployment-version:
	@echo "🔧 Updating deployment.yaml with version $(VERSION)..."
	@sed -i.bak 's|registry.digitalocean.com/resourceloop/putty-frontend:.*|registry.digitalocean.com/resourceloop/putty-frontend:$(VERSION)|g' k8/deployment.yaml
	@rm -f k8/deployment.yaml.bak

# Apply Kubernetes manifests
deploy-k8s: update-deployment-version
	@echo "☸️ Applying Kubernetes manifests with version $(VERSION)..."
	kubectl apply -f k8/namespace.yaml
	kubectl apply -f k8/deployment.yaml -f k8/service.yaml -f k8/ingress.yaml -f k8/hpa.yaml

# Wait for deployment to be ready
wait-deployment:
	@echo "⏳ Waiting for deployment to be ready..."
	kubectl rollout status deployment/putty-app -n $(NAMESPACE) --timeout=300s

# Check deployment status
status:
	@echo "📊 Checking deployment status..."
	kubectl get pods -n $(NAMESPACE)
	kubectl get services -n $(NAMESPACE)
	kubectl get ingress -n $(NAMESPACE)

# View logs
logs:
	@echo "📋 Showing application logs..."
	kubectl logs -f deployment/putty-app -n $(NAMESPACE)

# Scale deployment
scale:
	@read -p "Enter number of replicas: " replicas; \
	kubectl scale deployment/putty-app --replicas=$$replicas -n $(NAMESPACE)

# Delete deployment
delete:
	@echo "🗑️ Deleting deployment..."
	kubectl delete -f k8/

# Show current version
show-version:
	@echo "Current version: $(VERSION)"
	@echo "Git commit: $(GIT_COMMIT)"
	@echo "Timestamp: $(TIMESTAMP)"

# Complete deployment process
deploy-all: show-version build-web push-docker deploy-k8s wait-deployment status
	@echo "✅ Deployment complete!"
	@echo "🎯 Your Putty app should be available at: https://putty.scalebase.io"
	@echo "📦 Deployed version: $(VERSION)"

# Simple deploy command for convenience
deploy: deploy-all

# Quick redeploy (for code changes) - now properly updates version
redeploy: show-version update-deployment-version push-docker
	@echo "🔄 Applying updated deployment..."
	kubectl apply -f k8/deployment.yaml
	$(MAKE) wait-deployment
	$(MAKE) status
	@echo "✅ Redeploy complete with version: $(VERSION)"

# Development commands
dev:
	@echo "🔧 Starting development server..."
	yarn web

test:
	@echo "🧪 Running tests..."
	yarn test

test-headed:
	@echo "🧪 Running tests with browser..."
	yarn test:headed

# Help
help:
	@echo "Available commands:"
	@echo "  make deploy        - Complete build and deployment with auto-versioning"
	@echo "  make redeploy      - Quick redeploy after code changes (auto-versioning)"
	@echo "  make show-version  - Display current auto-generated version"
	@echo "  make status        - Check deployment status"
	@echo "  make logs          - View application logs"
	@echo "  make scale         - Scale the deployment"
	@echo "  make delete        - Delete the deployment"
	@echo "  make dev           - Start development server"
	@echo "  make test          - Run tests"
	@echo ""
	@echo "Version format: v1.0.{git-hash}-{timestamp}"
	@echo "Current version: $(VERSION)"

.PHONY: build-web build-docker push-docker update-deployment-version deploy-k8s wait-deployment status logs scale delete deploy-all deploy redeploy show-version dev test test-headed help