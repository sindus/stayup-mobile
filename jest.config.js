module.exports = {
  projects: [
    {
      displayName: "node",
      testEnvironment: "node",
      testMatch: ["**/tests/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { paths: { "@/*": ["./src/*"] } } }],
      },
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        "^react-native$": "<rootDir>/__mocks__/react-native.js",
        "^expo-secure-store$": "<rootDir>/__mocks__/expo-secure-store.js",
        "^@react-native-async-storage/async-storage$":
          "<rootDir>/__mocks__/async-storage.js",
      },
    },
  ],
}
