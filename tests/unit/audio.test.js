import { describe, expect, it } from 'vitest';
import { createMinimalDom } from '../helpers/minimal-dom.js';
import { mountModule } from '../helpers/load-module.js';

describe('TBAudio', () => {
  it('expõe Sound e Haptic com a API esperada', () => {
    createMinimalDom();
    mountModule('tb-audio.js');
    expect(typeof TBAudio).toBe('object');
    expect(typeof TBAudio.Sound).toBe('object');
    expect(typeof TBAudio.Haptic).toBe('object');
    // Sound API
    [
      'blast',
      'combo',
      'win',
      'lose',
      'coin',
      'chest',
      'objComplete',
      'boardClear',
      'setMuted',
      'setVolume',
      'getVolume',
      'isMuted',
      'loadSample',
      'hasSample',
      'playSample',
    ].forEach((fn) => expect(typeof TBAudio.Sound[fn]).toBe('function'));
    // Haptic API
    ['light', 'medium', 'heavy', 'combo', 'win', 'lose'].forEach((fn) =>
      expect(typeof TBAudio.Haptic[fn]).toBe('function')
    );
  });

  it('setVolume faz clamp em [0,1] e isMuted reflete setMuted', () => {
    createMinimalDom();
    mountModule('tb-audio.js');
    TBAudio.Sound.setVolume(5);
    expect(TBAudio.Sound.getVolume()).toBe(1);
    TBAudio.Sound.setVolume(-2);
    expect(TBAudio.Sound.getVolume()).toBe(0);
    TBAudio.Sound.setMuted(true);
    expect(TBAudio.Sound.isMuted()).toBe(true);
  });

  it('cues não lançam mesmo sem Web Audio disponível', () => {
    createMinimalDom();
    mountModule('tb-audio.js');
    expect(() => TBAudio.Sound.blast(7)).not.toThrow();
    expect(() => TBAudio.Sound.fanfare(3)).not.toThrow();
    expect(() => TBAudio.Haptic.combo(9)).not.toThrow();
    expect(() => TBAudio.Sound.hasSample('x')).not.toThrow();
    expect(TBAudio.Sound.hasSample('x')).toBe(false);
  });
});
