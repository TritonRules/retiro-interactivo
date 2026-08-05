import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.astro/**'],
  },
  ...eslintPluginAstro.configs['flat/recommended'],
];
