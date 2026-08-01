/**
 * Referência para WebView no app Android (Google Play).
 * Carregue tile_blast.html e injete o bridge:
 *
 *   webView.addJavascriptInterface(AndroidBridgeImpl(...), "AndroidBridge")
 *
 * Callbacks JS (chame via webView.evaluateJavascript):
 *   onTileBlastPurchaseSuccess('starter')
 *   onTileBlastPurchaseError('cancelled')
 *   onTileBlastAdRewarded()
 *   onTileBlastAdDismissed()
 *
 * Product IDs (Google Play Console): starter, coins500, coins1500, coins4000, noads
 */
class AndroidBridgeImpl(
    private val billing: PlayBillingClient,
    private val ads: RewardedAdLoader,
    private val webView: WebView
) {
    @JavascriptInterface
    fun purchaseItem(productId: String) {
        billing.launchPurchase(productId) { result ->
            when (result) {
                is PurchaseSuccess -> eval("onTileBlastPurchaseSuccess('$productId')")
                is PurchaseError -> eval("onTileBlastPurchaseError('${result.message}')")
            }
        }
    }

    @JavascriptInterface
    fun showRewardedAd() {
        ads.show(
            onReward = { eval("onTileBlastAdRewarded()") },
            onDismiss = { eval("onTileBlastAdDismissed()") }
        )
    }

    private fun eval(js: String) {
        webView.post { webView.evaluateJavascript(js, null) }
    }
}
