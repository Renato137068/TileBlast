package com.tileblast.game;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.webkit.ValueCallback;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Smoke instrumentado: app abre e o WebView expõe TBRoadmap pronto.
 */
@RunWith(AndroidJUnit4.class)
public class TileBlastBootTest {

    @Test
    public void correctApplicationId() {
        assertEquals(
            "com.tileblast.game",
            InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName()
        );
    }

    @Test
    public void webViewBootsTileBlastModules() throws Exception {
        final CountDownLatch latch = new CountDownLatch(1);
        final AtomicReference<String> jsResult = new AtomicReference<>("false");

        ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class);
        Thread.sleep(5000);

        scenario.onActivity(activity -> {
            assertNotNull(activity.getBridge());
            assertNotNull(activity.getBridge().getWebView());
            activity.getBridge().getWebView().evaluateJavascript(
                "(function(){try{return !!(window.TBRoadmap&&TBRoadmap.isReady&&TBRoadmap.isReady());}catch(e){return false;}})()",
                new ValueCallback<String>() {
                    @Override
                    public void onReceiveValue(String value) {
                        jsResult.set(value);
                        latch.countDown();
                    }
                }
            );
        });

        assertTrue("WebView não respondeu a tempo", latch.await(15, TimeUnit.SECONDS));
        assertEquals("true", jsResult.get());
        scenario.close();
    }
}
