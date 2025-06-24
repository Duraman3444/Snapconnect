// Mock Firebase configuration for testing without real Firebase project
// This allows the app to run while you set up Firebase

let currentMockUser = null;
let authStateCallbacks = [];

const mockAuth = {
  get currentUser() {
    return currentMockUser;
  },
  onAuthStateChanged: (callback) => {
    // Store callback to trigger later
    authStateCallbacks.push(callback);
    // Call immediately with current state
    setTimeout(() => callback(currentMockUser), 100);
    return () => {
      // Remove callback when unsubscribing
      const index = authStateCallbacks.indexOf(callback);
      if (index > -1) {
        authStateCallbacks.splice(index, 1);
      }
    };
  },
  signInWithEmailAndPassword: async (email, password) => {
    // Mock login - always succeeds for demo
    const mockUser = { 
      uid: 'demo-user-' + Date.now(), 
      email: email,
      username: 'demo-user'
    };
    currentMockUser = mockUser;
    // Trigger auth state change
    authStateCallbacks.forEach(callback => callback(mockUser));
    return { user: mockUser };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    // Mock signup - always succeeds for demo
    const mockUser = { 
      uid: 'demo-user-' + Date.now(), 
      email: email 
    };
    currentMockUser = mockUser;
    // Trigger auth state change
    authStateCallbacks.forEach(callback => callback(mockUser));
    return { user: mockUser };
  },
  signOut: async () => {
    // Mock signout
    currentMockUser = null;
    authStateCallbacks.forEach(callback => callback(null));
    return Promise.resolve();
  }
};

const mockDb = {
  collection: (collectionName) => ({
    doc: (docId) => ({
      set: async (data) => {
        console.log(`Mock: Setting document in ${collectionName}/${docId}:`, data);
        return Promise.resolve();
      },
      get: async () => ({
        exists: false,
        data: () => null
      }),
      update: async (data) => {
        console.log(`Mock: Updating document in ${collectionName}/${docId}:`, data);
        return Promise.resolve();
      }
    }),
    add: async (data) => {
      console.log(`Mock: Adding document to ${collectionName}:`, data);
      return Promise.resolve({ id: 'mock-doc-id' });
    },
    where: () => ({
      orderBy: () => ({
        onSnapshot: (callback) => {
          // Mock empty results
          callback({ forEach: () => {} });
          return () => {}; // unsubscribe
        },
        get: async () => ({
          forEach: () => {}
        })
      }),
      get: async () => ({
        forEach: () => {}
      })
    })
  })
};

const mockStorage = {
  ref: (path) => ({
    put: async (blob) => {
      console.log(`Mock: Uploading to ${path}`);
      return Promise.resolve();
    },
    getDownloadURL: async () => {
      return Promise.resolve('https://via.placeholder.com/300x400.png?text=Mock+Photo');
    }
  })
};

// Export mock services
export const auth = mockAuth;
export const db = mockDb;
export const storage = mockStorage;

console.log('🔥 Using MOCK Firebase - Set up real Firebase project for full functionality');

export default { auth: mockAuth, firestore: () => mockDb, storage: () => mockStorage }; 