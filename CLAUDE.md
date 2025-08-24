# Putty - Professional Putting Coach App

## Project Overview
Putty is a React Native mobile application built with Expo that serves as a comprehensive putting coach for golfers. The app helps users improve their putting by providing precise calculations, 3D visualizations, and green reading assistance.

## Technical Stack
- **Framework**: React Native with Expo (latest)
- **Language**: TypeScript
- **3D Graphics**: Three.js with React Three Fiber for 3D visualizations
- **State Management**: Zustand or Context API
- **UI Components**: React Native Elements / NativeWind (TailwindCSS)
- **Data Storage**: AsyncStorage for local data, potential Firebase for cloud sync
- **Green Maps**: GeoJSON format for course data

## Core Features

### 1. Putt Input System
- Distance input (feet/yards/paces with custom pace configuration)
- Grade/slope percentage input (uphill/downhill)
- Break percentage and direction
- Green speed (Stimpmeter reading)
- Putting style selection (straight back, arc, etc.)

### 2. 3D Visualization Engine
- Real-time 3D preview of the putt path
- Visual representation of break and slope
- Ball trajectory animation
- Aim point indicator
- Green speed visualization

### 3. Green Map System
- Pre-configured professional course greens
- 2D overhead view for ball placement
- Automatic break/slope calculation from position
- Hole location indicators
- Heat map overlay for green speeds

### 4. Calculation Engine
- Physics-based putt calculations
- Factors: distance, slope, break, green speed, grain
- Recommended aim point
- Suggested putt strength
- Success probability estimation

## Development Commands

**Package Manager**: This project uses Yarn for dependency management.

```bash
# Install dependencies
yarn install

# Start development server
yarn expo start

# Run on iOS simulator
yarn expo run:ios

# Run on Android emulator
yarn expo run:android

# Build for production
eas build --platform all

# Testing Commands
yarn test              # Run all Playwright tests across browsers
yarn test:watch        # Run tests with interactive UI
yarn test:debug        # Run tests in debug mode
yarn test:headed       # Run tests in headed browser mode
yarn test:mobile       # Run tests on mobile viewports only
yarn test:report       # View detailed HTML test report

# Code Quality Commands
yarn lint              # Lint code
yarn lint:fix          # Fix linting issues automatically
yarn typecheck         # TypeScript type checking
yarn format            # Format code with Prettier
yarn format:check      # Check code formatting
yarn ci                # Run all CI checks (typecheck, lint, test, format)
```

## Project Structure
```
putty-app/
├── src/                       # Source code
│   ├── components/           # Reusable components
│   │   ├── PuttInput/       # Input controls
│   │   ├── Visualization/   # 3D rendering components
│   │   ├── GreenMap/        # Green map components
│   │   └── Common/          # Shared UI components
│   ├── screens/             # Screen components
│   ├── services/            # Business logic
│   │   ├── calculations/    # Physics calculations
│   │   └── greenData/       # Green map data management
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── constants/           # App constants
│   ├── types/               # TypeScript type definitions
│   ├── store/               # State management (Zustand)
│   └── test-utils/          # Testing utilities and setup
├── __tests__/               # Unit and integration tests
├── e2e/                     # End-to-end tests
├── assets/                  # Images, fonts, 3D models
├── jest.config.js           # Jest configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
└── .detoxrc.js             # Detox E2E test configuration
```

## Key Technical Considerations

### Performance
- Optimize 3D rendering for mobile devices
- Implement lazy loading for green maps
- Cache calculations for repeated putts
- Use React.memo for expensive components

### User Experience
- Intuitive gesture controls for 3D view
- Quick input methods (sliders, steppers)
- Save favorite putt scenarios
- Offline functionality for core features

### Data Management
- Store user preferences locally
- Cache green map data
- Optional cloud sync for settings
- Export/import putt history

## Testing Strategy

### Testing Framework Setup
- **End-to-End Testing**: Playwright for comprehensive browser testing
- **Multi-Browser Support**: Chrome, Firefox, Safari (desktop + mobile)
- **Real User Interactions**: Full DOM testing through web builds
- **Linting**: ESLint with TypeScript, React, and React Native rules
- **Formatting**: Prettier with consistent code style

### Test Types and Coverage
- **End-to-End Tests** (`tests/`)
  - Full application testing through web browser
  - User interaction simulation
  - Cross-browser compatibility (Chrome, Firefox, Safari)
  - Mobile viewport testing (iOS Safari, Android Chrome)
  - JavaScript error detection
  - Performance validation
- **Business Logic Testing**
  - Putt calculation algorithms
  - Physics simulations
  - Data validation
- **UI/UX Testing**
  - Component rendering verification
  - Responsive design validation
  - 3D visualization functionality
  - Gesture interaction testing

### Test Coverage Targets
- **Minimum Coverage**: 80% overall
- **Critical Paths**: 95% (calculations, core features)
- **Components**: 85% (UI components)
- **Services**: 90% (business logic)

### Test Data Management
- Mock data generators in `src/test-utils/`
- Fixtures for green maps and course data
- Test utilities for Three.js and gesture mocking
- Snapshot testing for UI consistency

### CI/CD Integration
```bash
yarn ci  # Runs full test suite for continuous integration
```
- TypeScript compilation check
- ESLint code quality check
- Jest unit tests with coverage
- Prettier code formatting check
- Automated E2E tests on pull requests

## Future Enhancements
- AR mode for real-world overlay
- Weather conditions integration
- Putt tracking and statistics
- Social features (share putts, leaderboards)
- AI-powered putting tips
- Video analysis integration