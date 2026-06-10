package work.wintheday.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Expose native settings intent to JavaScript
        getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void openSettings() {
                runOnUiThread(() -> {
                    Intent intent = new Intent(
                        Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                        Uri.parse("package:" + getPackageName())
                    );
                    startActivity(intent);
                });
            }
        }, "AndroidNative");

        // Grant WebView audio capture requests when the OS permission is already held.
        // Capacitor's default BridgeWebChromeClient does not handle onPermissionRequest
        // for microphone, so getUserMedia() throws NotAllowedError even when RECORD_AUDIO
        // is granted at the OS level.
        getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                boolean hasAudio = ContextCompat.checkSelfPermission(
                    MainActivity.this, Manifest.permission.RECORD_AUDIO
                ) == PackageManager.PERMISSION_GRANTED;

                if (hasAudio) {
                    request.grant(request.getResources());
                } else {
                    super.onPermissionRequest(request);
                }
            }
        });
    }
}
