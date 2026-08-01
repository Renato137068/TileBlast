import { describe, expect, it } from 'vitest';
import { mountModule } from '../helpers/load-module.js';

describe('firebase-config', () => {
  it('expõe FIREBASE_CONFIG após carga', () => {
    delete globalThis.FIREBASE_CONFIG;
    mountModule('firebase-config.js');
    expect(globalThis.FIREBASE_CONFIG).toBeTruthy();
    expect(globalThis.FIREBASE_CONFIG.apiKey).toBeTruthy();
  });
});
