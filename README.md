# Putty - 3D Golf Putting Simulator

[![Live Demo](https://img.shields.io/badge/demo-putty.scalebase.io-blue)](https://putty.scalebase.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-1B1F23?logo=expo&logoColor=white)](https://expo.dev/)

A professional-grade 3D golf putting simulator built with React Native and Expo. Putty helps golfers improve their putting skills through physics-based calculations, interactive 3D visualizations, and comprehensive green reading assistance.

**🎮 [Try the Live Demo](https://putty.scalebase.io)**

## ✨ Features

### 🎯 3D Putting Simulation
- Real-time physics-based ball trajectory calculations
- Interactive 3D green visualization with Three.js
- Animated putt path preview with break and slope analysis
- Professional-grade putting mechanics simulation

### 📐 Comprehensive Input System
- Distance measurement (feet/yards/paces with custom configurations)
- Grade/slope percentage input (uphill/downhill)
- Break percentage and direction analysis
- Green speed (Stimpmeter reading) integration
- Multiple putting style support (straight back, arc, etc.)

### 🗺️ Advanced Green Mapping
- Pre-configured professional course greens in GeoJSON format
- 2D overhead view with precise ball placement
- Automatic break/slope calculation from position
- Dynamic hole location indicators
- Heat map overlays for green speed visualization

### 🧮 Physics Engine
- Advanced putt calculation algorithms considering:
  - Distance, slope, and break
  - Green speed and grain effects
  - Environmental factors
- Recommended aim point calculation
- Suggested putt strength analysis
- Success probability estimation

## 🏗️ Architecture & Technology Stack

### Core Technologies
- **Framework**: React Native with Expo (v53+)
- **Language**: TypeScript for type safety
- **3D Graphics**: Three.js with React Three Fiber
- **Physics**: Custom physics engine with Cannon.js integration
- **State Management**: Zustand for lightweight, scalable state
- **UI Components**: React Native with custom design system

### Cross-Platform Support
- **📱 Mobile**: Native iOS and Android apps via Expo
- **💻 Web**: Progressive Web App with full feature parity
- **🖥️ Desktop**: Desktop apps through Expo's platform support
- **☁️ Cloud**: Containerized deployment with Docker and Kubernetes

### 3D Rendering Pipeline
```
React Three Fiber → Three.js → WebGL
     ↓
Custom Shaders → Physics Engine → Visual Output
     ↓
Cross-platform rendering optimization
```

### State Architecture
```
Zustand Store
├── Putt Configuration (distance, break, slope)
├── 3D Scene State (camera, lighting, models)
├── Green Data (maps, hole positions, speeds)
└── User Preferences (units, putting style)
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Yarn
- Expo CLI (`npm install -g @expo/cli`)
- For mobile development: iOS Simulator or Android Emulator

### Installation
```bash
git clone https://github.com/yourusername/putty.git
cd putty/putty-app
yarn install
```

### Development
```bash
# Start development server
yarn start

# Run on specific platforms
yarn ios          # iOS Simulator
yarn android      # Android Emulator
yarn web          # Web browser
```

### Testing
```bash
yarn test         # Run Playwright E2E tests
yarn test:watch   # Interactive test UI
yarn lint         # Code linting
yarn typecheck    # TypeScript validation
yarn ci           # Full CI pipeline
```

## 🏛️ Project Structure

```
putty-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Visualization/   # 3D rendering components
│   │   ├── Dashboard/       # Main dashboard UI
│   │   ├── Background/      # 3D scene backgrounds
│   │   └── Layout/          # App layout components
│   ├── services/           # Business logic layer
│   │   └── calculations/   # Physics and math engines
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript definitions
│   ├── constants/          # App configuration
│   └── utils/              # Helper functions
├── tests/                  # E2E test suites
├── assets/                 # Images, 3D models, fonts
├── k8/                     # Kubernetes deployment
└── web/                    # Web-specific assets
```

## 🧪 Testing Strategy

### Multi-Platform Testing
- **End-to-End**: Playwright testing across Chrome, Firefox, Safari
- **Mobile Testing**: iOS Safari and Android Chrome simulation
- **Unit Tests**: Jest with React Native Testing Library
- **3D Rendering**: Custom Three.js testing utilities

### Quality Assurance
- **Code Coverage**: 80%+ overall, 95%+ for critical paths
- **Performance**: 60fps 3D rendering on mobile devices
- **Cross-browser**: Full compatibility testing
- **Accessibility**: WCAG 2.1 AA compliance

## 🐳 Deployment

### Docker
```bash
# Build container
docker build -t putty-app .

# Run locally
docker run -p 3000:3000 putty-app
```

### Kubernetes
```bash
cd k8
kubectl apply -f .
```

### Production Build
```bash
yarn build:web    # Web production build
eas build --platform all  # Mobile app builds
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the full test suite: `yarn ci`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- Built with [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/)
- 3D graphics powered by [Three.js](https://threejs.org/) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- Physics calculations inspired by professional putting research
- Course data formats based on industry-standard GeoJSON

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/yourusername/putty/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/putty/discussions)
- 📧 **Email**: support@scalebase.io

---

**🎯 Improve your putting game with precision, science, and beautiful 3D visualization.**