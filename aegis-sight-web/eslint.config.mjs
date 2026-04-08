// ESLint flat config (ESLint 9+)
// Replaces .eslintrc.json for Next.js 16 + ESLint 9 compatibility
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  {
    // Exclude generated files from linting
    ignores: ['coverage/**'],
  },
  {
    rules: {
      'react-hooks/immutability': 'error',
      'react-hooks/set-state-in-effect': 'error',
    },
  },
];

export default config;
