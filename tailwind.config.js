/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // CJK fallbacks appended so Chinese glyphs inside font-sans contexts
        // resolve to a harmonized grotesque instead of the OS default.
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial',
          '"PingFang SC"', '"HarmonyOS Sans SC"', '"MiSans"', '"HONOR Sans CN"', '"Source Han Sans SC"',
          '"Noto Sans CJK SC"', '"Microsoft YaHei UI"', '"Microsoft YaHei"', 'sans-serif'
        ],
        // CJK fallbacks for font-mono: digits/units keep the industrial mono,
        // Chinese labels (粉噪, 音频路由, 确认删除) fall back to the CJK sans
        // instead of a mismatched system serif/default face.
        mono: [
          'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace',
          '"PingFang SC"', '"HarmonyOS Sans SC"', '"MiSans"', '"Source Han Sans SC"',
          '"Noto Sans CJK SC"', '"Microsoft YaHei UI"', '"Microsoft YaHei"', 'sans-serif'
        ]
      },
      colors: {
        titanium: {
          950: '#0a0b0d',
          900: '#121418',
          800: '#1a1d24',
          700: '#262a34',
          600: '#3b4252',
        },
      },
    },
  },
  plugins: [],
};
