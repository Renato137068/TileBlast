package com.tileblast.game;

// ATENÇÃO: cópia de referência. O arquivo compilado é
// android/app/src/main/java/com/tileblast/game/TileBlastBridge.java.
// Alterações aqui não afetam o build — mantenha os dois em sincronia.

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Reference copy — keep in sync with android/app/.../TileBlastBridge.java */
public class TileBlastBridge implements PurchasesUpdatedListener {
    private static final String TAG = "TileBlastBridge";
    private static final String REWARDED_AD_UNIT = "ca-app-pub-3940256099942544/5224354917";
    private static final String INTERSTITIAL_AD_UNIT = "ca-app-pub-3940256099942544/1033173712";
    private static final Set<String> PRODUCT_IDS = new HashSet<>(Arrays.asList(
        "starter", "coins500", "coins1500", "coins4000", "noads"
    ));
    private static final Set<String> NON_CONSUMABLE = new HashSet<>(Arrays.asList("noads", "starter"));

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

    public TileBlastBridge(BridgeActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        MobileAds.initialize(activity, initStatus -> {
            loadRewardedAd();
            loadInterstitialAd();
        });
        initBilling();
    }

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
                }
            }
            @Override
            public void onBillingServiceDisconnected() {
                billingReady = false;
                mainHandler.postDelayed(() -> billingClient.startConnection(this), 3000);
            }
        });
    }

    private void queryProductDetails() {
        if (!billingReady || billingClient == null) return;
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : PRODUCT_IDS) {
            products.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        }
        billingClient.queryProductDetailsAsync(
            QueryProductDetailsParams.newBuilder().setProductList(products).build(),
            (result, list) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || list == null) return;
                productDetailsMap.clear();
                for (ProductDetails pd : list) productDetailsMap.put(pd.getProductId(), pd);
            });
    }

    @JavascriptInterface public void purchaseItem(String productId) {
        if (!PRODUCT_IDS.contains(productId)) { eval("onTileBlastPurchaseError('invalid_product')"); return; }
        activity.runOnUiThread(() -> {
            if (!billingReady) { eval("onTileBlastPurchaseError('billing_unavailable')"); return; }
            ProductDetails details = productDetailsMap.get(productId);
            if (details == null) { queryProductDetails(); eval("onTileBlastPurchaseError('product_not_loaded')"); return; }
            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(List.of(
                    BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).build()))
                .build();
            if (billingClient.launchBillingFlow(activity, flowParams).getResponseCode() != BillingClient.BillingResponseCode.OK) {
                eval("onTileBlastPurchaseError('launch_failed')");
            }
        });
    }

    @JavascriptInterface public void restorePurchases() { restorePurchasesInternal(true); }

    private void restorePurchasesInternal(boolean userInitiated) {
        if (!billingReady) { if (userInitiated) eval("onTileBlastRestore('[]')"); return; }
        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (result, purchases) -> {
                JSONArray owned = new JSONArray();
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                    for (Purchase p : purchases) {
                        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                        handlePurchase(p, false);
                        for (String id : p.getProducts()) if (PRODUCT_IDS.contains(id)) owned.put(id);
                    }
                }
                if (userInitiated || owned.length() > 0) eval("onTileBlastRestore(" + owned + ")");
            });
    }

    @Override public void onPurchasesUpdated(@NonNull BillingResult result, @Nullable List<Purchase> purchases) {
        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            eval("onTileBlastPurchaseError('cancelled')"); return;
        }
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            eval("onTileBlastPurchaseError('failed')"); return;
        }
        for (Purchase p : purchases) handlePurchase(p, true);
    }

    private void handlePurchase(Purchase purchase, boolean grant) {
        if (purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return;
        if (!purchase.isAcknowledged()) {
            billingClient.acknowledgePurchase(
                AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),
                br -> {});
        }
        for (String id : purchase.getProducts()) {
            if (!PRODUCT_IDS.contains(id)) continue;
            if (!NON_CONSUMABLE.contains(id)) {
                billingClient.consumeAsync(
                    ConsumeParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),
                    (br, t) -> {});
            }
            if (grant) {
                // O token é obrigatório para a verificação server-side (confirmIapPurchase).
                eval("onTileBlastPurchaseSuccess('" + id.replace("'", "\\'") + "','"
                    + purchase.getPurchaseToken().replace("'", "\\'") + "')");
                logEventNative("iap_purchase", "{\"item\":\"" + id + "\"}");
            }
        }
    }

    private void loadRewardedAd() {
        if (rewardedLoading) return;
        rewardedLoading = true;
        RewardedAd.load(activity, REWARDED_AD_UNIT, new AdRequest.Builder().build(), new RewardedAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull RewardedAd ad) { rewardedAd = ad; rewardedLoading = false; }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError e) { rewardedAd = null; rewardedLoading = false; }
        });
    }

    @JavascriptInterface public void showRewardedAd() {
        activity.runOnUiThread(() -> {
            if (rewardedAd == null) { loadRewardedAd(); eval("onTileBlastAdFailed()"); return; }
            rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdDismissedFullScreenContent() { rewardedAd = null; loadRewardedAd(); eval("onTileBlastAdDismissed()"); }
                @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) { rewardedAd = null; loadRewardedAd(); eval("onTileBlastAdFailed()"); }
            });
            rewardedAd.show(activity, r -> { logEventNative("ad_watched", "{\"type\":\"rewarded\"}"); eval("onTileBlastAdRewarded()"); });
        });
    }

    private void loadInterstitialAd() {
        if (interstitialLoading) return;
        interstitialLoading = true;
        InterstitialAd.load(activity, INTERSTITIAL_AD_UNIT, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(@NonNull InterstitialAd ad) { interstitialAd = ad; interstitialLoading = false; }
            @Override public void onAdFailedToLoad(@NonNull LoadAdError e) { interstitialAd = null; interstitialLoading = false; }
        });
    }

    @JavascriptInterface public void showInterstitialAd() {
        activity.runOnUiThread(() -> {
            if (interstitialAd == null) { loadInterstitialAd(); eval("onTileBlastInterstitialDismissed()"); return; }
            interstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override public void onAdDismissedFullScreenContent() { interstitialAd = null; loadInterstitialAd(); eval("onTileBlastInterstitialDismissed()"); }
                @Override public void onAdFailedToShowFullScreenContent(@NonNull AdError e) { interstitialAd = null; loadInterstitialAd(); eval("onTileBlastInterstitialDismissed()"); }
            });
            interstitialAd.show(activity);
            logEventNative("ad_watched", "{\"type\":\"interstitial\"}");
        });
    }

    @JavascriptInterface public void logEvent(String name, String paramsJson) { logEventNative(name, paramsJson); }

    private void logEventNative(String name, String paramsJson) {
        try {
            Class<?> faClass = Class.forName("com.google.firebase.analytics.FirebaseAnalytics");
            Object fa = faClass.getMethod("getInstance", android.content.Context.class).invoke(null, activity);
            Bundle bundle = new Bundle();
            if (paramsJson != null && !paramsJson.isEmpty()) {
                JSONObject obj = new JSONObject(paramsJson);
                var keys = obj.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    Object val = obj.get(key);
                    if (val instanceof Number) bundle.putDouble(key, ((Number) val).doubleValue());
                    else bundle.putString(key, String.valueOf(val));
                }
            }
            faClass.getMethod("logEvent", String.class, Bundle.class).invoke(fa, name, bundle);
        } catch (Exception e) { Log.d(TAG, "analytics: " + name); }
    }

    @JavascriptInterface public void exitApp() { activity.runOnUiThread(activity::finish); }

    void eval(String js) { activity.runOnUiThread(() -> webView.evaluateJavascript(js, null)); }
}
