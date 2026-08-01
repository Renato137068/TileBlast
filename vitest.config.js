import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 20000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Módulos tb-*.js na raiz. Cobertura v8 inclui scripts carregados via
      // tests/helpers/load-module.js (filename file:// absoluto — ver helper).
      include: ['tb-*.js'],
      exclude: ['www/**', 'tests/**', 'scripts/**', 'android/**', 'functions/**', 'coverage/**'],
      // Floor com ~3pp de folga sobre o valor atual: pega regressão real sem
      // quebrar por ruído. Suba junto com a cobertura (~66% lines / ~61% funcs).
      thresholds: {
        lines: 62,
        statements: 62,
        functions: 57,
        branches: 60,
      },
    },
  },
});
