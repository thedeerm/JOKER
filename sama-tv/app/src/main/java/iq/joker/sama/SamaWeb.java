package iq.joker.sama;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

/** يبني WebView يعرض صفحة سما من ملفات التطبيق نفسه. */
final class SamaWeb {
    private static final String PAGE = "https://appassets.androidplatform.net/assets/sama/index.html";

    private SamaWeb() {}

    @SuppressLint("SetJavaScriptEnabled")
    static WebView create(Context context, boolean appMode) {
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(context))
                .build();

        WebView web = new WebView(context);
        web.setBackgroundColor(Color.BLACK);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setFocusable(appMode);
        web.setFocusableInTouchMode(appMode);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // لا نفتح أي رابط خارجي
            }
        });

        web.loadUrl(appMode ? PAGE + "?mode=app" : PAGE);
        return web;
    }
}
