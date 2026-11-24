/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Centralized Light Business SaaS Tokens (Option 3)
        nivo: {
          bg: '#F4F6F9',
          card: '#FFFFFF',
          border: '#E2E8F0',
          borderSubtle: '#CBD5E1',
          ink: '#0F172A',
          inkLight: '#1E293B',
          muted: '#64748B',
          indigo: '#4338CA',
          indigoHover: '#3730A3',
          teal: '#0D9488',
          tealHover: '#0F766E',
          amber: '#D97706',
          rose: '#E11D48',
        },
        // Backward-compatibility references
        brand: {
          dark: '#070A11',
          slate: '#0B1120',
          card: '#0F172A',
          border: '#1E293B',
          muted: '#64748B',
          emerald: '#10B981',
          cyan: '#06B6D4',
          accent: '#00F5A0',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'nivo-sm': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'nivo-card': '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)',
        'nivo-dropdown': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
        'nivo-indigo': '0 0 20px -3px rgba(67, 56, 202, 0.25)',
        'nivo-teal': '0 0 20px -3px rgba(13, 148, 136, 0.25)',
      },
    },
  },
  plugins: [],
};
