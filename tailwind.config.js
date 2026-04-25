/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#080d1a',
          surface: '#0f1628',
          elevated: '#1a2440',
        },
        content: {
          primary: '#ffffff',
          secondary: '#a3a3a3',
          muted: '#525252',
          placeholder: '#6b7280',
          'on-accent': '#ffffff',
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
          DEFAULT: '#1e2d4a',
          strong: '#2d4170',
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
