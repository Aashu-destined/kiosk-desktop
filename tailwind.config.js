/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: 'rgb(var(--bg-app) / <alpha-value>)',
        panel: 'rgb(var(--bg-panel) / <alpha-value>)',
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        border: 'rgb(var(--border-base) / <alpha-value>)',
        accent: 'rgb(var(--accent-primary) / <alpha-value>)',
        
        // Retaining specific palettes for specific needs, but encouraging semantic use
        celestial: {
          deep: '#0f172a', // Slate 900
          void: '#020617', // Slate 950
          panel: '#1e293b', // Slate 800
          border: 'rgba(255, 255, 255, 0.1)',
        },
        comet: {
          400: '#38bdf8', // Sky 400
          500: '#0ea5e9', // Sky 500
          glow: 'rgba(56, 189, 248, 0.5)',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          500: '#64748b',
          800: '#1e293b',
        }
      },
      boxShadow: {
        'island': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        'comet-glow': '0 0 15px rgba(56, 189, 248, 0.5)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1rem',
      },
      backgroundImage: {
        'celestial-gradient': 'radial-gradient(circle at top center, var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}