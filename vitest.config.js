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
      // Cliente: módulos tb-*.js na raiz (cobertura v8 inclui scripts carregados
      // via tests/helpers/load-module.js — filename file:// absoluto, ver helper).
      // Servidor: os arquivos de LÓGICA PURA das Cloud Functions (economia
      // autoritativa). Os wrappers acoplados ao runtime do Firebase (index.js,
      // confirm-iap.js, submit-score.js, challenge.js) ficam de fora — só são
      // exercitáveis em integração, não em unidade.
      include: [
        'tb-*.js',
        'functions/challenge-logic.js',
        'functions/iap-logic.js',
        'functions/score-logic.js',
        'functions/economy-catalog.js',
        'functions/play-verify.js',
        'functions/delete-social.js',
      ],
      exclude: ['www/**', 'tests/**', 'scripts/**', 'android/**', 'coverage/**'],
      // Floor com ~3pp de folga sobre o valor atual. O teste de boot completo
      // (tests/integration/boot-main.test.js) monta o app real, carrega os
      // níveis de data/ e JOGA fases: blasts reais, especiais (bomb/rocket/
      // rainbow), boosters e fases com obstáculos (gelo/coleta/caixa) — cobrindo
      // tb-main, tb-start, tb-gameplay (~87%), tb-board (~83%) e tb-grid.
      // + unidade de offers/shop/music/social (economia/áudio) e da lógica das
      // Cloud Functions (agregado ~93%). Atual: ~85% lines / 71% funcs / 71% br.
      thresholds: {
        lines: 82,
        statements: 82,
        functions: 68,
        branches: 69,
      },
    },
  },
});
