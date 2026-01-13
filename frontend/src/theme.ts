import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Primary brand color: #0C70F2
const primaryColor: MantineColorsTuple = [
  '#e6f2ff',
  '#bae0ff',
  '#8dcdff',
  '#60bbff',
  '#33a8ff',
  '#0C70F2', // Main brand color
  '#0a5dc2',
  '#084a92',
  '#063762',
  '#042432',
];

// macOS-inspired dark mode colors
const darkColors = {
  // Backgrounds (progressive elevation)
  bg: {
    primary: '#1a1d2e',     // Base background
    secondary: '#22263a',   // Secondary surfaces
    elevated: '#2a2e44',    // Cards, elevated surfaces
    modal: '#2d3148',       // Modals, highest elevation
  },
  // Text colors (high contrast for accessibility)
  text: {
    primary: '#f8f9fa',     // High contrast (15:1+)
    secondary: '#adb5bd',   // Medium contrast
    muted: '#6c757d',       // Low contrast (hints)
  },
  // Borders (subtle)
  border: {
    default: 'rgba(255, 255, 255, 0.1)',
    strong: 'rgba(255, 255, 255, 0.15)',
  },
};

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: primaryColor,
  },

  // macOS-quality dark mode
  black: darkColors.bg.primary,

  // Font stack (system fonts for native feel)
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace',

  // Spacing and sizing
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },

  // Shadows (subtle, macOS-like)
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.1)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    md: '0 2px 8px rgba(0, 0, 0, 0.3)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.4)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.5)',
  },

  // Component-specific overrides
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: 'all 150ms ease',
        },
      },
    },

    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },

    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },

    Select: {
      defaultProps: {
        radius: 'md',
      },
    },

    Modal: {
      defaultProps: {
        radius: 'lg',
        overlayProps: {
          opacity: 0.5,
          blur: 4,
        },
      },
    },

    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },

    Tabs: {
      styles: {
        tab: {
          fontWeight: 500,
          transition: 'all 150ms ease',
        },
      },
    },
  },

  // Dark theme overrides
  other: {
    darkColors,
  },
});

// CSS-in-JS for custom dark mode backgrounds
export const darkModeStyles = {
  body: {
    backgroundColor: darkColors.bg.primary,
    color: darkColors.text.primary,
  },

  card: {
    backgroundColor: darkColors.bg.elevated,
    border: `1px solid ${darkColors.border.default}`,
  },

  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  selected: {
    backgroundColor: '#0C70F2',
    color: '#ffffff',
  },
};
