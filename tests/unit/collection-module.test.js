import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

const WORLD_SKIN_MAP = {
  '🌱 Jardim': 'av_w_garden',
  '🌲 Floresta': 'av_w_forest',
  '⛰ Montanha': 'av_w_mountain',
};

function mountCollection(mathStub) {
  globalThis.TBState = {
    LEVELS: [{ world: '🌱 Jardim' }, { world: '🌲 Floresta' }, { world: '⛰ Montanha' }],
  };
  // O sandbox do vm tem intrínsecos próprios: só um Math injetado torna o
  // sorteio de drop determinístico.
  mountModule('tb-collection.js', { Math: mathStub });
  return globalThis.TBCollection;
}

describe('tb-collection', () => {
  /** @type {any} */
  let CO;
  /** @type {any} */
  let save;
  /** @type {any} */
  let cfg;
  /** @type {number} */
  let rand;

  beforeEach(() => {
    delete globalThis.TBCollection;
    delete globalThis.TBState;
    rand = 0;
    const mathStub = Object.create(Math);
    mathStub.random = () => rand;
    document.body.innerHTML = `<div id="board-w"></div>`;
    save = {};
    cfg = {
      ld: () => save,
      sv: (s) => {
        save = s;
      },
      _t: (_k, f) => f,
      showToast: vi.fn(),
      showGlobalModal: vi.fn(),
      closeGlobalModal: vi.fn(),
      getUnlocked: () => 2,
      WORLD_SKIN_MAP,
      Mascot: {
        applySkin: vi.fn(),
        setMood: vi.fn(),
        previewHtml: (skin) => `<i>${skin}</i>`,
      },
    };
    CO = mountCollection(mathStub);
    CO.init(cfg);
  });

  it('getCollection retorna os itens padrão', () => {
    const c = CO.getCollection();
    expect(c.owned).toEqual(expect.arrayContaining(['av_default', 'av_w_garden', 'bg_default']));
    expect(c.equipped).toEqual({ avatar: 'av_default', bg: 'bg_default' });
  });

  it('ownCollItem adiciona uma única vez', () => {
    expect(CO.ownCollItem('av_ninja')).toBe(true);
    expect(CO.ownCollItem('av_ninja')).toBe(false);
    expect(save.coll.owned).toContain('av_ninja');
  });

  it('equipCollItem persiste e aplica skin no Mascot', () => {
    CO.ownCollItem('av_ninja');
    CO.equipCollItem('avatar', 'av_ninja');
    expect(CO.getCollection().equipped.avatar).toBe('av_ninja');
    expect(cfg.Mascot.applySkin).toHaveBeenCalledWith('ninja');
    expect(cfg.Mascot.setMood).toHaveBeenCalledWith('idle');
  });

  it('applyEquipped aplica gradiente do fundo em #board-w', () => {
    CO.equipCollItem('bg', 'bg_lava');
    expect(document.getElementById('board-w').style.background).toContain('radial-gradient');

    CO.equipCollItem('bg', 'bg_default');
    expect(document.getElementById('board-w').style.background).toBe('');
  });

  it('unlockWorldSkin devolve o item só na primeira vez', () => {
    const item = CO.unlockWorldSkin('🌲 Floresta');
    expect(item.id).toBe('av_w_forest');
    expect(CO.unlockWorldSkin('🌲 Floresta')).toBeNull();
    expect(CO.unlockWorldSkin('🪐 Inexistente')).toBeNull();
  });

  it('syncWorldSkins libera skins dos mundos já alcançados', () => {
    CO.syncWorldSkins();
    const owned = CO.getCollection().owned;
    expect(owned).toContain('av_w_garden');
    expect(owned).toContain('av_w_forest');
    expect(owned).not.toContain('av_w_mountain');
  });

  it('tryDropCollFromChest respeita a chance de drop', () => {
    rand = 0.9;
    expect(CO.tryDropCollFromChest('bronze')).toBeNull();

    rand = 0;
    const item = CO.tryDropCollFromChest('bronze');
    expect(item.tier).toBe('bronze');
    expect(item.unlock).toBe('chest');
    expect(CO.getCollection().owned).toContain(item.id);
  });

  it('tryDropCollFromChest devolve null sem itens elegíveis', () => {
    rand = 0;
    expect(CO.tryDropCollFromChest('tier_inexistente')).toBeNull();

    // Esgota o pool do tier: sem itens não-possuídos não há drop.
    while (CO.tryDropCollFromChest('legendary')) {
      /* drena */
    }
    expect(CO.tryDropCollFromChest('legendary')).toBeNull();
  });

  it('checkLevelCollUnlocks libera itens do nível', () => {
    CO.checkLevelCollUnlocks(5);
    expect(CO.getCollection().owned).toContain('av_ninja');

    const before = CO.getCollection().owned.length;
    CO.checkLevelCollUnlocks(999);
    expect(CO.getCollection().owned).toHaveLength(before);
  });

  it('helpers de localização usam _t com fallback', () => {
    expect(CO.locChestLabel('bronze', 'Baú de Bronze')).toBe('Baú de Bronze');
    expect(CO.locFeatName({ key: 'chests', name: 'Baús' })).toBe('Baús');
    expect(CO.locCollName({ id: 'av_ninja', name: 'Ninja' })).toBe('Ninja');
    expect(CO.locCollName(null)).toBe('');
  });
});
