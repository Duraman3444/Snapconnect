# SnapConnect - Project Structure Documentation

This document provides a comprehensive overview of the SnapConnect project structure, file organization, and directory layout.

## 📁 Root Directory Structure

```
Snapconnect/
├── README.md                              # Main project documentation
├── PRODUCT_REQUIREMENTS_DOCUMENT.md      # Comprehensive PRD
├── PROJECT_STRUCTURE.md                  # This file - project structure docs
├── package.json                          # Root package configuration
├── package-lock.json                     # Root dependency lock file
├── .git/                                 # Git version control
├── node_modules/                         # Root dependencies (auto-generated)
└── SnapchatClone/                        # Main application directory
    ├── App.js                            # Main application entry point
    ├── app.json                          # Expo app configuration
    ├── babel.config.js                   # Babel transpiler configuration
    ├── firebaseConfig.js                 # Firebase services configuration
    ├── index.js                          # React Native entry point
    ├── package.json                      # App-specific dependencies
    ├── package-lock.json                 # App dependency lock file
    ├── README.md                         # App-specific documentation
    ├── tailwind.config.js                # Tailwind CSS configuration
    ├── assets/                           # Static assets directory
    │   ├── adaptive-icon.png             # Android adaptive icon
    │   ├── favicon.png                   # Web favicon
    │   ├── icon.png                      # App icon
    │   └── splash-icon.png               # Splash screen icon
    └── src/                              # Source code directory
        ├── components/                   # Reusable UI components
        ├── context/                      # React Context providers
        │   └── AuthContext.js            # Authentication context
        ├── hooks/                        # Custom React hooks
        ├── screens/                      # Application screens
        │   ├── CameraScreen.js           # Main camera interface
        │   ├── FriendsScreen.js          # Friend management
        │   ├── HomeScreen.js             # Home/chat feed
        │   ├── LoginScreen.js            # User authentication
        │   ├── SignupScreen.js           # User registration
        │   └── StoriesScreen.js          # Stories feed
        └── services/                     # External services integration
```

## 📄 File Descriptions

### Root Level Files

#### `README.md`
- **Purpose**: Main project documentation and setup instructions
- **Content**: Project overview, features, installation guide, technical stack
- **Audience**: Developers, contributors, and project stakeholders

#### `PRODUCT_REQUIREMENTS_DOCUMENT.md`
- **Purpose**: Comprehensive product requirements and specifications
- **Content**: Business objectives, user personas, technical requirements, roadmap
- **Audience**: Product managers, developers, designers, stakeholders

#### `PROJECT_STRUCTURE.md`
- **Purpose**: Project organization and file structure documentation
- **Content**: Directory layout, file purposes, architectural overview
- **Audience**: New developers, team members, maintainers

#### `package.json`
- **Purpose**: Root-level npm configuration
- **Content**: Workspace configuration, shared scripts, metadata
- **Management**: Automatically managed by npm/yarn

### Application Directory (`SnapchatClone/`)

#### Configuration Files

##### `App.js`
- **Purpose**: Main React Native application component
- **Responsibilities**: Navigation setup, authentication routing, app initialization
- **Dependencies**: React Navigation, AuthContext, screen components

##### `firebaseConfig.js`
- **Purpose**: Firebase services configuration and mock implementations
- **Services**: Authentication, Firestore, Storage
- **Mode**: Currently configured for mock/development mode

##### `app.json`
- **Purpose**: Expo application configuration
- **Settings**: App metadata, build settings, platform configurations

##### `babel.config.js`
- **Purpose**: JavaScript transpilation configuration
- **Presets**: Expo preset, plugin configurations

##### `tailwind.config.js`
- **Purpose**: Tailwind CSS styling configuration
- **Theme**: Custom colors, spacing, design tokens

#### Assets Directory (`assets/`)

| File | Purpose | Usage |
|------|---------|-------|
| `icon.png` | Primary app icon | App stores, device home screen |
| `adaptive-icon.png` | Android adaptive icon | Android launcher icon |
| `splash-icon.png` | Splash screen logo | App loading screen |
| `favicon.png` | Web favicon | Browser tab icon |

#### Source Code Directory (`src/`)

##### `context/AuthContext.js`
- **Purpose**: Global authentication state management
- **Features**: User login/logout, session persistence, auth state
- **Integration**: Firebase Authentication, user profile management

##### `screens/` Directory

