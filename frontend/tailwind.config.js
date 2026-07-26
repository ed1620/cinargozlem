/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Logo esas alınarak: baskın turuncu (primary) + adaçayı yeşili (secondary)
        brand: {
          DEFAULT: '#F39C12', // turuncu (el/spiral)
          dark: '#D9820B',
          light: '#FEF3E2',
        },
        sage: {
          DEFAULT: '#5E8B80', // alt başlık yeşili (secondary)
          dark: '#456B62',
          light: '#E7EFED',
        },
        ink: {
          DEFAULT: '#2F343A', // koyu yüzeyler (sidebar) — logo metni tonunda nötr
          light: '#3A4046',
        },
        // Logo parmak renkleri — rozet/kategori vurguları için
        accent: {
          green: '#5BA83E',
          pink: '#E5197F',
          red: '#D0342C',
          yellow: '#F5C842',
          blue: '#2E6DB4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
