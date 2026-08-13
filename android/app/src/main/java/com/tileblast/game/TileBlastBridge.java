package com.tileblast.game;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Bridge JS ↔ Android: Google Play Billing, AdMob, Analytics.
 * Replace test AdMob IDs before production release.
 */
public class TileBlastBridge implements PurchasesUpdatedListener {

    private static final String TAG = "TileBlastBridge";

    // Google test units — replace in production
    private static final String REWARDED_AD_UNIT = "ca-app-pub-3988214303168302/5749924197";
    private static final String INTERSTITIAL_AD_UNIT = "ca-app-pub-3988214303168302/4436842524";

    private static final Set<String> PRODUCT_IDS = new HashSet<>(Arrays.asList(
        "starter", "coins500", "coins1500", "coins4000", "noads", "bppremium",
        "no_ads_monthly", "no_ads_yearly"
    ));
    private static final Set<String> SUBSCRIPTION_IDS = new HashSet<>(Arrays.asList(
        "no_ads_monthly", "no_ads_yearly"
    ));
    private static final Set<String> NON_CONSUMABLE = new HashSet<>(Arrays.asList(
        "noads", "starter", "bppremium", "no_ads_monthly", "no_ads_yearly"
    ));

    private final BridgeActivity activity;
    private final WebView webView;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private BillingClient billingClient;
    private boolean billingReady;
    private final Map<String, ProductDetails> productDetailsMap = new HashMap<>();

    private RewardedAd rewardedAd;
    private boolean rewardedLoading;
    private InterstitialAd interstitialAd;
    private boolean interstitialLoading;
    private boolean adsCanRequest;

    public TileBlastBridge(BridgeActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        requestConsentThenInitAds();
        initBilling();
    }

