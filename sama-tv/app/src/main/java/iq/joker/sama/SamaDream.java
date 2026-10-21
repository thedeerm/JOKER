package iq.joker.sama;

import android.service.dreams.DreamService;
import android.webkit.WebView;

/** شاشة التوقف: ساعة وطقس الزعفرانية مع سماء متحركة. */
public class SamaDream extends DreamService {
    private WebView web;

    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setInteractive(false); // أي زر بالريموت يطلع من شاشة التوقف
        setFullscreen(true);
        setScreenBright(true);
        web = SamaWeb.create(this, false);
        setContentView(web);
    }

    @Override
    public void onDreamingStarted() {
        super.onDreamingStarted();
        if (web != null) web.onResume();
    }

    @Override
    public void onDreamingStopped() {
        if (web != null) web.onPause();
        super.onDreamingStopped();
    }

    @Override
    public void onDetachedFromWindow() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDetachedFromWindow();
    }
}
