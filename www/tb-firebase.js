/**
 * Tile Blast — Firebase Auth + Firestore (cloud save + ranking global)
 * + Callable Functions (fundação economia server-side).
 * Requer firebase-config.js com credenciais válidas.
 * Ver docs/ECONOMIA-SERVER-SIDE.md.
 */
(function (global) {
  'use strict';

  const CDN = '10.14.1';
  const CALLABLE_QUEUE_KEY = 'tb_callable_queue';
  const CALLABLE_QUEUE_MAX = 40;
  let ready = false;
  let booting = false;
  let functionsReady = false;
  let db = null;
  let auth = null;
  let uid = null;
  let functions = null;

  function configValid() {
    const c = global.FIREBASE_CONFIG;
    return !!(c && c.apiKey && !String(c.apiKey).includes('YOUR'));
  }

  // Anti-cheat: um save detectado como adulterado não deve contaminar a nuvem
  // (sobrescrevendo um save legítimo) nem pontuar em rankings. O jogo local
  // continua funcionando — a reação é limitada ao que sai do dispositivo.
  function isTampered() {
    return !!global.__saveTampered;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function boot() {
    if (ready || booting) return ready;
    if (!configValid()) return false;
    booting = true;
    try {
      await loadScript('https://www.gstatic.com/firebasejs/' + CDN + '/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/' + CDN + '/firebase-auth-compat.js');
      await loadScript(
        'https://www.gstatic.com/firebasejs/' + CDN + '/firebase-firestore-compat.js'
      );
      if (!global.firebase) throw new Error('firebase not loaded');
      if (!global.firebase.apps.length) {
        global.firebase.initializeApp(global.FIREBASE_CONFIG);
      }
      auth = global.firebase.auth();
      db = global.firebase.firestore();
      const cred = await auth.signInAnonymously();
      uid = cred.user.uid;
      ready = true;
      return true;
    } catch (e) {
      console.warn('[TBFirebase]', e);
      return false;
    } finally {
      booting = false;
    }
  }

  async function ensureFunctions() {
    if (functionsReady && functions) return true;
    if (!(await boot())) return false;
    try {
      await loadScript(
        'https://www.gstatic.com/firebasejs/' + CDN + '/firebase-functions-compat.js'
      );
      if (!global.firebase || !global.firebase.functions) return false;
      functions = global.firebase.functions();
      functionsReady = true;
      return true;
    } catch (e) {
      console.warn('[TBFirebase] functions SDK', e);
      return false;
    }
  }

  function readQueue() {
    try {
      const raw = localStorage.getItem(CALLABLE_QUEUE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeQueue(arr) {
    try {
      localStorage.setItem(CALLABLE_QUEUE_KEY, JSON.stringify(arr.slice(-CALLABLE_QUEUE_MAX)));
    } catch (e) {
      /* quota / private mode */
    }
  }

  /** Gera id curto para idempotência (não criptográfico). */
  function newRequestId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Chama uma Callable Function. Nunca lança — fallback gracioso.
   * @returns {Promise<{ok:boolean, result?:any, reason?:string, error?:string}>}
   */
  async function callFunction(name, data) {
    if (!name || typeof name !== 'string') {
      return { ok: false, reason: 'bad_name' };
    }
    if (!configValid()) return { ok: false, reason: 'no_config' };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { ok: false, reason: 'offline' };
    }
    try {
      if (!(await ensureFunctions())) return { ok: false, reason: 'unavailable' };
      const callable = functions.httpsCallable(name);
      const res = await callable(data || {});
      return { ok: true, result: res && res.data !== undefined ? res.data : res };
    } catch (e) {
      const msg = e && e.message ? String(e.message) : 'error';
      console.warn('[TBFirebase] callFunction', name, msg);
      return { ok: false, reason: 'error', error: msg };
    }
  }

  /**
   * Enfileira chamada para sync posterior (offline / falha).
   * Sempre retorna; não bloqueia gameplay.
   */
  function enqueueCallable(name, data) {
    if (!name) return { ok: false, reason: 'bad_name' };
    const payload = Object.assign({}, data || {});
    if (!payload.requestId) payload.requestId = newRequestId();
    const q = readQueue();
    q.push({ name: name, data: payload, enqueuedAt: Date.now() });
    writeQueue(q);
    return { ok: true, requestId: payload.requestId, queued: q.length };
  }

  /**
   * Shadow / dual-write IAP: enfileira confirmIapPurchase após compra nativa.
   * Não trava o jogo — offline / sem config → fica na fila.
   */
  function queueIapConfirm(productId, purchaseToken) {
    try {
      if (!productId || !purchaseToken) return { ok: false, reason: 'bad_args' };
      enqueueCallable('confirmIapPurchase', {
        productId: String(productId),
        purchaseToken: String(purchaseToken),
        clientAt: Date.now(),
      });
      Promise.resolve()
        .then(function () {
          return flushCallableQueue();
        })
        .catch(function () {});
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'error' };
    }
  }

  /**
   * Hook de reconciliação: o shell (tb-main) registra com
   * TBFirebase.onEconomyReconcile(fn). Chamado após ACK de confirmIapPurchase.
   */
  let _economyReconcile = null;
  function onEconomyReconcile(fn) {
    _economyReconcile = typeof fn === 'function' ? fn : null;
  }

  function notifyEconomyReconcile(result) {
    if (!_economyReconcile || !result) return;
    try {
      _economyReconcile(result);
    } catch (e) {
      /* never break flush */
    }
  }

  /**
   * Tenta enviar a fila. Itens que falham por offline/unavailable permanecem.
   * Duplicates / erros definitivos (resource-exhausted) são descartados.
   */
  async function flushCallableQueue() {
    const q = readQueue();
    if (!q.length) return { ok: true, sent: 0, left: 0 };
    if (!configValid()) return { ok: false, reason: 'no_config', sent: 0, left: q.length };

    const remain = [];
    let sent = 0;
    for (let i = 0; i < q.length; i++) {
      const item = q[i];
      const res = await callFunction(item.name, item.data);
      if (res.ok) {
        sent++;
        if (item.name === 'confirmIapPurchase' && res.result) {
          notifyEconomyReconcile(res.result);
        }
        continue;
      }
      if (res.reason === 'offline' || res.reason === 'unavailable' || res.reason === 'no_config') {
        remain.push(item);
        for (let j = i + 1; j < q.length; j++) remain.push(q[j]);
        break;
      }
      console.warn('[TBFirebase] drop queue item', item.name, res.reason, res.error);
    }
    writeQueue(remain);
    return { ok: true, sent: sent, left: remain.length };
  }

  /**
   * Shadow mode (fase 1): enfileira grantAdReward sem alterar saldo local.
   * Seguro chamar após recordAdWatch — não trava se offline/sem config.
   */
  function queueAdGrantShadow(kind) {
    try {
      enqueueCallable('grantAdReward', {
        kind: kind || 'coins',
        clientAt: Date.now(),
        shadow: true,
      });
      // best-effort flush; ignore promise rejection
      Promise.resolve()
        .then(function () {
          return flushCallableQueue();
        })
        .catch(function () {});
    } catch (e) {
      /* never break game loop */
    }
  }

  function savesRef() {
    return db.collection('saves').doc(uid);
  }

  async function pushSave(jsonStr, playerName) {
    if (isTampered()) return { ok: false, reason: 'tampered' };
    if (!(await boot())) return { ok: false, reason: 'offline' };
    const data = {
      data: jsonStr,
      playerName: playerName || 'Jogador',
      updatedAt: global.firebase.firestore.FieldValue.serverTimestamp(),
      v: global.APP_VERSION || '1.0',
    };
    await savesRef().set(data, { merge: true });
    return { ok: true, at: Date.now() };
  }

  async function pullSave() {
    if (!(await boot())) return null;
    const snap = await savesRef().get();
    if (!snap.exists) return null;
    const d = snap.data();
    return {
      data: d.data,
      playerName: d.playerName,
      updatedAt: d.updatedAt && d.updatedAt.toMillis ? d.updatedAt.toMillis() : 0,
    };
  }

  function lbCollection(mode) {
    const day = Math.floor(Date.now() / 86400000);
    const id = mode === 'infinite' ? 'infinite_all' : 'daily_' + day;
    return db.collection('leaderboards').doc(id).collection('scores');
  }

  function eventLbCollection(eventLeaderboardId) {
    return db.collection('leaderboards').doc(eventLeaderboardId).collection('scores');
  }

  async function submitScore(mode, score, name) {
    if (isTampered()) return false;
    if (!(await boot()) || !score) return false;
    const res = await callFunction('submitScore', {
      mode: mode === 'infinite' ? 'infinite' : 'daily',
      score: Math.floor(Number(score)),
      name: String(name == null ? '' : name).slice(0, 16),
    });
    return !!(res && res.ok && res.result && res.result.ok !== false);
  }

  /** Ranking de eventos sazonais — doc id via TBContent.getEventLeaderboardId(eventId) */
  async function submitEventScore(eventLeaderboardId, score, name) {
    if (isTampered()) return false;
    if (!(await boot()) || !score || !eventLeaderboardId) return false;
    const res = await callFunction('submitEventScore', {
      eventLeaderboardId: String(eventLeaderboardId),
      score: Math.floor(Number(score)),
      name: String(name == null ? '' : name).slice(0, 16),
    });
    return !!(res && res.ok && res.result && res.result.ok !== false);
  }

  async function fetchEventTop(eventLeaderboardId, limit) {
    if (!(await boot()) || !eventLeaderboardId) return [];
    const snap = await eventLbCollection(eventLeaderboardId)
      .orderBy('score', 'desc')
      .limit(limit || 15)
      .get();
    return snap.docs.map(function (doc, i) {
      var d = doc.data();
      return { rank: i + 1, name: d.name || '???', score: d.score || 0, me: d.uid === uid };
    });
  }

  async function fetchTop(mode, limit) {
    if (!(await boot())) return [];
    const snap = await lbCollection(mode)
      .orderBy('score', 'desc')
      .limit(limit || 15)
      .get();
    return snap.docs.map((doc, i) => {
      const d = doc.data();
      return {
        rank: i + 1,
        name: d.name || '???',
        score: d.score || 0,
        me: d.uid === uid,
      };
    });
  }

  async function syncWithLocal(localKey, ldFn, svFn, getName) {
    const localRaw = localStorage.getItem(localKey);
    const localParsed = localRaw ? JSON.parse(localRaw) : null;
    const localAt = localParsed && localParsed.cloudAt ? localParsed.cloudAt : 0;

    const cloud = await pullSave();
    if (!cloud) {
      if (localRaw && !isTampered()) {
        await pushSave(localRaw, getName());
        return { action: 'uploaded' };
      }
      return { action: 'empty' };
    }

    // Save local adulterado: nunca sobe; restaura o estado legítimo da nuvem.
    if (isTampered()) {
      return { action: 'download', data: cloud.data, playerName: cloud.playerName };
    }

    if (!localRaw || cloud.updatedAt > localAt + 5000) {
      return { action: 'download', data: cloud.data, playerName: cloud.playerName };
    }
    if (localRaw) {
      await pushSave(localRaw, getName());
      return { action: 'uploaded' };
    }
    return { action: 'noop' };
  }

  async function createChallenge(payload) {
    if (!(await boot())) return null;
    const res = await callFunction('createChallenge', {
      levelIdx: Math.floor(Number(payload && payload.levelIdx)),
      seed: payload && payload.seed === 'master' ? 'master' : 'normal',
    });
    return res && res.ok ? res.result : null;
  }

  async function claimChallenge(id, nonce) {
    if (!(await boot())) return null;
    const res = await callFunction('claimChallenge', {
      id: String(id || ''),
      nonce: String(nonce || ''),
    });
    return res && res.ok ? res.result : null;
  }

  async function deleteSocialData() {
    if (!(await boot())) return { ok: false, reason: 'offline' };
    const res = await callFunction('deleteSocialData', {});
    return res && res.ok ? res.result || { ok: true } : { ok: false };
  }

  /**
   * TB-101: telemetria de erro JS. Nunca lança.
   * Reusa a fila genérica → callable `client_error` (mesmo path de IAP/ads).
   * Sem config Firebase: permanece na fila local.
   */
  function reportClientError(payload) {
    try {
      const data = Object.assign({ event: 'client_error', clientAt: Date.now() }, payload || {});
      enqueueCallable('client_error', data);
      Promise.resolve()
        .then(function () {
          return flushCallableQueue();
        })
        .catch(function () {});
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'error' };
    }
  }

  global.TBFirebase = {
    boot,
    isReady: () => ready,
    getUid: () => uid,
    pushSave,
    pullSave,
    submitScore,
    submitEventScore,
    fetchTop,
    fetchEventTop,
    syncWithLocal,
    configValid,
    callFunction,
    enqueueCallable,
    flushCallableQueue,
    queueAdGrantShadow,
    queueIapConfirm,
    onEconomyReconcile,
    newRequestId,
    createChallenge,
    claimChallenge,
    deleteSocialData,
    reportClientError,
  };
})(typeof window !== 'undefined' ? window : globalThis);
