import type { MantineThemeOverride, virtualColor } from '@mantine/core';

const theme: MantineThemeOverride = {
  primaryColor: 'green',
  primaryShade: {
    light: 6,
    dark: 8
  },
  white: '#fff',
  black: '#000',
  defaultGradient: {
    from: 'blue',
    to: 'cyan',
    deg: 45
  },
  fontFamily: 'Roboto',
  fontFamilyMonospace: 'Roboto Mono',
  headings: {
    fontFamily: 'Roboto',
    fontWeight: '700',
    sizes: {
      h1: {
        fontSize: '2.125rem',
        lineHeight: '1.3',
        fontWeight: '700'
      },
      h2: {
        fontSize: '1.625rem',
        lineHeight: '1.35',
        fontWeight: '700'
      },
      h3: {
        fontSize: '1.375rem',
        lineHeight: '1.4',
        fontWeight: '700'
      },
      h4: {
        fontSize: '1.125rem',
        lineHeight: '1.45',
        fontWeight: '700'
      },
      h5: {
        fontSize: '1rem',
        lineHeight: '1.5',
        fontWeight: '700'
      },
      h6: {
        fontSize: '0.875rem',
        lineHeight: '1.5',
        fontWeight: '700'
      }
    }
  },
  scale: 1,
  radius: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '2rem'
  },
  spacing: {
    xs: '0.625rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '2rem'
  },
  defaultRadius: 'md',
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em'
  },
  fontSmoothing: true,
  respectReducedMotion: false,
  focusRing: 'auto',
  cursorType: 'default'
};

export default theme;