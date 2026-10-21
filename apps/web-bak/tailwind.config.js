/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488',
          light: '#CCFBF1',
          dark: '#0F766E',
        },
        ink: {
          900: '#0F172A',
          800: '#1E293B',
          600: '#475569',
          400: '#94A3B8',
          200: '#E2E8F0',
        },
        canvas: {
          DEFAULT: '#F1F5F9',
          card: '#FFFFFF',
        },
        cat: {
          flutter: '#0D9488',
          harmony: '#0284C7',
          golang: '#4F46E5',
          react: '#2563EB',
          rust: '#0891B2',
          // 「其他」分类：中性灰，不与各技术栈主色抢视觉
          other: '#64748B',
        },
        success: '#0D9488',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        card: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card-hover': '0 10px 25px -5px rgba(15, 23, 42, 0.10)',
      },
      maxWidth: { '8xl': '1440px' },
    },
  },
  plugins: [],
}