    private void requestConsentThenInitAds() {
        setAnalyticsCollectionEnabled(false);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        ConsentInformation consentInfo = UserMessagingPlatform.getConsentInformation(activity);
        consentInfo.requestConsentInfoUpdate(activity, params, () -> {
            UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> {
                adsCanRequest = consentInfo.canRequestAds();
                if (adsCanRequest) initMobileAds();
                else applyConsentResult(false);
            });
        }, requestError -> {
            adsCanRequest = consentInfo.canRequestAds();
            if (adsCanRequest) initMobileAds();
            else applyConsentResult(false);
        });
    }

    private void initMobileAds() {
        MobileAds.initialize(activity, initStatus -> {
            loadRewardedAd();
            loadInterstitialAd();
            applyConsentResult(true);
        });
    }

    private void applyConsentResult(boolean canRequest) {
        adsCanRequest = canRequest;
        setAnalyticsCollectionEnabled(canRequest);
        eval("window.onTileBlastConsentUpdate && window.onTileBlastConsentUpdate(" + (canRequest ? "true" : "false") + ")");
    }

    private void setAnalyticsCollectionEnabled(boolean enabled) {
        try {
            Class<?> faClass = Class.forName("com.google.firebase.analytics.FirebaseAnalytics");
            Object fa = faClass.getMethod("getInstance", android.content.Context.class)
                .invoke(null, activity);
            faClass.getMethod("setAnalyticsCollectionEnabled", boolean.class).invoke(fa, enabled);
        } catch (Exception e) {
            Log.d(TAG, "analytics collection flag: " + enabled);
        }
    }

    private boolean canShowAds() {
        if (adsCanRequest) return true;
        ConsentInformation info = UserMessagingPlatform.getConsentInformation(activity);
        return info != null && info.canRequestAds();
    }

    @JavascriptInterface
    public boolean canShowAdsBridge() {
        return canShowAds();
    }

    // ── Billing ───────────────────────────────────────────────────

    private void initBilling() {
        billingClient = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases()
            .build();
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    billingReady = true;
                    queryProductDetails();
                    restorePurchasesInternal(false);
                } else {
                    Log.w(TAG, "Billing setup failed: " + result.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                billingReady = false;
                mainHandler.postDelayed(() -> {
                    if (billingClient != null) billingClient.startConnection(this);
                }, 3000);
            }
        });
    }

    private void queryProductDetails() {
        if (!billingReady || billingClient == null) return;
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : PRODUCT_IDS) {
            String type = SUBSCRIPTION_IDS.contains(id)
                ? BillingClient.ProductType.SUBS
                : BillingClient.ProductType.INAPP;
            products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(type)
                .build());
        }
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build();
        billingClient.queryProductDetailsAsync(params, (result, list) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null) return;
            productDetailsMap.clear();
            for (ProductDetails pd : list) {
                productDetailsMap.put(pd.getProductId(), pd);
            }
            pushProductDetailsToJs();
        });
    }

    /** Extrai preço formatado (inapp ou 1ª fase da assinatura) para a UI JS. */
    private JSONObject productDetailsToJson(ProductDetails pd) throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", pd.getProductId());
        o.put("title", pd.getTitle() != null ? pd.getTitle() : "");
        o.put("description", pd.getDescription() != null ? pd.getDescription() : "");
        String formatted = "";
        String currency = "";
        long micros = 0L;
        ProductDetails.OneTimePurchaseOfferDetails oneTime = pd.getOneTimePurchaseOfferDetails();
        if (oneTime != null) {
            formatted = oneTime.getFormattedPrice();
            currency = oneTime.getPriceCurrencyCode();
            micros = oneTime.getPriceAmountMicros();
        } else {
            List<ProductDetails.SubscriptionOfferDetails> offers = pd.getSubscriptionOfferDetails();
            if (offers != null && !offers.isEmpty()) {
                List<ProductDetails.PricingPhase> phases =
                    offers.get(0).getPricingPhases().getPricingPhaseList();
                if (phases != null && !phases.isEmpty()) {
                    ProductDetails.PricingPhase phase = phases.get(0);
                    formatted = phase.getFormattedPrice();
                    currency = phase.getPriceCurrencyCode();
                    micros = phase.getPriceAmountMicros();
                }
            }
        }
        o.put("formattedPrice", formatted != null ? formatted : "");
        o.put("priceCurrencyCode", currency != null ? currency : "");
        o.put("priceAmountMicros", micros);
        return o;
    }

    private void pushProductDetailsToJs() {
        try {
            JSONArray arr = new JSONArray();
            for (ProductDetails pd : productDetailsMap.values()) {
                arr.put(productDetailsToJson(pd));
            }
            String json = arr.toString().replace("\\", "\\\\").replace("'", "\\'");
            eval("window.onTileBlastProductDetails && window.onTileBlastProductDetails('" + json + "')");
        } catch (JSONException e) {
            Log.w(TAG, "product details json failed", e);
        }
    }

    @JavascriptInterface
    public String getProductDetailsJson() {
        try {
            JSONArray arr = new JSONArray();
            for (ProductDetails pd : productDetailsMap.values()) {
                arr.put(productDetailsToJson(pd));
            }
            return arr.toString();
        } catch (JSONException e) {
            return "[]";
        }
    }

    @JavascriptInterface
    public void purchaseItem(String productId) {
        launchPurchase(productId, false);
    }

    @JavascriptInterface
    public void purchaseSubscription(String productId) {
        launchPurchase(productId, true);
    }

    private void launchPurchase(String productId, boolean subscription) {
        if (!PRODUCT_IDS.contains(productId)) {
            eval("onTileBlastPurchaseError('invalid_product')");
            return;
        }
        if (subscription && !SUBSCRIPTION_IDS.contains(productId)) {
            eval("onTileBlastPurchaseError('invalid_subscription')");
            return;
        }
        activity.runOnUiThread(() -> {
            if (!billingReady || billingClient == null) {
                eval("onTileBlastPurchaseError('billing_unavailable')");
                return;
            }
            ProductDetails details = productDetailsMap.get(productId);
            if (details == null) {
                queryProductDetails();
                eval("onTileBlastPurchaseError('product_not_loaded')");
                return;
            }
            List<BillingFlowParams.ProductDetailsParams> paramsList = new ArrayList<>();
            BillingFlowParams.ProductDetailsParams.Builder builder =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(details);
            if (SUBSCRIPTION_IDS.contains(productId)) {
                List<ProductDetails.SubscriptionOfferDetails> offers = details.getSubscriptionOfferDetails();
                if (offers == null || offers.isEmpty()) {
                    eval("onTileBlastPurchaseError('subscription_offer_missing')");
                    return;
                }
                builder.setOfferToken(offers.get(0).getOfferToken());
            }
            paramsList.add(builder.build());
            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(paramsList)
                .build();
            BillingResult result = billingClient.launchBillingFlow(activity, flowParams);
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                eval("onTileBlastPurchaseError('launch_failed')");
            }
        });
    }

    @JavascriptInterface
    public void restorePurchases() {
        restorePurchasesInternal(true);
    }

    private void restorePurchasesInternal(boolean userInitiated) {
        if (!billingReady || billingClient == null) {
            if (userInitiated) eval("onTileBlastRestore('[]')");
            return;
        }
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build(),
            (result, purchases) -> {
                JSONArray owned = new JSONArray();
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                    for (Purchase purchase : purchases) {
                        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                        handlePurchase(purchase, false);
                        for (String id : purchase.getProducts()) {
                            if (!PRODUCT_IDS.contains(id)) continue;
                            // Objeto {id, token}: o JS aceita esta forma e a legada (string).
                            try {
                                JSONObject entry = new JSONObject();
                                entry.put("id", id);
                                entry.put("token", purchase.getPurchaseToken());
                                owned.put(entry);
                            } catch (JSONException e) {
                                owned.put(id);
                            }
                        }
                    }
                }
                if (userInitiated) {
                    eval("onTileBlastRestore(" + owned.toString() + ")");
                } else if (owned.length() > 0) {
                    eval("onTileBlastRestore(" + owned.toString() + ")");
                }
            }
        );
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, @Nullable List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            eval("onTileBlastPurchaseError('cancelled')");
            return;
        }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            eval("onTileBlastPurchaseError('failed')");
            return;
        }
        for (Purchase purchase : purchases) {
            handlePurchase(purchase, true);
        }
    }

    private void handlePurchase(Purchase purchase, boolean grantReward) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            for (String productId : purchase.getProducts()) {
                if (!PRODUCT_IDS.contains(productId)) continue;
                eval("window.onTileBlastPurchasePending && window.onTileBlastPurchasePending('"
                    + jsEscape(productId) + "')");
            }
            return;
        }
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return;

        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams ack = AcknowledgePurchaseParams.newBuilder()
                .setPurchaseToken(purchase.getPurchaseToken())
                .build();
            billingClient.acknowledgePurchase(ack, br -> { });
        }

        for (String productId : purchase.getProducts()) {
            if (!PRODUCT_IDS.contains(productId)) continue;

            boolean consumable = !NON_CONSUMABLE.contains(productId) && !SUBSCRIPTION_IDS.contains(productId);
            if (consumable) {
                ConsumeParams consume = ConsumeParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
                billingClient.consumeAsync(consume, (br, token) -> { });
            }

            if (grantReward) {
                String safeId = jsEscape(productId);
                // O token é obrigatório para a verificação server-side (confirmIapPurchase).
                String safeToken = jsEscape(purchase.getPurchaseToken());
                eval("onTileBlastPurchaseSuccess('" + safeId + "','" + safeToken + "')");
                logEventNative("iap_purchase", "{\"item\":\"" + safeId + "\"}");
            }
        }
    }

    // ── AdMob ─────────────────────────────────────────────────────

    private void loadRewardedAd() {
        if (!canShowAds()) return;
        if (rewardedLoading) return;
        rewardedLoading = true;
        AdRequest request = new AdRequest.Builder().build();
        RewardedAd.load(activity, REWARDED_AD_UNIT, request, new RewardedAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull RewardedAd ad) {
                rewardedAd = ad;
                rewardedLoading = false;
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                Log.w(TAG, "Rewarded load failed: " + error.getMessage());
                rewardedAd = null;
                rewardedLoading = false;
            }
        });
    }

    @JavascriptInterface
    public void showRewardedAd() {
        activity.runOnUiThread(() -> {
            if (!canShowAds()) {
                eval("onTileBlastAdFailed()");
                return;
            }
            if (rewardedAd == null) {
                loadRewardedAd();
                eval("onTileBlastAdFailed()");
                return;
            }
            rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                    rewardedAd = null;
                    loadRewardedAd();
                    eval("onTileBlastAdDismissed()");
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError error) {
                    rewardedAd = null;
                    loadRewardedAd();
                    eval("onTileBlastAdFailed()");
                }
            });
            rewardedAd.show(activity, rewardItem -> {
                logEventNative("ad_watched", "{\"type\":\"rewarded\"}");
                eval("onTileBlastAdRewarded()");
            });
        });
    }

    private void loadInterstitialAd() {
        if (!canShowAds()) return;
        if (interstitialLoading) return;
        interstitialLoading = true;
        AdRequest request = new AdRequest.Builder().build();
        InterstitialAd.load(activity, INTERSTITIAL_AD_UNIT, request, new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull InterstitialAd ad) {
                interstitialAd = ad;
                interstitialLoading = false;
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError error) {
                interstitialAd = null;
                interstitialLoading = false;
            }
        });
    }

    @JavascriptInterface
    public void showInterstitialAd() {
        activity.runOnUiThread(() -> {
            if (!canShowAds()) {
                eval("onTileBlastInterstitialDismissed()");
                return;
            }
            if (interstitialAd == null) {
                loadInterstitialAd();
                eval("onTileBlastInterstitialDismissed()");
                return;
            }
            interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                    interstitialAd = null;
                    loadInterstitialAd();
                    eval("onTileBlastInterstitialDismissed()");
                }

                @Override
                public void onAdFailedToShowFullScreenContent(@NonNull AdError error) {
                    interstitialAd = null;
                    loadInterstitialAd();
                    eval("onTileBlastInterstitialDismissed()");
                }
            });
            interstitialAd.show(activity);
            logEventNative("ad_watched", "{\"type\":\"interstitial\"}");
        });
    }

    // ── Analytics ─────────────────────────────────────────────────

    @JavascriptInterface
    public void logEvent(String name, String paramsJson) {
        logEventNative(name, paramsJson);
    }

    private void logEventNative(String name, String paramsJson) {
        if (!canShowAds()) {
            Log.d(TAG, "analytics skipped (no UMP/GDPR consent): " + name);
            return;
        }
        try {
            Class<?> faClass = Class.forName("com.google.firebase.analytics.FirebaseAnalytics");
            Object fa = faClass.getMethod("getInstance", android.content.Context.class)
                .invoke(null, activity);
            Bundle bundle = new Bundle();
            if (paramsJson != null && !paramsJson.isEmpty()) {
                JSONObject obj = new JSONObject(paramsJson);
                java.util.Iterator<String> keys = obj.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    Object val = obj.get(key);
                    if (val instanceof Number) bundle.putDouble(key, ((Number) val).doubleValue());
                    else bundle.putString(key, String.valueOf(val));
                }
            }
            faClass.getMethod("logEvent", String.class, Bundle.class)
                .invoke(fa, name, bundle);
        } catch (Exception e) {
            Log.d(TAG, "analytics: " + name + " " + paramsJson);
        }
    }

    @JavascriptInterface
    public void vibrate(long durationMs) {
        Vibrator vibrator = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        long d = Math.max(1, Math.min(durationMs, 120));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
        } else {
            vibrator.vibrate(d);
        }
    }

    @JavascriptInterface
    public void vibratePattern(String csv) {
        if (csv == null || csv.isEmpty()) return;
        try {
            Vibrator vibrator = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator == null || !vibrator.hasVibrator()) return;
            String[] parts = csv.split(",");
            long[] pattern = new long[parts.length];
            for (int i = 0; i < parts.length; i++) {
                pattern[i] = Math.max(0, Long.parseLong(parts[i].trim()));
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vibrator.vibrate(pattern, -1);
            }
        } catch (Exception e) {
            Log.d(TAG, "vibratePattern failed");
        }
    }

    @JavascriptInterface
    public void exitApp() {
        activity.runOnUiThread(activity::finish);
    }

    void eval(String js) {
        activity.runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    /** Escapa uma string para interpolação segura dentro de aspas simples no JS. */
    private static String jsEscape(String raw) {
        if (raw == null) return "";
        return raw
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "")
            .replace("\r", "");
    }
}
