import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	prettierConfig,
	{
		languageOptions: {
			parserOptions: {
				ecmaVersion: 2021,
				sourceType: 'module',
				project: true,
			},
		},
		rules: {
			// TypeScript specific rules
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/no-floating-promises': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			
			// General rules
			'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
			'no-debugger': 'warn',
		},
	},
	{
		files: ['**/*.js', '**/*.mjs'],
		...tseslint.configs.disableTypeChecked,
	},
	{
		ignores: [
			'node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/.wrangler/**',
			'**/worker-configuration.d.ts',
			'**/*.config.js',
		],
	}
);
