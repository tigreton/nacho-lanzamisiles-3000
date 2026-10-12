// ESLint plano, sin dependencias de runtime para el juego.
// Uso: npm run lint   (o npx eslint src/)
export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        performance: "readonly",
        matchMedia: "readonly",
        requestAnimationFrame: "readonly",
        localStorage: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        navigator: "readonly",
        screen: "readonly",
        Image: "readonly",
        AudioContext: "readonly",
        webkitAudioContext: "readonly",
        KeyboardEvent: "readonly",
        Event: "readonly",
        Set: "readonly",
        Promise: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none" }],
      "no-redeclare": "error",
      "eqeqeq": ["warn", "smart"],
      "no-var": "warn",
    },
  },
];
