package no.rodedager.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.webkit.*;
import android.view.*;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Offline packaged web app. Only bundled HTTPS-origin content may reach the bridge. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://" + HOST + "/assets/";
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String pendingExport;
    private String pendingMime;
    private String pendingName;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xff10283f);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return insets;
            });
            root.requestApplyInsets();
            getWindow().getInsetsController().setSystemBarsAppearance(0,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
        }
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.setBackgroundColor(0xff10283f);
        WebView.setWebContentsDebuggingEnabled(false);
        web.addJavascriptInterface(new ExportBridge(), "RodeDagerAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost()) || !uri.getPath().startsWith("/assets/")) return missing();
                String path = uri.getPath().substring(8);
                if (path.isEmpty()) path = "index.html";
                if (path.contains("..") || path.contains("\\")) return missing();
                try {
                    String mime = mime(path);
                    return new WebResourceResponse(mime, mime.startsWith("text/") || mime.equals("application/javascript") || mime.equals("application/json") ? "UTF-8" : null,
                        200, "OK", Collections.singletonMap("Cache-Control", "no-cache"), getAssets().open(path));
                } catch (IOException e) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if ("https".equals(uri.getScheme()) && HOST.equals(uri.getHost()) && uri.getPath().startsWith("/assets/")) return false;
                if (Arrays.asList("https", "http", "tel", "sms", "mailto", "webcal").contains(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception e) { Toast.makeText(MainActivity.this, "Ingen app kan åpne dette.", Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                try { startActivityForResult(intent, 12); }
                catch (Exception e) { callback.onReceiveValue(null); fileCallback = null; }
                return true;
            }
        });
        web.loadUrl(BASE + "index.html");
    }
    private static String mime(String path) {
        if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".ics")) return "text/calendar";
        return "application/octet-stream";
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private final class ExportBridge {
        @JavascriptInterface public void saveFile(String text, String name, String mime) {
            if (text == null || text.length() > 5000000 || !(mime.equals("application/json") || mime.equals("text/calendar"))) return;
            runOnUiThread(() -> {
                if (pendingExport != null || !web.getUrl().startsWith(BASE)) return;
                pendingExport = text; pendingName = name.replaceAll("[^a-zA-Z0-9._-]", "_"); pendingMime = mime;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(pendingMime);
                intent.putExtra(Intent.EXTRA_TITLE, pendingName);
                try { startActivityForResult(intent, 11); }
                catch (Exception e) { pendingExport = null; Toast.makeText(MainActivity.this, "Kunne ikke lagre filen.", Toast.LENGTH_LONG).show(); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 12 && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null ? new Uri[]{data.getData()} : null);
            fileCallback = null;
        }
        if (request == 11) {
            if (result == RESULT_OK && data != null && pendingExport != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    out.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this, "Filen er lagret.", Toast.LENGTH_SHORT).show();
                } catch (IOException e) { Toast.makeText(this, "Kunne ikke lagre filen.", Toast.LENGTH_LONG).show(); }
            }
            pendingExport = null;
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(function(){if(document.getElementById('sheet').classList.contains('is-open')){history.back();return 'handled'}if(location.hash!=='#idag'){location.hash='idag';return 'handled'}return 'exit'})()", result -> {
            if ("\"exit\"".equals(result)) super.onBackPressed();
        });
    }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if(web != null) web.onResume(); }
    @Override protected void onDestroy() { if(fileCallback != null) fileCallback.onReceiveValue(null); web.removeJavascriptInterface("RodeDagerAndroid"); web.destroy(); super.onDestroy(); }
}
