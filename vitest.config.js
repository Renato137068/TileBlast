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
      // níveis de data/ e JOGA uma partida (clica a grade, resolve win/loss) —
      // cobrindo tb-main, tb-start, tb-gameplay, tb-board e tb-grid.
      // Atual: ~81% lines / 66% funcs / 70% branches.
      thresholds: {
        lines: 77,
        statements: 77,
        functions: 62,
        branches: 66,
      },
    },
  },
});
