/** @type {import('tailwindcss').Config} */
// Palette synchronisée avec src/theme/tokens.ts.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#0a0a0c',
          surface: '#151519',
          elevated: '#1f1f25',
        },
        content: {
          primary: '#fafafa',
          secondary: '#a1a1aa',
          muted: '#71717a',
          placeholder: '#52525b',
          'on-accent': '#0a0a0c',
        },
        accent: {
          DEFAULT: '#a3e635',
          hover: '#84cc16',
        },
        status: {
          success: '#4ade80',
          warning: '#fbbf24',
          danger: '#f87171',
          info: '#38bdf8',
        },
        ai: {
          DEFAULT: '#a78bfa',
        },
        border: {
          DEFAULT: '#232329',
          strong: '#3a3a42',
        },
      },
      fontSize: {
        'display': ['34px', { lineHeight: '40px', fontWeight: '800', letterSpacing: '-0.5px' }],
        'logger': ['28px', { lineHeight: '34px', fontWeight: '700', letterSpacing: '-0.3px' }],
        'heading': ['20px', { lineHeight: '26px', fontWeight: '700', letterSpacing: '-0.2px' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'caption': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },
      spacing: {
        'tap': '44px',
        '18': '72px',
        '22': '88px',
      },
      borderRadius: {
        'card': '20px',
        'button': '999px',
        'chip': '999px',
        'field': '14px',
      },
    },
  },
  plugins: [],
};
