/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Carbon color tokens
        'carbon-blue': {
          10: '#edf5ff',
          20: '#d0e2ff',
          30: '#a6c8ff',
          40: '#78a9ff',
          50: '#4589ff',
          60: '#0f62fe',
          70: '#0043ce',
          80: '#002d9c',
          90: '#001d6c',
          100: '#001141',
        },
        'carbon-gray': {
          10: '#f4f4f4',
          20: '#e0e0e0',
          30: '#c6c6c6',
          40: '#a8a8a8',
          50: '#8d8d8d',
          60: '#6f6f6f',
          70: '#525252',
          80: '#393939',
          90: '#262626',
          100: '#161616',
        },
        'carbon-red': {
          60: '#da1e28',
        },
        'carbon-green': {
          60: '#198038',
        },
        'carbon-yellow': {
          30: '#f1c21b',
        },
      },
      fontFamily: {
        'ibm-plex': ['IBM Plex Sans', 'sans-serif'],
        'ibm-plex-mono': ['IBM Plex Mono', 'monospace'],
      },
      spacing: {
        'carbon-xs': '4px',
        'carbon-sm': '8px',
        'carbon-md': '12px',
        'carbon-lg': '16px',
        'carbon-xl': '24px',
        'carbon-2xl': '32px',
        'carbon-3xl': '48px',
      },
    },
  },
  plugins: [],
  // Important: Carbon uses its own styles, so we need to be careful with conflicts
  corePlugins: {
    preflight: false,
  },
};
