/** @type {import('tailwindcss').Config} */
import theme from './theme.json';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: theme.colors.primary,
        'primary-muted': theme.colors.primaryMuted,
        accent: theme.colors.accent,
        secondary: theme.colors.secondary,
        muted: theme.colors.muted,
        border: theme.colors.border,
        card: theme.colors.card,
        'card-hover': theme.colors.cardHover,
        text: theme.colors.text,
        background: theme.colors.background,
        surface: theme.colors.surface,
        success: theme.colors.success,
        warning: theme.colors.warning,
        error: theme.colors.error,
        info: theme.colors.info,
      },
      borderRadius: theme.radius,
      boxShadow: theme.shadows,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.fontSize,
      spacing: theme.spacing,
    },
  },
  plugins: [],
};