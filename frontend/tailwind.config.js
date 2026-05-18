/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1C1C2E', // Charcoal
          mid: '#3D3D5C',     // Slate
          tint: '#EDEDF5',    // Pale
        },
        accent: {
          DEFAULT: '#3B82F6', // Sky Blue
          light: '#DBEAFE',   // Light Blue
        },
        surface: {
          DEFAULT: '#FFFFFF', // Pure white
          bg: '#F9F9FB',      // Off-white
          border: '#E4E4EF',  // Subtle border
        },
        ink: {
          primary: '#0F0F1A',
          secondary: '#5A5A7A',
        },
        status: {
          success: '#16A34A',
          'success-light': '#DCFCE7',
          warning: '#D97706',
          'warning-light': '#FEF3C7',
          danger: '#DC2626',
          'danger-light': '#FEE2E2',
        }
      },
      fontFamily: {
        display: ['"Noto Sans"', 'sans-serif'],
        heading: ['"Noto Sans"', 'sans-serif'],
        sans: ['"Noto Sans"', 'sans-serif'],
        body: ['"Noto Sans"', 'sans-serif'],
        mono: ['"Roboto Mono"', 'monospace'],
      },
      animation: {
        "shimmer": "shimmer 1.5s infinite",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
