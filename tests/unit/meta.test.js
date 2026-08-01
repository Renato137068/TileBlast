import { describe, expect, it, beforeEach } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

function cfg() {
  let store = {};
  let coins = 1000;
  const chests = [];
  return {
    _coins: () => coins,
    _chests: () => chests,
    ld: () => store,
    sv: (s) => {
      store = s;
    },
    getCoins: () => coins,
    addCoins: (n) => {
      coins += n;
    },
    addChest: (tier) => {
      chests.push(tier);
      return true;
    },
    showGlobalModal: () => {},
    closeGlobalModal: () => {},
    showToast: () => {},
    updateMapMeta: () => {},
    Sound: { unlock: () => {} },
  };
}

describe('TBMeta — meta progressão', () => {
  beforeEach(() => {
    createMinimalDom();
    mountModule('tb-meta.js');
  });

  it('inicia com 0 estrelas e nenhuma tarefa feita', () => {
    TBMeta.init(cfg());
    expect(TBMeta.getStars()).toBe(0);
    expect(TBMeta.progress().done).toBe(0);
    expect(TBMeta.progress().total).toBe(16);
  });

  it('addStars acumula banco de estrelas gastável', () => {
    TBMeta.init(cfg());
    TBMeta.addStars(3);
    TBMeta.addStars(2);
    expect(TBMeta.getStars()).toBe(5);
  });

  it('não constrói sem estrelas suficientes', () => {
    TBMeta.init(cfg());
    const first = TBMeta.nextTask();
    const r = TBMeta.build(first.id);
    expect(r.ok).toBe(false);
    expect(TBMeta.progress().done).toBe(0);
  });

  it('constrói tarefa gastando estrelas e dá moedas', () => {
    const c = cfg();
    TBMeta.init(c);
    const t = TBMeta.nextTask(); // custo 2, +50 moedas
    TBMeta.addStars(5);
    const r = TBMeta.build(t.id);
    expect(r.ok).toBe(true);
    expect(TBMeta.getStars()).toBe(5 - t.cost);
    expect(c._coins()).toBe(1000 + t.coins);
    expect(TBMeta.progress().done).toBe(1);
  });

  it('rush usa moedas quando faltam estrelas (utilidade da moeda)', () => {
    const c = cfg();
    TBMeta.init(c);
    const t = TBMeta.nextTask(); // custo 2
    // 0 estrelas -> rush custa 2*25 = 50 moedas
    expect(TBMeta.rushCost(t.id)).toBe(t.cost * 25);
    const r = TBMeta.build(t.id, { rush: true });
    expect(r.ok).toBe(true);
    // gastou 50 de rush, ganhou t.coins
    expect(c._coins()).toBe(1000 - t.cost * 25 + t.coins);
  });

  it('completar um capítulo concede baú de ouro', () => {
    const c = cfg();
    TBMeta.init(c);
    TBMeta.addStars(100);
    // capitulo 0 = 4 tarefas
    const ch0 = TBMeta._tasks.filter((x) => x.ch === 0);
    let chapterCompleteSeen = false;
    for (const t of ch0) {
      const r = TBMeta.build(t.id);
      if (r.chapterComplete) chapterCompleteSeen = true;
    }
    expect(chapterCompleteSeen).toBe(true);
    expect(c._chests()).toContain('gold');
    expect(TBMeta.currentChapter()).toBe(1); // avançou de capítulo
  });

  it('persiste no save entre reinícios do módulo', () => {
    const c = cfg();
    TBMeta.init(c);
    TBMeta.addStars(10);
    const t = TBMeta.nextTask();
    TBMeta.build(t.id);
    const doneBefore = TBMeta.progress().done;
    // reinicia módulo com o MESMO save
    mountModule('tb-meta.js');
    TBMeta.init({ ...c, ld: c.ld, sv: c.sv });
    expect(TBMeta.progress().done).toBe(doneBefore);
    expect(TBMeta.getStars()).toBe(10 - t.cost);
  });
});
