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
      // Floor com ~3pp de folga sobre o valor atual. O teste de boot completo
      // (tests/integration/boot-main.test.js) monta o app real, carrega os
      // níveis de data/ e JOGA fases: blasts reais, especiais (bomb/rocket/
      // rainbow), boosters e fases com obstáculos (gelo/coleta/caixa) — cobrindo
      // tb-main, tb-start, tb-gameplay (~87%), tb-board (~83%) e tb-grid.
      // Atual: ~84% lines / 69% funcs / 71% branches.
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 65,
        branches: 68,
      },
    },
  },
});
