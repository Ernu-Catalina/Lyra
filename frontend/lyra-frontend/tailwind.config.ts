/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Ring classes used in your global resets
    'ring-2',
    'ring-blue-500',
    'ring-offset-2',
    
    // Add any other classes you use in index.css or global styles
    // For example, if you have more @apply:
    // 'bg-gray-50', 'text-gray-800', etc.
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}