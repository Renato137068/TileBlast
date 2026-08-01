/**
 * Verificação de recibo Google Play (androidpublisher v3).
 * Credenciais: Secret Manager / env PLAY_SERVICE_ACCOUNT_JSON — nunca no git.
 */
'use strict';

const { PACKAGE_NAME_DEFAULT } = require('./economy-catalog.js');

/**
 * Lê JSON da service account (string ou já objeto).
 * @param {string|object|undefined|null} raw
 */
function parseServiceAccount(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return null;
  }
}

function loadCredentialsFromEnv() {
  return parseServiceAccount(
    process.env.PLAY_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );
}

function packageName() {
  return process.env.ANDROID_PACKAGE_NAME || process.env.PLAY_PACKAGE_NAME || PACKAGE_NAME_DEFAULT;
}

/**
 * @param {{
 *   productId: string,
 *   purchaseToken: string,
 *   kind: 'inapp'|'sub',
 *   packageName?: string,
 *   credentials?: object|null,
 *   googleapis?: { google: any },
 * }} opts
 */
async function verifyPlayPurchase(opts) {
  const productId = opts.productId;
  const purchaseToken = opts.purchaseToken;
  const kind = opts.kind || 'inapp';
  const pkg = opts.packageName || packageName();
  const credentials = opts.credentials !== undefined ? opts.credentials : loadCredentialsFromEnv();

  if (!credentials) {
    const err = new Error(
      'PLAY_SERVICE_ACCOUNT_JSON ausente. Configure o secret / env (ver docs/ECONOMIA-SERVER-SIDE.md).'
    );
    err.code = 'failed-precondition';
    throw err;
  }

  let googleApi = opts.googleapis;
  if (!googleApi) {
    try {
      googleApi = require('googleapis');
    } catch (e) {
      const err = new Error('Pacote googleapis não instalado em functions/');
      err.code = 'failed-precondition';
      throw err;
    }
  }

  const { google } = googleApi;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const androidpublisher = google.androidpublisher({ version: 'v3', auth });

  let data;
  if (kind === 'sub') {
    const res = await androidpublisher.purchases.subscriptions.get({
      packageName: pkg,
      subscriptionId: productId,
      token: purchaseToken,
    });
    data = res.data;
  } else {
    const res = await androidpublisher.purchases.products.get({
      packageName: pkg,
      productId,
      token: purchaseToken,
    });
    data = res.data;
  }
  return { packageName: pkg, data };
}

module.exports = {
  parseServiceAccount,
  loadCredentialsFromEnv,
  packageName,
  verifyPlayPurchase,
};
