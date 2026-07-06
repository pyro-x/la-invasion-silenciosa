import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  // supabase/functions is Deno code with its own toolchain (deno check +
  // deno lint + deno test in CI); ESLint's browser/bundler assumptions
  // don't apply there.
  globalIgnores(['dist', 'node_modules', 'docs/prototype/fuentes', 'supabase/functions']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
])
