// Le projet "node" ne sait pas parser le JSX : chaque projet ne collecte donc
// la couverture que sur les fichiers qu'il est capable de transformer.
const nodeProject = {
  displayName: "node",
  testEnvironment: "node",
  testMatch: ["**/tests/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { paths: { "@/*": ["./src/*"] } } }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^react-native$": "<rootDir>/__mocks__/react-native-stub.js",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store-stub.js",
    "^@react-native-async-storage/async-storage$": "<rootDir>/__mocks__/async-storage-stub.js",
  },
  collectCoverageFrom: ["src/lib/**/*.ts", "src/store/**/*.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/tests/"],
}

const componentsProject = {
  displayName: "components",
  preset: "jest-expo",
  testMatch: ["**/tests/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store-stub.js",
    "^@react-native-async-storage/async-storage$": "<rootDir>/__mocks__/async-storage-stub.js",
    "\\.css$": "<rootDir>/__mocks__/style-stub.js",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|lucide-react-native)",
  ],
  collectCoverageFrom: ["src/**/*.tsx", "src/hooks/**/*.ts", "app/**/*.tsx"],
  // src/lib et src/store appartiennent au projet "node" : les instrumenter ici aussi
  // produirait deux rapports concurrents pour un même fichier (ts-jest vs babel).
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/tests/",
    "<rootDir>/src/lib/",
    "<rootDir>/src/store/",
  ],
}

module.exports = {
  projects: [nodeProject, componentsProject],
  coverageReporters: ["text-summary", "lcov"],
  coverageThreshold: {
    global: {
      statements: 99,
      branches: 95,
      functions: 100,
      lines: 99,
    },
  },
}
