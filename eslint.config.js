import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // This mock-data skeleton uses the standard "fetch on mount" effect
      // pattern (load data via the repo, setState with the result) in each
      // tab. eslint-plugin-react-hooks v6+ flags any setState reachable
      // from an effect body as a potential cascading-render risk, which
      // includes this universally-used pattern. Revisit if/when data
      // fetching moves to a dedicated library (e.g. TanStack Query).
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
