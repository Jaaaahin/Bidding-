import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#040814',
          900: '#070E22',
          800: '#0D1736',
          700: '#15234E',
          600: '#1E316B',
        },
        electric: {
          400: '#33FF9F',
          500: '#00FF87',
          600: '#00CC6C',
        },
      },
      boxShadow: {
        'electric-glow': '0 0 25px -4px rgba(0, 255, 135, 0.35)',
        'electric-sm': '0 0 12px -2px rgba(0, 255, 135, 0.25)',
        'card-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
      },
      backgroundImage: {
        'pitch-grid':
          'radial-gradient(circle at 50% 0%, rgba(0, 255, 135, 0.12), transparent 60%), linear-gradient(to bottom, rgba(7, 14, 34, 0.95), rgba(4, 8, 20, 1))',
      },
    },
  },
  plugins: [],
};

export default config;