| Screen | Purpose | Key Features |
|--------|---------|-------------|
| `CameraScreen.js` | Main camera interface | Photo capture, camera toggle, sharing |
| `LoginScreen.js` | User authentication | Email/password login, form validation |
| `SignupScreen.js` | User registration | Account creation, username setup |
| `HomeScreen.js` | Content feed | Message threads, recent activity |
| `FriendsScreen.js` | Social management | Friend search, add/remove friends |
| `StoriesScreen.js` | Story browsing | Friend stories, story interaction |

##### `components/` Directory
- **Purpose**: Reusable UI components
- **Status**: Currently empty, ready for component extraction
- **Future**: Button components, input fields, modals, etc.

##### `hooks/` Directory
- **Purpose**: Custom React hooks
- **Status**: Currently empty, ready for custom hook implementations
- **Future**: useCamera, useFriends, useStorage hooks

##### `services/` Directory
- **Purpose**: External service integrations
- **Status**: Currently empty, ready for service abstractions
- **Future**: API clients, utility functions, data transformers

## 🏗️ Architecture Overview

### Application Architecture
```
┌─────────────────┐
│   App.js        │  ← Entry point & navigation
└─────────────────┘
         │
┌─────────────────┐
│  AuthProvider   │  ← Global authentication state
└─────────────────┘
         │
┌─────────────────┐
│  Screen Layer   │  ← Individual app screens
└─────────────────┘
         │
┌─────────────────┐
│  Service Layer  │  ← Firebase & external services
└─────────────────┘
```

### Data Flow Architecture
```
User Action → Screen Component → Context/Hook → Service → Firebase → Database
                     ↑                                      ↓
              UI Update ← State Update ← Response ← API Call ← Cloud Function
```

### Navigation Structure
```
Authentication Stack:
├── LoginScreen
└── SignupScreen

Main Application Stack:
├── CameraScreen (Default)
├── HomeScreen
├── FriendsScreen
└── StoriesScreen
```

## 🔧 Development Guidelines

### File Naming Conventions
- **Screens**: PascalCase with "Screen" suffix (e.g., `CameraScreen.js`)
- **Components**: PascalCase (e.g., `CustomButton.js`)
- **Hooks**: camelCase with "use" prefix (e.g., `useCamera.js`)
- **Services**: camelCase (e.g., `authService.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.js`)

### Directory Organization Principles
1. **Feature-based**: Group related files by functionality
2. **Separation of Concerns**: Separate UI, logic, and data layers
3. **Reusability**: Extract common components and utilities
4. **Scalability**: Structure supports growth and new features

### Code Organization Standards
- **Single Responsibility**: Each file has one primary purpose
- **Import Organization**: External libraries → Internal modules → Relative imports
- **Export Consistency**: Use default exports for main components
- **Documentation**: JSDoc comments for complex functions

## 📦 Dependencies Overview

### Production Dependencies
- **React Native**: Core framework for mobile development
- **Expo**: Development platform and runtime
- **React Navigation**: Navigation and routing
- **Firebase**: Backend services (auth, database, storage)
- **NativeWind**: Tailwind CSS for React Native
- **AsyncStorage**: Local data persistence

### Development Dependencies
- **Babel**: JavaScript transpilation
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **Jest**: Unit testing framework

## 🚀 Build & Deployment Structure

### Development Environment
```
Local Development:
├── expo start          # Start development server
├── expo start --ios    # iOS simulator
├── expo start --android # Android emulator
└── expo start --web    # Web browser
```

### Build Outputs
```
Build Directory:
├── .expo/              # Expo build cache
├── dist/               # Web build output
├── android/            # Android build files
└── ios/                # iOS build files
```

## 📚 Documentation Structure

### Current Documentation
1. **README.md** - Project overview and setup
2. **PRODUCT_REQUIREMENTS_DOCUMENT.md** - Complete PRD
3. **PROJECT_STRUCTURE.md** - This documentation

### Future Documentation Needs
- API documentation for Firebase integration
- Component library documentation
- Testing strategy and guidelines
- Deployment and CI/CD documentation
- Contributing guidelines for open source

## 🔄 Maintenance & Updates

### Regular Maintenance Tasks
- **Dependency Updates**: Monthly security and feature updates
- **Documentation Sync**: Keep docs updated with code changes
- **Structure Review**: Quarterly architecture review
- **Cleanup**: Remove unused files and dependencies

### Scaling Considerations
- **Component Library**: Extract reusable components as project grows
- **State Management**: Consider Redux/Zustand for complex state
- **Testing Structure**: Add comprehensive test coverage
- **Performance Monitoring**: Implement analytics and crash reporting

---

**Last Updated:** December 2024  
**Maintained By:** Development Team  
**Review Schedule:** Quarterly or with major feature additions 