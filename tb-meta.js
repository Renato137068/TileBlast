/**
 * Tile Blast — META PROGRESSAO "Jardim do Blasty".
 * Da PROPOSITO ao jogo: identidade (tema), retencao (proxima tarefa) e utilidade
 * economica (gastar estrelas; acelerar por moedas). Modulo isolado, inicializado
 * via TBMeta.init(cfg) a partir de tile_blast.html.
 */
(function (global) {
  'use strict';

  let C = null;

  const CHAPTERS = [
    { icon: '🌱', pt: 'O Jardim', en: 'The Garden', es: 'El Jardín' },
    { icon: '⛲', pt: 'A Fonte', en: 'The Fountain', es: 'La Fuente' },
    { icon: '🌳', pt: 'O Bosque', en: 'The Grove', es: 'El Bosque' },
    { icon: '🎪', pt: 'O Festival', en: 'The Festival', es: 'El Festival' },
  ];

  // 16 tarefas (4 capitulos). cost=estrelas, coins=recompensa, scene=emoji da cena.
  const TASKS = [
    {
      id: 'g1',
      ch: 0,
      scene: '🌿',
      cost: 2,
      coins: 50,
      pt: 'Limpar o mato',
      en: 'Clear the weeds',
      es: 'Limpiar la maleza',
    },
    {
      id: 'g2',
      ch: 0,
      scene: '🚪',
      cost: 3,
      coins: 60,
      pt: 'Consertar o portão',
      en: 'Fix the gate',
      es: 'Reparar la puerta',
    },
    {
      id: 'g3',
      ch: 0,
      scene: '🌷',
      cost: 3,
      coins: 70,
      pt: 'Plantar tulipas',
      en: 'Plant tulips',
      es: 'Plantar tulipanes',
    },
    {
      id: 'g4',
      ch: 0,
      scene: '🪴',
      cost: 4,
      coins: 80,
      pt: 'Vasos na entrada',
      en: 'Pots at the entrance',
      es: 'Macetas en la entrada',
    },
    {
      id: 'f1',
      ch: 1,
      scene: '💧',
      cost: 4,
      coins: 80,
      pt: 'Reabrir a fonte',
      en: 'Reopen the fountain',
      es: 'Reabrir la fuente',
    },
    {
      id: 'f2',
      ch: 1,
      scene: '🐟',
      cost: 4,
      coins: 90,
      pt: 'Soltar peixinhos',
      en: 'Add little fish',
      es: 'Soltar pececitos',
    },
    {
      id: 'f3',
      ch: 1,
      scene: '🌉',
      cost: 5,
      coins: 100,
      pt: 'Construir a ponte',
      en: 'Build the bridge',
      es: 'Construir el puente',
    },
    {
      id: 'f4',
      ch: 1,
      scene: '🦆',
      cost: 5,
      coins: 110,
      pt: 'Convidar os patos',
      en: 'Invite the ducks',
      es: 'Invitar a los patos',
    },
    {
      id: 'b1',
      ch: 2,
      scene: '🌳',
      cost: 5,
      coins: 110,
      pt: 'Plantar a árvore',
      en: 'Plant the tree',
      es: 'Plantar el árbol',
    },
    {
      id: 'b2',
      ch: 2,
      scene: '🪵',
      cost: 6,
      coins: 120,
      pt: 'Trilha de madeira',
      en: 'Wooden trail',
      es: 'Sendero de madera',
    },
    {
      id: 'b3',
      ch: 2,
      scene: '🍄',
      cost: 6,
      coins: 130,
      pt: 'Cogumelos mágicos',
      en: 'Magic mushrooms',
      es: 'Setas mágicas',
    },
    {
      id: 'b4',
      ch: 2,
      scene: '🐿️',
      cost: 7,
      coins: 140,
      pt: 'Casinha do esquilo',
      en: 'Squirrel house',
      es: 'Casita de ardilla',
    },
    {
      id: 'p1',
      ch: 3,
      scene: '🎡',
      cost: 6,
      coins: 130,
      pt: 'Roda-gigante',
      en: 'Ferris wheel',
      es: 'Rueda de la fortuna',
    },
    {
      id: 'p2',
      ch: 3,
      scene: '🎈',
      cost: 7,
      coins: 150,
      pt: 'Balões de festa',
      en: 'Party balloons',
      es: 'Globos de fiesta',
    },
    {
      id: 'p3',
      ch: 3,
      scene: '🎇',
      cost: 8,
      coins: 160,
      pt: 'Fogos de artifício',
      en: 'Fireworks',
      es: 'Fuegos artificiales',
    },
    {
      id: 'p4',
      ch: 3,
      scene: '🎉',
      cost: 10,
      coins: 200,
      pt: 'Grande inauguração',
      en: 'Grand opening',
      es: 'Gran inauguración',
    },
  ];

  const RUSH_PER_STAR = 25; // moedas por estrela faltante para acelerar (sink de moeda)

  function ready() {
    return !!(C && C.ld);
  }
  function lang() {
    if (!ready()) return 'pt';
    return (C.ld().lang || 'pt').slice(0, 2);
  }
  function T(o) {
    return o[lang()] || o.pt;
  }

  function state() {
    const s = C.ld();
    if (!s.meta) s.meta = { stars: 0, done: {} };
    if (typeof s.meta.stars !== 'number') s.meta.stars = 0;
    if (!s.meta.done) s.meta.done = {};
    return s.meta;
  }
  function save() {
    C.sv(C.ld());
  }

  function getStars() {
    return ready() ? state().stars : 0;
  }
  function addStars(n) {
    if (!ready() || !n) return;
    const m = state();
    m.stars = Math.max(0, m.stars + n);
    save();
    if (C.updateMapMeta) C.updateMapMeta();
    updateMapHint();
  }
  function isDone(id) {
    return !!state().done[id];
  }
  function tasksOf(ch) {
    return TASKS.filter((t) => t.ch === ch);
  }
  function totalDone() {
    return TASKS.filter((t) => isDone(t.id)).length;
  }
  function progress() {
    const done = totalDone();
    return { done, total: TASKS.length, pct: Math.round((done / TASKS.length) * 100) };
  }
  // capitulo atual = primeiro com tarefa pendente
  function currentChapter() {
    for (let c = 0; c < CHAPTERS.length; c++) {
      if (tasksOf(c).some((t) => !isDone(t.id))) return c;
    }
    return CHAPTERS.length - 1;
  }
  // proxima tarefa pendente do capitulo atual
  function nextTask() {
    const c = currentChapter();
    return tasksOf(c).find((t) => !isDone(t.id)) || null;
  }
  function canBuild(id) {
    const t = TASKS.find((x) => x.id === id);
    if (!t || isDone(id)) return false;
    return state().stars >= t.cost;
  }
  function rushCost(id) {
    const t = TASKS.find((x) => x.id === id);
    if (!t || isDone(id)) return 0;
    const missing = Math.max(0, t.cost - state().stars);
    return missing * RUSH_PER_STAR;
  }

  // Constroi uma tarefa. Retorna {ok, chapterComplete, gameComplete}.
  function build(id, opts) {
    const t = TASKS.find((x) => x.id === id);
    if (!t || isDone(id)) return { ok: false };
    const m = state();
    const useRush = opts && opts.rush;
    if (useRush) {
      const missing = Math.max(0, t.cost - m.stars);
      const coinCost = missing * RUSH_PER_STAR;
      if (C.getCoins && C.getCoins() < coinCost) return { ok: false, reason: 'coins' };
      const useStars = Math.min(m.stars, t.cost);
      m.stars -= useStars;
      if (coinCost && C.addCoins) C.addCoins(-coinCost);
    } else {
      if (m.stars < t.cost) return { ok: false, reason: 'stars' };
      m.stars -= t.cost;
    }
    m.done[id] = true;
    if (C.addCoins) C.addCoins(t.coins);
    const chDone = tasksOf(t.ch).every((x) => isDone(x.id));
    if (chDone && C.addChest) C.addChest('gold');
    save();
    if (C.updateMapMeta) C.updateMapMeta();
    return {
      ok: true,
      chapterComplete: chDone,
      gameComplete: totalDone() === TASKS.length,
      task: t,
    };
  }

  // ── UI ────────────────────────────────────────────────────────────
  function sceneHtml(ch) {
    const cells = tasksOf(ch)
      .map((t) => {
        const done = isDone(t.id);
        return `<div class="meta-scene-cell${done ? ' built' : ''}" title="${T(t)}">${done ? t.scene : '·'}</div>`;
      })
      .join('');
    return `<div class="meta-scene">${cells}</div>`;
  }

  function taskRowHtml(t) {
    const done = isDone(t.id);
    if (done) {
      return `<div class="meta-task done"><span class="meta-task-ic">${t.scene}</span>
        <span class="meta-task-name">${T(t)}</span><span class="meta-task-ok">✓</span></div>`;
    }
    const can = canBuild(t.id);
    const rush = rushCost(t.id);
    const buildBtn = `<button class="btn ${can ? 'btn-p' : 'btn-g'} meta-build" ${can ? '' : 'disabled'}
        data-action="metaBuild" data-arg="${t.id}">⭐ ${t.cost}</button>`;
    const rushBtn =
      !can && rush > 0
        ? `<button class="btn btn-g meta-rush" data-action="metaRush" data-arg="${t.id}">💰 ${rush}</button>`
        : '';
    return `<div class="meta-task"><span class="meta-task-ic">${t.scene}</span>
      <span class="meta-task-name">${T(t)}</span>
      <span class="meta-task-reward">+${t.coins}💰</span>${buildBtn}${rushBtn}</div>`;
  }

  function modalHtml() {
    const c = currentChapter();
    const ch = CHAPTERS[c];
    const pr = progress();
    const rows = tasksOf(c).map(taskRowHtml).join('');
    const done = pr.done === pr.total;
    return `
      <div style="font-size:34px">${ch.icon}</div>
      <div style="font-size:18px;font-weight:800">${T({ pt: 'Jardim de Blasty', en: "Blasty's Garden", es: 'El Jardín de Blasty' })}</div>
      <div style="font-size:13px;color:var(--accent);margin:2px 0 4px">${T(ch)} · ${T({ pt: 'Capítulo', en: 'Chapter', es: 'Capítulo' })} ${c + 1}/${CHAPTERS.length}</div>
      <div style="font-size:12px;color:var(--dim);margin-bottom:8px">⭐ ${getStars()} ${T({ pt: 'estrelas para gastar', en: 'stars to spend', es: 'estrellas para gastar' })}</div>
      ${sceneHtml(c)}
      <div class="meta-bar"><div class="meta-bar-fill" style="width:${pr.pct}%"></div></div>
      <div style="font-size:11px;color:var(--dim);margin:4px 0 10px">${pr.done}/${pr.total} ${T({ pt: 'tarefas', en: 'tasks', es: 'tareas' })}</div>
      <div class="meta-tasks">${rows}</div>
      ${done ? `<div style="font-size:13px;color:var(--success);font-weight:700;margin-top:8px">🎉 ${T({ pt: 'Jardim completo! Mais capítulos em breve.', en: 'Garden complete! More chapters soon.', es: '¡Jardín completo! Más capítulos pronto.' })}</div>` : ''}
      <button class="btn btn-g btn-full" style="margin-top:12px" data-action="closeGlobalModal">${T({ pt: 'Fechar', en: 'Close', es: 'Cerrar' })}</button>
    `;
  }

  function openModal() {
    if (!ready() || !C.showGlobalModal) return;
    C.showGlobalModal(modalHtml());
  }
  function refresh() {
    if (document.getElementById('global-modal')?.classList.contains('show')) openModal();
  }

  function celebrate(res) {
    if (!res || !res.ok) return;
    const t = res.task;
    if (C.Sound && C.Sound.unlock) C.Sound.unlock();
    if (C.showToast)
      C.showToast(
        t.scene,
        T({ pt: 'Construído!', en: 'Built!', es: '¡Construido!' }),
        `+${t.coins} 💰`
      );
    if (res.chapterComplete && C.showToast) {
      setTimeout(
        () =>
          C.showToast(
            '🎁',
            T({ pt: 'Capítulo completo!', en: 'Chapter complete!', es: '¡Capítulo completo!' }),
            T({ pt: 'Baú de ouro ganho', en: 'Gold chest earned', es: 'Cofre de oro ganado' })
          ),
        900
      );
    }
  }

  function updateMapHint() {
    if (!ready()) return;
    const el = document.getElementById('map-garden-hint');
    if (!el) return;
    const nt = nextTask();
    const stars = getStars();
    if (nt) {
      const ready2 = stars >= nt.cost;
      el.textContent = ready2 ? '!' : '';
      el.style.display = ready2 ? 'inline-block' : 'none';
    } else {
      el.style.display = 'none';
    }
  }

  global.TBMeta = {
    isReady: ready,
    init(cfg) {
      C = cfg;
      state();
      updateMapHint();
    },
    addStars,
    getStars,
    progress,
    nextTask,
    currentChapter,
    canBuild,
    rushCost,
    build,
    openModal,
    updateMapHint,
    doBuild(id) {
      const res = build(id);
      if (!res.ok) {
        if (C.showToast)
          C.showToast(
            '⭐',
            T({
              pt: 'Estrelas insuficientes',
              en: 'Not enough stars',
              es: 'Estrellas insuficientes',
            }),
            ''
          );
        return;
      }
      celebrate(res);
      refresh();
    },
    doRush(id) {
      const cost = rushCost(id);
      if (C.getCoins && C.getCoins() < cost) {
        if (C.showToast)
          C.showToast(
            '💰',
            T({ pt: 'Moedas insuficientes', en: 'Not enough coins', es: 'Monedas insuficientes' }),
            ''
          );
        return;
      }
      const res = build(id, { rush: true });
      if (!res.ok) return;
      celebrate(res);
      refresh();
    },
    _tasks: TASKS,
    _chapters: CHAPTERS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
