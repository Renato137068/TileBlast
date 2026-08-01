package com.tileblast.game;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        setupEdgeToEdge();
        setupBackHandler();
    }

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        if (webView == null) return;

        webView.addJavascriptInterface(
            new TileBlastBridge(this, webView),
            "AndroidBridge"
        );
        pushInsetsToWeb();
    }

    private void setupEdgeToEdge() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.parseColor("#0d0f18"));

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }

        ViewCompat.setOnApplyWindowInsetsListener(
            findViewById(android.R.id.content),
            (view, insets) -> {
                pushInsetsToWeb();
                return insets;
            }
        );
    }

    private void pushInsetsToWeb() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;

        Insets bars = ViewCompat.getRootWindowInsets(webView) != null
            ? ViewCompat.getRootWindowInsets(webView).getInsets(WindowInsetsCompat.Type.systemBars())
            : Insets.NONE;
        Insets ime = ViewCompat.getRootWindowInsets(webView) != null
            ? ViewCompat.getRootWindowInsets(webView).getInsets(WindowInsetsCompat.Type.ime())
            : Insets.NONE;

        String js = String.format(
            "window.__androidInsets&&window.__androidInsets(%d,%d,%d,%d,%d)",
            bars.top, bars.right, bars.bottom, bars.left, ime.bottom
        );
        webView.evaluateJavascript(js, null);
    }

    private void setupBackHandler() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge().getWebView();
                if (webView == null) {
                    finish();
                    return;
                }
                webView.evaluateJavascript(
                    "window.handleAppBack ? window.handleAppBack() : false",
                    value -> {
                        if (!"true".equals(value)) {
                            runOnUiThread(MainActivity.this::finish);
                        }
                    }
                );
            }
        });
    }
}
