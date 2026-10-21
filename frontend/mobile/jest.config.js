module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['./jest.setup.js'],
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    moduleNameMapper: {
        '^react-native$': '<rootDir>/__mocks__/react-native.js',
    },
    coverageThreshold: {
        global: {
            statements: 80,
            branches: 75,
            functions: 80,
            lines: 80,
        },
    },
    collectCoverageFrom: [
        'src/services/**/*.js',
        'src/utils/**/*.js',
    ],
};
