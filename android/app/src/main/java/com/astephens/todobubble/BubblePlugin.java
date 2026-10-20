package com.astephens.todobubble;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

/**
 * JS bridge for the floating bubble: window.Capacitor.Plugins.Bubble
 *   canDrawOverlays() -> { granted }
 *   requestPermission() -> { granted }   opens Android's "Display over other apps" screen
 *   show({ icon, count, colors })        starts the bubble and sends the app to the background
 *   hide()
 * The bubble also goes away automatically whenever the app comes back to the front.
 */
@CapacitorPlugin(name = "Bubble")
public class BubblePlugin extends Plugin {

    private boolean granted() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(getContext());
    }

    private void resolveGranted(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", granted());
        call.resolve(result);
    }

    @PluginMethod
    public void canDrawOverlays(PluginCall call) {
        resolveGranted(call);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (granted()) {
            resolveGranted(call);
            return;
        }
        Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName()));
        startActivityForResult(call, intent, "permissionResult");
    }

    @ActivityCallback
    private void permissionResult(PluginCall call, ActivityResult result) {
        resolveGranted(call);
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!granted()) {
            call.reject("Display over other apps is not allowed");
            return;
        }

        Intent intent = new Intent(getContext(), BubbleService.class);
        intent.putExtra(BubbleService.EXTRA_ICON, call.getString("icon", "✓"));
        intent.putExtra(BubbleService.EXTRA_COUNT, call.getInt("count", 0));
        intent.putExtra(BubbleService.EXTRA_COLORS, parseColors(call.getArray("colors", new JSArray())));
        ContextCompat.startForegroundService(getContext(), intent);

        call.resolve();
        // Step out of the way so the user sees their home screen / other apps
        getActivity().moveTaskToBack(true);
    }

    @PluginMethod
    public void hide(PluginCall call) {
        stopBubble();
        call.resolve();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        stopBubble();
    }

    private void stopBubble() {
        getContext().stopService(new Intent(getContext(), BubbleService.class));
    }

    private static int[] parseColors(JSArray array) {
        List<Integer> colors = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            try {
                colors.add(Color.parseColor(array.getString(i)));
            } catch (Exception ignored) {
                // Skip anything that isn't a #rrggbb color
            }
        }
        int[] out = new int[colors.size()];
        for (int i = 0; i < out.length; i++) out[i] = colors.get(i);
        return out;
    }
}
