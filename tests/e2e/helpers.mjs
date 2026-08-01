/** Utilitários compartilhados pelos testes E2E. */
export const SAVE_SEED = {
  tutorialDone: true,
  coachDone: true,
  lastVersionSeen: '1.4.8',
  lastLoginDay: Math.floor(Date.now() / 86400000),
  loginStreak: 1,
  lives: 5,
  unlocked: 0,
  coins: 100,
  remoteCfg: { adDailyLimit: 5, interstitialEvery: 5, interstitialDailyCap: 5, coinMult: 1 },
};

/** Save de usuário novo (sem onboarding). Evita daily login no boot. */
export const FRESH_SEED = {
  lastLoginDay: Math.floor(Date.now() / 86400000),
  loginStreak: 1,
  lives: 5,
  unlocked: 0,
  coins: 50,
  remoteCfg: { adDailyLimit: 5, interstitialEvery: 5, interstitialDailyCap: 5, coinMult: 1 },
};

/** Save recorrente com progresso — sem re-onboarding. */
export const RETURNING_SEED = {
  tutorialDone: true,
  coachDone: true,
  lastVersionSeen: '1.4.8',
  lastLoginDay: Math.floor(Date.now() / 86400000),
  loginStreak: 3,
  lives: 5,
  unlocked: 4,
  stars: { 0: 3, 1: 2, 2: 2, 3: 1 },
  coins: 200,
  remoteCfg: { adDailyLimit: 5, interstitialEvery: 5, interstitialDailyCap: 5, coinMult: 1 },
};

export async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => {
      document.getElementById('splash')?.classList.add('hide');
      document.querySelectorAll('#global-modal.show button, #global-modal button').forEach((b) => {
        if (
          /fechar|coletar|ok|depois|later|close|collect|incrível|continuar|continue|pular|skip|saltar/i.test(
            b.textContent || ''
          )
        ) {
          b.click();
        }
      });
      const modal = document.getElementById('global-modal');
      if (modal?.classList.contains('show')) modal.classList.remove('show');
      document.getElementById('result')?.classList.remove('show');
      document.getElementById('coach-overlay')?.classList.remove('show');
    });
    await new Promise((r) => setTimeout(r, 400));
  }
}

export async function waitForBoot(page, timeout = 12000) {
  await page.waitForFunction(
    () => window.TBRoadmap?.isReady?.() && window.TBFeatures?.isReady?.(),
    { timeout }
  );
}

export async function startLevel(page, idx = 0) {
  await page.evaluate((level) => {
    document.getElementById('splash')?.classList.add('hide');
    document.getElementById('global-modal')?.classList.remove('show');
    if (typeof startGame === 'function') startGame(level);
  }, idx);
  await page.waitForFunction(
    () => document.getElementById('screen-game')?.classList.contains('active'),
    { timeout: 8000 }
  );
  await page.waitForFunction(
    () => typeof busy !== 'undefined' && !busy && typeof grid !== 'undefined' && grid.length > 0,
    { timeout: 12000 }
  );
}

/** Joga movimentos válidos (maior grupo primeiro) até vitória ou limite. */
export async function playGreedy(page, maxMoves = 30) {
  return playMoves(page, maxMoves, 'greedy');
}

/** Joga sempre o menor grupo possível (útil para testar derrota). */
export async function playSmallest(page, maxMoves = 30) {
  return playMoves(page, maxMoves, 'smallest');
}

