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
    // TODO(#289): Re-enable react-hooks/immutability and react-hooks/set-state-in-effect
    // after migrating to React 19 / React Compiler.
    // These rules are new in eslint-plugin-react-hooks@5 and have false positives
    // on valid React 18 patterns (e.g. calling setState inside useEffect for initial load,
    // and let accumulator variables inside useMemo callbacks).
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;
