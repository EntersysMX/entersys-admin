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
        // SCRAM Brand Colors
        primary: {
          50: '#e8f9ef',
          100: '#cdf1d8',
          200: '#a6f5be',
          300: '#7aeea4',
          400: '#5de88f',
          500: '#44ce6f', // Main SCRAM Green
          600: '#3bb862',
          700: '#319f53',
          800: '#288644',
          900: '#1d5f2e',
          950: '#0f3018',
        },
        secondary: {
          50: '#e6f0f7',
          100: '#c1d9e9',
          200: '#98c0db',
          300: '#6fa7cd',
          400: '#5194c2',
          500: '#3381b7',
          600: '#2e73a6',
          700: '#266290',
          800: '#1f517a',
          900: '#0e314c', // Main SCRAM Blue
          950: '#071927',
        },
        accent: {
          50: '#fff8e6',
          100: '#ffedc1',
          200: '#ffe198',
          300: '#ffd56f',
          400: '#ffcc51',
          500: '#ffc233',
          600: '#ffbb00', // SCRAM Yellow
          700: '#ffa200', // SCRAM Orange
          800: '#e68900',
          900: '#cc7700',
          950: '#995a00',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
