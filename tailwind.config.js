/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#000000',
          surface: '#111111',
          elevated: '#1a1a1a',
        },
        content: {
          primary: '#ffffff',
          secondary: '#a3a3a3',
          muted: '#525252',
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        status: {
          success: '#22c55e',
          warning: '#f97316',
          danger: '#ef4444',
        },
        border: {
          DEFAULT: '#262626',
          strong: '#404040',
        },
      },
      fontSize: {
        'display': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'logger': ['28px', { lineHeight: '36px', fontWeight: '600' }],
        'heading': ['20px', { lineHeight: '28px', fontWeight: '600' }],
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
        'card': '12px',
        'button': '8px',
        'chip': '999px',
      },
    },
  },
  plugins: [],
};
