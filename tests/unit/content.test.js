import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';
import { loadContentDataFromDisk } from '../helpers/content-fixture.js';

describe('TBContent', () => {
  it('carrega 85 níveis via loadFromData (Jardim expandido)', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    const data = loadContentDataFromDisk();
    TBContent.loadFromData(data);
    expect(TBContent.getLevelCount()).toBe(85);
    expect(TBContent.getTotalLevelCount()).toBe(85);
    expect(TBContent.getWorlds().length).toBe(7);
    expect(TBContent.getLevelsForWorld('garden').length).toBe(15);
  });

  it('indexa níveis por id estável', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    TBContent.loadFromData(loadContentDataFromDisk());
    expect(TBContent.getLevelById('garden-01').name).toBe('Aquecimento');
    expect(TBContent.getLevelById('garden-01').seed).toBe(1001);
    expect(TBContent.indexOfLevelId('legendary-10')).toBe(84);
  });

  it('catálogo global: índice 8=Ritmo, 15=Primeiro Gelo', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    TBContent.loadFromData(loadContentDataFromDisk());
    const levels = TBContent.getLevels();
    expect(levels[8].name).toBe('Ritmo');
    expect(levels[8].id).toBe('garden-09');
    expect(levels[15].name).toBe('Primeiro Gelo');
    expect(levels[15].id).toBe('forest-01');
  });

  it('WorldManager calcula progresso e desbloqueio (v2)', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    TBContent.loadFromData(loadContentDataFromDisk());
    const save = { unlocked: 16, stars: { 0: 3, 1: 2 } };
    expect(TBContent.isWorldUnlocked(save, 'garden')).toBe(true);
    expect(TBContent.isWorldUnlocked(save, 'forest')).toBe(true);
    expect(TBContent.isWorldUnlocked(save, 'mountain')).toBe(false);
    const prog = TBContent.getWorldProgress(save, 'garden');
    expect(prog.completed).toBe(15);
    expect(prog.pct).toBe(100);
  });

  it('lazy-load: meta primeiro, pack sob demanda', async () => {
    createMinimalDom();
    mountModule('tb-content.js');
    const data = loadContentDataFromDisk();
    TBContent.loadFromData({ ...data, levelPacks: [] });
    expect(TBContent.isMetaLoaded()).toBe(true);
    expect(TBContent.getLevelCount()).toBe(0);
    expect(TBContent.getTotalLevelCount()).toBe(85);
    TBContent.loadFromData(data);
    expect(TBContent.isPackLoaded('garden')).toBe(true);
  });

  it('missões carregadas de JSON', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    TBContent.loadFromData(loadContentDataFromDisk());
    expect(TBContent.getDailyMissionPool().length).toBeGreaterThan(20);
    expect(TBContent.getWeeklyMissionPool().length).toBeGreaterThan(10);
  });

  it('migrateSave v2 desloca unlocked após expansão do jardim', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    const save = { unlocked: 12, contentVersion: 1 };
    TBContent.migrateSave(save);
    expect(save.unlocked).toBe(17);
    expect(save.contentVersion).toBe(2);
  });

  it('EventManager retorna leaderboard id e track progress', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    TBContent.loadFromData(loadContentDataFromDisk());
    const id = TBContent.getEventLeaderboardId('halloween');
    expect(id).toMatch(/^event_halloween_/);
    const save = {};
    const r = TBContent.trackEventProgress(save, 'levels_won', 1);
    expect(r === null || r.event).toBeTruthy();
  });

  it('admin schema documentado', () => {
    createMinimalDom();
    mountModule('tb-content.js');
    TBContent.loadFromData(loadContentDataFromDisk());
    const schema = TBContent.getAdminSchema();
    expect(schema.remoteConfigKeys).toContain('activeEventId');
  });
});
