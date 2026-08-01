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
      // quebrar por ruído. Meta de 75% linhas ATINGIDA (~76%) após o teste de
      // boot completo (tests/integration/boot-main.test.js) exercitar tb-main.
      // functions caiu de ~63% para ~54% porque o boot passou a CONTAR as ~130
      // funções de tb-main (antes o arquivo nunca era carregado) — medição do
      // app inteiro, não regressão. Próximo alvo: acionar gameplay para cobrir
      // os handlers win/loss/data-action de tb-main.
      thresholds: {
        lines: 73,
        statements: 73,
        functions: 50,
        branches: 62,
      },
    },
  },
});