async function playMoves(page, maxMoves, strategy) {
  return page.evaluate(
    async (limit, mode) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      let moves = 0;
      for (let attempt = 0; attempt < limit; attempt++) {
        if (typeof over !== 'undefined' && over) break;
        if (document.getElementById('result')?.classList.contains('show')) break;
        if (typeof checkWin === 'function' && checkWin()) break;

        let waited = 0;
        while (typeof busy !== 'undefined' && busy && waited < 20) {
          await sleep(150);
          waited++;
        }

        let best = null;
        for (let x = 0; x < GW; x++) {
          for (let y = 0; y < GH; y++) {
            const b = grid[x]?.[y];
            if (!b) continue;
            if (mode === 'greedy' && b.sp !== SP.NONE) {
              if (!best || best.size < 2) best = { x, y, size: 2, special: true };
              continue;
            }
            if (mode === 'smallest' && b.sp !== SP.NONE) continue;
            const g = getGroup(x, y);
            if (g.length < 2) continue;
            if (!best || (mode === 'greedy' ? g.length > best.size : g.length < best.size)) {
              best = { x, y, size: g.length };
            }
          }
        }
        if (!best) {
          await sleep(700);
          continue;
        }
        const before = score;
        handleClick(best.x, best.y);
        await sleep(700);
        if (score > before || best.special) moves++;
      }
      return {
        moves,
        score: typeof score !== 'undefined' ? score : 0,
        won: typeof checkWin === 'function' ? checkWin() : false,
        resultVisible: !!document.getElementById('result')?.classList.contains('show'),
        over: typeof over !== 'undefined' ? over : false,
        movesLeft: typeof movesLeft !== 'undefined' ? movesLeft : -1,
      };
    },
    maxMoves,
    strategy
  );
}

export async function readSave(page) {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem('tbv4');
      if (!raw) return {};
      if (window.TBSecure?.unwrap) {
        const u = TBSecure.unwrap(raw);
        return (u && u.data) || {};
      }
      return JSON.parse(raw);
    } catch {
      return {};
    }
  });
}

export async function waitForCountdown(page) {
  await page.waitForFunction(() => !document.getElementById('cd')?.classList.contains('show'), {
    timeout: 12000,
  });
  await page.waitForFunction(() => typeof busy !== 'undefined' && !busy, { timeout: 8000 });
}

/** Seed com strings longas / moeda alta para stress de overflow i18n. */
export function longLocaleSeed(lang = 'pt') {
  return {
    ...RETURNING_SEED,
    lang,
    playerName: 'JogadorComNomeMuitoLongoParaTestarOverflowXYZ',
    coins: 9999999,
    lives: 5,
  };
}

export async function setLang(page, lang) {
  await page.evaluate((l) => {
    if (window.TBRoadmap?.setLanguage) TBRoadmap.setLanguage(l);
    else if (window.TBI18n?.setLanguage) TBI18n.setLanguage(l);
    if (window.TBRoadmap?.applyI18n) TBRoadmap.applyI18n();
    if (typeof flushSave === 'function') flushSave();
    document.getElementById('global-modal')?.classList.remove('show');
  }, lang);
  await new Promise((r) => setTimeout(r, 200));
}

/** Containers críticos — não podem ultrapassar a viewport (overflow visual). */
export async function assertNoHorizontalOverflow(page, selectors) {
  const bad = await page.evaluate((sels) => {
    const out = [];
    const vw = document.documentElement.clientWidth;
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 2 || r.left < -2) {
        out.push({
          sel,
          left: Math.round(r.left),
          right: Math.round(r.right),
          vw,
        });
      }
    }
    return out;
  }, selectors);
  if (bad.length) {
    throw new Error(
      'Overflow horizontal: ' +
        bad.map((b) => `${b.sel} (${b.left}..${b.right} vw=${b.vw})`).join('; ')
    );
  }
}

export async function openShop(page) {
  await page.evaluate(() => {
    document.getElementById('splash')?.classList.add('hide');
    document.getElementById('global-modal')?.classList.remove('show');
    if (typeof openShop === 'function') openShop();
    else document.getElementById('map-shop-btn')?.click();
  });
  await page.waitForFunction(
    () => document.getElementById('screen-shop')?.classList.contains('active'),
    { timeout: 8000 }
  );
}

export async function goMap(page) {
  await page.evaluate(() => {
    if (typeof goToMap === 'function') goToMap();
    else {
      document.getElementById('screen-shop')?.classList.remove('active');
      document.getElementById('screen-game')?.classList.remove('active');
      document.getElementById('screen-map')?.classList.add('active');
    }
  });
}
