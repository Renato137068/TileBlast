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
      // quebrar por ruído. Suba junto com a cobertura (~67% lines / ~63% funcs).
      // Meta escalonada: 75% linhas — maiores alavancas ainda descobertas são
      // tb-main.js (0%, boot), tb-board.js e tb-gameplay.js.
      thresholds: {
        lines: 64,
        statements: 64,
        functions: 60,
        branches: 60,
      },
    },
  },
});
