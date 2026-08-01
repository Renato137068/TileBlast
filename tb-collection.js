// @ts-check
/**
 * Tile Blast — coleção (skins / fundos)
 * Extraído de tb-meta-ui.js. TBCollection.init(cfg) no boot.
 *
 * @typedef {Record<string, any>} TBCollectionCfg
 */
(function (global) {
  'use strict';

  /** @type {any} */
  const TBRoadmap = global.TBRoadmap;
  /** @type {any} */
  const TBState = global.TBState;

  /** @type {any} */
  let C = null;

  /** @param {TBCollectionCfg|null|undefined} cfg */
  function init(cfg) {
    C = cfg || null;
  }

  function _locChestLabel(tier, fallback) {
    return C._t('chest_' + tier, fallback || tier);
  }

  function _locFeatName(f) {
    return C._t('feat_' + f.key, f.name);
  }

  // ── COLLECTION SYSTEM ──────────────────────────────────────────
  const COLL_DEFS = {
    avatar: [
      { id: 'av_default', name: 'Clássico', skin: 'default', unlock: 'default', mascot: true },
      {
        id: 'av_w_garden',
        name: 'Jardim',
        skin: 'garden',
        unlock: 'world',
        world: '🌱 Jardim',
        mascot: true,
      },
      {
        id: 'av_w_forest',
        name: 'Floresta',
        skin: 'forest',
        unlock: 'world',
        world: '🌲 Floresta',
        mascot: true,
      },
      {
        id: 'av_w_mountain',
        name: 'Montanha',
        skin: 'mountain',
        unlock: 'world',
        world: '⛰ Montanha',
        mascot: true,
      },
      {
        id: 'av_w_ocean',
        name: 'Oceano',
        skin: 'ocean',
        unlock: 'world',
        world: '🌊 Oceano',
        mascot: true,
      },
      {
        id: 'av_w_inferno',
        name: 'Inferno',
        skin: 'inferno',
        unlock: 'world',
        world: '🔥 Inferno',
        mascot: true,
      },
      { id: 'av_fire', name: 'Chama', skin: 'fire', unlock: 'chest', tier: 'bronze', mascot: true },
      {
        id: 'av_star',
        name: 'Estrela',
        skin: 'star',
        unlock: 'chest',
        tier: 'silver',
        mascot: true,
      },
      { id: 'av_gem', name: 'Gema', skin: 'gem', unlock: 'chest', tier: 'gold', mascot: true },
      { id: 'av_crown', name: 'Coroa', skin: 'crown', unlock: 'chest', tier: 'epic', mascot: true },
      {
        id: 'av_dragon',
        name: 'Dragão',
        skin: 'dragon',
        unlock: 'chest',
        tier: 'legendary',
        mascot: true,
      },
      { id: 'av_ninja', name: 'Ninja', skin: 'ninja', unlock: 'level', level: 5, mascot: true },
      { id: 'av_wizard', name: 'Mago', skin: 'wizard', unlock: 'level', level: 10, mascot: true },
      { id: 'av_robot', name: 'Robô', skin: 'robot', unlock: 'level', level: 15, mascot: true },
    ],
    bg: [
      { id: 'bg_default', name: 'Padrão', gradient: 'none', unlock: 'default' },
      {
        id: 'bg_sunset',
        name: 'Pôr do Sol',
        gradient: 'radial-gradient(ellipse at top,#2d0a1c,#0d0f18)',
        unlock: 'chest',
        tier: 'bronze',
      },
      {
        id: 'bg_ocean',
        name: 'Oceano',
        gradient: 'radial-gradient(ellipse at top,#0a1a2d,#0d0f18)',
        unlock: 'chest',
        tier: 'silver',
      },
      {
        id: 'bg_forest',
        name: 'Floresta',
        gradient: 'radial-gradient(ellipse at top,#0a1a0d,#0d0f18)',
        unlock: 'chest',
        tier: 'gold',
      },
      {
        id: 'bg_cosmos',
        name: 'Cosmos',
        gradient: 'radial-gradient(ellipse at top,#10073a,#0d0f18)',
        unlock: 'chest',
        tier: 'epic',
      },
      {
        id: 'bg_gold',
        name: 'Dourado',
        gradient: 'radial-gradient(ellipse at top,#2d1a00,#0d0f18)',
        unlock: 'chest',
        tier: 'legendary',
      },
      {
        id: 'bg_cyber',
        name: 'Cyber',
        gradient: 'radial-gradient(ellipse at top,#003a1a,#0d0f18)',
        unlock: 'level',
        level: 7,
      },
      {
        id: 'bg_lava',
        name: 'Lava',
        gradient: 'radial-gradient(ellipse at top,#3a0a00,#0d0f18)',
        unlock: 'level',
        level: 12,
      },
    ],
  };
  const COLL_SAVE_KEY = 'coll';
  const COLL_DROP_CHANCE = 0.4;

  function _collDefaults() {
    return {
      owned: ['av_default', 'av_w_garden', 'bg_default'],
      equipped: { avatar: 'av_default', bg: 'bg_default' },
    };
  }

  function getCollection() {
    const s = C.ld();
    if (!s[COLL_SAVE_KEY]) s[COLL_SAVE_KEY] = _collDefaults();
    const c = s[COLL_SAVE_KEY];
    if (!c.owned.includes('av_default')) c.owned.push('av_default');
    if (!c.owned.includes('av_w_garden')) c.owned.push('av_w_garden');
    if (!c.owned.includes('bg_default')) c.owned.push('bg_default');
    return c;
  }

  function syncWorldSkins() {
    const unl = C.getUnlocked();
    const worlds = new Set();
    for (let i = 0; i < Math.min(unl, TBState.LEVELS.length); i++)
      worlds.add(TBState.LEVELS[i].world);
    worlds.forEach((w) => {
      const id = C.WORLD_SKIN_MAP[w];
      if (id) ownCollItem(id);
    });
  }

  function saveCollection(c) {
    const s = C.ld();
    s[COLL_SAVE_KEY] = c;
    C.sv(s);
  }

  function ownCollItem(id) {
    const c = getCollection();
    if (c.owned.includes(id)) return false;
    c.owned.push(id);
    saveCollection(c);
    return true;
  }

  function equipCollItem(cat, id) {
    const c = getCollection();
    c.equipped[cat] = id;
    saveCollection(c);
    applyEquipped();
  }

  function unlockWorldSkin(worldName) {
    const id = C.WORLD_SKIN_MAP[worldName];
    if (!id) return null;
    const item = COLL_DEFS.avatar.find((a) => a.id === id);
    if (!item) return null;
    if (ownCollItem(id)) return item;
    return null;
  }

  function applyEquipped() {
    const eq = getCollection().equipped;
    const avDef = COLL_DEFS.avatar.find((a) => a.id === eq.avatar) || COLL_DEFS.avatar[0];
    C.Mascot.applySkin(avDef.skin || 'default');
    C.Mascot.setMood('idle');
    const bgDef = COLL_DEFS.bg.find((b) => b.id === eq.bg) || COLL_DEFS.bg[0];
    const bw = document.getElementById('board-w');
    if (bw) bw.style.background = bgDef.gradient === 'none' ? '' : bgDef.gradient;
    // Propaga fundo da coleção para o canvas (senão o cache opaco cobre o CSS)
    let top = null,
      bot = null;
    if (bgDef.gradient && bgDef.gradient !== 'none') {
      const hexes = bgDef.gradient.match(/#([0-9a-fA-F]{6})/g);
      if (hexes && hexes.length >= 2) {
        top = hexes[0];
        bot = hexes[1];
      }
    }
    if (TBState) {
      TBState.playTheme = Object.assign({}, TBState.playTheme || {}, {
        bgTop: top,
        bgBot: bot,
      });
    }
    if (C) {
      C._playBgTop = top;
      C._playBgBot = bot;
      C._bgCache = null;
    }
  }

  function _locCollName(item) {
    if (!item) return '';
    return C._t('coll_' + item.id, item.name);
  }

  function tryDropCollFromChest(tier) {
    const all = [...COLL_DEFS.avatar, ...COLL_DEFS.bg];
    const pool = all.filter((i) => i.unlock === 'chest' && i.tier === tier);
    const unowned = pool.filter((i) => !getCollection().owned.includes(i.id));
    if (!unowned.length || Math.random() > COLL_DROP_CHANCE) return null;
    const item = unowned[Math.floor(Math.random() * unowned.length)];
    ownCollItem(item.id);
    return item;
  }

  function checkLevelCollUnlocks(level) {
    const all = [...COLL_DEFS.avatar, ...COLL_DEFS.bg];
    all
      .filter((i) => i.unlock === 'level' && i.level === level)
      .forEach((i) => {
        if (ownCollItem(i.id))
          setTimeout(
            () =>
              C.showToast(
                '🎨',
                C._t('item_unlocked', 'Item Desbloqueado!'),
                C._t('item_unlocked_lv', '{name} — Nv.{n}')
                  .replace('{name}', _locCollName(i))
                  .replace('{n}', String(level))
              ),
            1200
          );
      });
  }

  let _collTab = 'avatar';

  function openCollectionModal() {
    _collTab = 'avatar';
    _renderCollModal();
  }

  function _renderCollModal() {
    const c = getCollection();
    const items = COLL_DEFS[_collTab];
    const isAv = _collTab === 'avatar';
    const cards = items
      .map((item) => {
        const owned = c.owned.includes(item.id);
        const equip = c.equipped[_collTab] === item.id;
        const cls = 'coll-item' + (equip ? ' equipped' : owned ? ' owned' : ' locked');
        const action = owned
          ? `data-action="equipColl" data-arg="${_collTab}" data-arg2="${item.id}"`
          : '';
        let iconHtml;
        if (isAv) {
          iconHtml = `<div class="coll-icon coll-skin-icon">${C.Mascot.previewHtml(item.skin || 'default')}</div>`;
        } else {
          iconHtml = `<div class="coll-icon"><div style="width:32px;height:22px;border-radius:6px;background:${item.gradient === 'none' ? '#11131c' : item.gradient};border:1px solid rgba(255,255,255,.2);display:inline-block;"></div></div>`;
        }
        let lockLabel = '';
        if (!owned) {
          if (item.unlock === 'chest') lockLabel = _locChestLabel(item.tier, item.tier);
          else if (item.unlock === 'level')
            lockLabel = C._t('level_num', 'Nv. {n}').replace('{n}', String(item.level));
          else if (item.unlock === 'world')
            lockLabel = item.world?.replace(/^[^\s]+\s/, '') || C._t('world_generic', 'Mundo');
        }
        const badge = equip
          ? `<div class="coll-badge coll-badge-eq">${C._t('coll_equipped', 'Equipado')}</div>`
          : !owned
            ? `<div class="coll-badge coll-badge-lock">${lockLabel}</div>`
            : '';
        return `<div class="${cls}" ${action}>${iconHtml}<div class="coll-name">${_locCollName(item)}</div>${badge}</div>`;
      })
      .join('');
    C.showGlobalModal(`
    <div class="coll-modal">
      <h3>${C._t('coll_title', '🎨 Skins do Blasty')}</h3>
      <div class="coll-tabs">
        <button class="coll-tab${_collTab === 'avatar' ? ' active' : ''}" data-action="collSetTab" data-arg="avatar">${C._t('coll_tab_skins', '🧡 Skins')}</button>
        <button class="coll-tab${_collTab === 'bg' ? ' active' : ''}" data-action="collSetTab" data-arg="bg">${C._t('coll_tab_bg', '🖼 Fundos')}</button>
      </div>
      <div class="coll-grid">${cards}</div>
      <button class="btn btn-g" style="width:100%;margin-top:12px;font-size:13px;" data-action="C.closeGlobalModal">Fechar</button>
    </div>
  `);
  }

  function _collSetTab(tab) {
    _collTab = tab;
    _renderCollModal();
  }
  function _equipColl(cat, id) {
    equipCollItem(cat, id);
    _renderCollModal();
  }
  // ────────────────────────────────────────────────────────────────

  /** @type {any} */
  const api = {
    init,
    syncWorldSkins,
    applyEquipped,
    unlockWorldSkin,
    openCollectionModal,
    tryDropCollFromChest,
    ownCollItem,
    equipCollItem,
    getCollection,
    saveCollection,
    checkLevelCollUnlocks,
    locChestLabel: _locChestLabel,
    locFeatName: _locFeatName,
    locCollName: _locCollName,
  };

  /** @type {any} */
  const g = global;
  g._locChestLabel = _locChestLabel;
  g._locFeatName = _locFeatName;
  g._locCollName = _locCollName;
  g.syncWorldSkins = syncWorldSkins;
  g.applyEquipped = applyEquipped;
  g.unlockWorldSkin = unlockWorldSkin;
  g.openCollectionModal = openCollectionModal;
  g._collSetTab = _collSetTab;
  g._equipColl = _equipColl;
  g.checkLevelCollUnlocks = checkLevelCollUnlocks;
  g.tryDropCollFromChest = tryDropCollFromChest;
  g.ownCollItem = ownCollItem;
  g.equipCollItem = equipCollItem;
  g.getCollection = getCollection;
  g.saveCollection = saveCollection;
  g.TBCollection = api;
})(typeof window !== 'undefined' ? window : globalThis);
