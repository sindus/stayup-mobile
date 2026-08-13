module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV)

  // En test, on n'active pas le transform JSX de nativewind : son runtime natif
  // (react-native-css-interop) a besoin de modules natifs indisponibles sous Jest.
  // `className` est alors une simple prop inerte, ce qui n'affecte pas les assertions.
  const isTest = api.env("test")

  return {
    presets: isTest
      ? ["babel-preset-expo"]
      : [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./src",
          },
        },
      ],
    ],
  }
}
