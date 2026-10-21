// In-memory mock for AsyncStorage
const storage = {};

const mockAsyncStorage = {
    setItem: jest.fn((key, value) => {
        storage[key] = value;
        return Promise.resolve(null);
    }),
    getItem: jest.fn((key) => {
        return Promise.resolve(storage[key] || null);
    }),
    removeItem: jest.fn((key) => {
        delete storage[key];
        return Promise.resolve(null);
    }),
    clear: jest.fn(() => {
        Object.keys(storage).forEach((k) => delete storage[k]);
        return Promise.resolve(null);
    }),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
    addEventListener: jest.fn(() => jest.fn()),
}));

// Mock Expo Location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    getCurrentPositionAsync: jest.fn(() =>
        Promise.resolve({ coords: { latitude: 6.9271, longitude: 79.8612 } })
    ),
    Accuracy: { High: 4 },
}));

// Mock Expo ImagePicker
jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
}));

// Mock Expo Constants
jest.mock('expo-constants', () => ({
    expoConfig: { hostUri: '192.168.1.15:8081' },
    manifest: { debuggerHost: '192.168.1.15:8081' },
}));

// Global fetch mock helper
global.fetch = jest.fn();
