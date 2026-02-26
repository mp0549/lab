module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        'roblox-bright': {
          'primary': '#ff3b30',
          'secondary': '#00bfff',
          'accent': '#ffd166',
          'neutral': '#0f172a',
          'base-100': '#ffffff',
          'info': '#60a5fa',
          'success': '#34d399',
          'warning': '#f59e0b',
          'error': '#ef4444'
        }
      },
      'cupcake'
    ]
  }
};
