# Putty Putting Coach - Kubernetes Deployment

This directory contains all the Kubernetes manifests and deployment scripts for the Putty Putting Coach application.

## 🚀 Quick Deployment

Run the complete deployment with:

```bash
cd k8
./setup.sh
```

## 📂 Files Overview

- **`namespace.yaml`** - Creates the `putty` namespace
- **`deployment.yaml`** - Main application deployment with 2 replicas
- **`service.yaml`** - ClusterIP service exposing port 80
- **`ingress.yaml`** - Ingress with SSL for `putty.scalebase.io`
- **`hpa.yaml`** - Horizontal Pod Autoscaler (2-6 replicas)
- **`kustomization.yaml`** - Kustomize configuration
- **`setup.sh`** - Complete build and deployment script

## 🛠️ Manual Steps

### 1. Build and Push Docker Image

```bash
# Build Expo web app
yarn build:web

# Build Docker image
docker build -t registry.digitalocean.com/resourceloop/putty-frontend:v1.0.0 .

# Push to registry
docker push registry.digitalocean.com/resourceloop/putty-frontend:v1.0.0
```

### 2. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8/

# Check deployment status
kubectl rollout status deployment/putty-app -n putty

# Check pods
kubectl get pods -n putty

# Check ingress
kubectl get ingress -n putty
```

## 🌐 Access

Once deployed, the app will be available at:
**https://putty.scalebase.io**

## 📊 Monitoring

```bash
# Check pod status
kubectl get pods -n putty

# View logs
kubectl logs -f deployment/putty-app -n putty

# Scale manually
kubectl scale deployment/putty-app --replicas=3 -n putty
```

## 🔧 Configuration

- **Namespace**: `putty`
- **Image Registry**: `registry.digitalocean.com/resourceloop`
- **Domain**: `putty.scalebase.io`
- **Replicas**: 2-6 (auto-scaling)
- **Resources**: 256Mi-512Mi memory, 200m-400m CPU

## 🔒 SSL Certificate

The ingress is configured with cert-manager for automatic SSL certificate generation using Let's Encrypt.