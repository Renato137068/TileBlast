import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  delete globalThis.TBRoadmap;
  delete globalThis.TBFeatures;
  delete globalThis.TBGlobal;
  delete globalThis.TBLogic;
  delete globalThis.TBRemote;
  delete globalThis.TBFirebase;
  delete globalThis.TBPush;
  delete globalThis.APP_VERSION;
  globalThis.APP_VERSION = '1.4.6';
  if (globalThis.location) {
    globalThis.location.href = 'http://localhost:8080/';
    globalThis.location.search = '';
    globalThis.location.protocol = 'http:';
  }
});
