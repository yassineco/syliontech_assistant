import theme from '../../theme.json';

/**
 * Charge le thème dynamiquement et applique les variables CSS
 */
export function loadTheme() {
  const root = document.documentElement;
  
  // Application des couleurs
  root.style.setProperty('--color-primary', theme.colors.primary.DEFAULT);
  root.style.setProperty('--color-primary-foreground', theme.colors.primary.foreground);
  root.style.setProperty('--color-primary-muted', theme.colors.primaryMuted);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-secondary', theme.colors.secondary.DEFAULT);
  root.style.setProperty('--color-muted', theme.colors.muted);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-card', theme.colors.card);
  root.style.setProperty('--color-card-hover', theme.colors.cardHover);
  root.style.setProperty('--color-text', theme.colors.text.DEFAULT);
  root.style.setProperty('--color-text-muted', theme.colors.text.muted);
  root.style.setProperty('--color-background', theme.colors.background);
  root.style.setProperty('--color-surface', theme.colors.surface);
  
  // Application des radius
  root.style.setProperty('--radius-sm', theme.radius.sm);
  root.style.setProperty('--radius-md', theme.radius.md);
  root.style.setProperty('--radius-lg', theme.radius.lg);
  root.style.setProperty('--radius-xl', theme.radius.xl);
  
  // Application des ombres
  root.style.setProperty('--shadow-sm', theme.shadows.sm);
  root.style.setProperty('--shadow-md', theme.shadows.md);
  root.style.setProperty('--shadow-lg', theme.shadows.lg);
}

/**
 * Met à jour une couleur spécifique du thème
 */
export function updateThemeColor(colorName: string, value: string) {
  const root = document.documentElement;
  root.style.setProperty(`--color-${colorName}`, value);
}

/**
 * Obtient la valeur d'une variable CSS du thème
 */
export function getThemeValue(property: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${property}`)
    .trim();
}

/**
 * Vérifie si le thème sombre est préféré par l'utilisateur
 */
export function prefersDarkMode(): boolean {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Classe utilitaire pour combiner les classes conditionnellement
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Exporte le thème pour utilisation dans les composants
 */
export const themeConfig = theme;