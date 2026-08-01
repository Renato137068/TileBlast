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
      // + testes de unidade de offers/shop/music (economia/áudio).
      // Atual: ~84,6% lines / 70,5% funcs / 71% branches.
      thresholds: {
        lines: 82,
        statements: 82,
        functions: 68,
        branches: 69,
      },
    },
  },
});
