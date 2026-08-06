import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export function config({ ignores = [] } = {}) {
  return tseslint.config(
    { ignores: ['dist/**', '.next/**', 'node_modules/**', ...ignores] },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    { rules: { '@typescript-eslint/no-explicit-any': 'error', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  );
}
