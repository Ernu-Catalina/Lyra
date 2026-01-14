// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},   // ← this is the correct v4 plugin
    autoprefixer: {},
  },
}