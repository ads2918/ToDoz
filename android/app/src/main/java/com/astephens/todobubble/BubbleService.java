package com.astephens.todobubble;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.Outline;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewOutlineProvider;
import android.view.WindowManager;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.LinearInterpolator;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Draws the to-do bubble on top of other apps (like chat heads).
 * Only the bubble itself is a window, so everything else on screen stays usable.
 * Tap it to open the app, drag it around (it snaps to the nearest side),
 * or drag it onto the ✕ at the bottom to close it.
 */
public class BubbleService extends Service {

    public static final String EXTRA_ICON = "icon";
    public static final String EXTRA_COUNT = "count";
    public static final String EXTRA_COLORS = "colors";

    private static final String CHANNEL_ID = "bubble";
    private static final int NOTIFICATION_ID = 4242;
    private static final String PREFS = "bubble";

    private WindowManager windowManager;
    private FrameLayout bubble;
    private WindowManager.LayoutParams bubbleParams;
    private View colorDisc;
    private TextView iconView;
    private TextView badgeView;
    private ObjectAnimator spinner;

    private TextView closeTarget;
    private WindowManager.LayoutParams closeParams;

    private float density;
    private int bubbleSize;
    private int windowSize;
    private int edgeMargin;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startAsForeground();
        if (bubble == null) createBubble();
        if (intent != null) applyLook(intent);
        // If Android kills us, don't bring the bubble back on its own.
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (spinner != null) spinner.cancel();
        removeCloseTarget();
        if (bubble != null) {
            try {
                windowManager.removeView(bubble);
            } catch (IllegalArgumentException ignored) {
                // Already gone
            }
            bubble = null;
        }
        super.onDestroy();
    }

    // ---------- Foreground notification (keeps Android from killing the bubble) ----------

    private void startAsForeground() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Floating bubble", NotificationManager.IMPORTANCE_MIN);
            channel.setDescription("Shown while the to-do bubble is floating over other apps");
            channel.setShowBadge(false);
            nm.createNotificationChannel(channel);
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_check)
            .setContentTitle("To Doz is floating")
            .setContentText("Tap to open your list")
            .setContentIntent(openAppIntent())
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();

        int type = Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
    }

    private PendingIntent openAppIntent() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (launch == null) launch = new Intent(this, MainActivity.class);
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        return PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    // ---------- Building the bubble ----------

    private int dp(float value) {
        return Math.round(value * density);
    }

    private static int overlayType() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
    }

    private void createBubble() {
        windowManager = getSystemService(WindowManager.class);
        density = getResources().getDisplayMetrics().density;
        bubbleSize = dp(60);
        // Padding on every side for the badge and the drop shadow; otherwise the window
        // edge clips the shadow into a visible square around the bubble.
        int pad = dp(14);
        windowSize = bubbleSize + pad * 2;
        edgeMargin = 0;

        bubble = new FrameLayout(this);
        bubble.setClipChildren(false);

        // Round "face" of the bubble: spinning color disc, white ring, icon
        FrameLayout face = new FrameLayout(this);
        FrameLayout.LayoutParams faceLp = new FrameLayout.LayoutParams(bubbleSize, bubbleSize, Gravity.CENTER);
        face.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View view, Outline outline) {
                outline.setOval(0, 0, view.getWidth(), view.getHeight());
            }
        });
        face.setClipToOutline(true);
        face.setElevation(dp(4));

        colorDisc = new View(this);
        face.addView(colorDisc, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        View ring = new View(this);
        GradientDrawable ringShape = new GradientDrawable();
        ringShape.setShape(GradientDrawable.OVAL);
        ringShape.setColor(Color.TRANSPARENT);
        ringShape.setStroke(dp(3), Color.WHITE);
        ring.setBackground(ringShape);
        face.addView(ring, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        iconView = new TextView(this);
        iconView.setGravity(Gravity.CENTER);
        iconView.setTextColor(Color.WHITE);
        iconView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 26);
        iconView.setTypeface(Typeface.DEFAULT_BOLD);
        iconView.setShadowLayer(dp(3), 0, dp(1), 0x99000000);
        face.addView(iconView, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        bubble.addView(face, faceLp);

        // Red count badge in the top-right corner
        badgeView = new TextView(this);
        badgeView.setGravity(Gravity.CENTER);
        badgeView.setTextColor(Color.WHITE);
        badgeView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        badgeView.setTypeface(Typeface.DEFAULT_BOLD);
        badgeView.setMinWidth(dp(22));
        badgeView.setPadding(dp(5), 0, dp(5), 0);
        badgeView.setElevation(0); // a shadow here would be clipped by the window edge
        GradientDrawable badgeShape = new GradientDrawable();
        badgeShape.setColor(0xFFE53E3E);
        badgeShape.setCornerRadius(dp(11));
        badgeShape.setStroke(dp(2), Color.WHITE);
        badgeView.setBackground(badgeShape);
        FrameLayout.LayoutParams badgeLp = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, dp(22), Gravity.TOP | Gravity.END);
        // Straddle the circle's top-right edge
        badgeLp.rightMargin = pad - dp(13);
        badgeLp.topMargin = pad - dp(11);
        bubble.addView(badgeView, badgeLp);

        // Only the bubble's own small square is a window: touches anywhere else go to the apps underneath.
        bubbleParams = new WindowManager.LayoutParams(
            windowSize, windowSize, overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT);
        bubbleParams.gravity = Gravity.TOP | Gravity.START;

        DisplayMetrics screen = getResources().getDisplayMetrics();
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        bubbleParams.x = prefs.getInt("x", screen.widthPixels - windowSize - edgeMargin);
        bubbleParams.y = prefs.getInt("y", (int) (screen.heightPixels * 0.6f));
        clampToScreen();

        bubble.setOnTouchListener(new DragListener());
        windowManager.addView(bubble, bubbleParams);

        // Little pop-in animation
        bubble.setScaleX(0f);
        bubble.setScaleY(0f);
        bubble.animate().scaleX(1f).scaleY(1f).setDuration(250).setInterpolator(new DecelerateInterpolator()).start();
    }

    private void applyLook(Intent intent) {
        String icon = intent.getStringExtra(EXTRA_ICON);
        iconView.setText(icon == null || icon.isEmpty() ? "✓" : icon);

        int count = intent.getIntExtra(EXTRA_COUNT, 0);
        badgeView.setVisibility(count > 0 ? View.VISIBLE : View.GONE);
        badgeView.setText(count > 99 ? "99+" : String.valueOf(count));

        int[] colors = intent.getIntArrayExtra(EXTRA_COLORS);
        if (colors == null || colors.length == 0) colors = new int[] { 0xFF2B6CB0 };

        GradientDrawable disc = new GradientDrawable();
        disc.setShape(GradientDrawable.OVAL);
        if (colors.length == 1) {
            disc.setColor(colors[0]);
        } else {
            // Repeat the first color at the end so the sweep loops without a seam
            int[] loop = new int[colors.length + 1];
            System.arraycopy(colors, 0, loop, 0, colors.length);
            loop[colors.length] = colors[0];
            disc.setGradientType(GradientDrawable.SWEEP_GRADIENT);
            disc.setColors(loop);
        }
        colorDisc.setBackground(disc);

        // Multi-color themes slowly swirl around
        if (spinner != null) spinner.cancel();
        colorDisc.setRotation(0);
        if (colors.length > 1) {
            spinner = ObjectAnimator.ofFloat(colorDisc, View.ROTATION, 0f, 360f);
            spinner.setDuration(5000);
            spinner.setRepeatCount(ValueAnimator.INFINITE);
            spinner.setInterpolator(new LinearInterpolator());
            spinner.start();
        }
    }

    private void clampToScreen() {
        DisplayMetrics screen = getResources().getDisplayMetrics();
        bubbleParams.x = Math.max(0, Math.min(bubbleParams.x, screen.widthPixels - windowSize));
        bubbleParams.y = Math.max(0, Math.min(bubbleParams.y, screen.heightPixels - windowSize));
    }

    // ---------- Tap / drag / close ----------

    private void openApp() {
        try {
            openAppIntent().send();
        } catch (PendingIntent.CanceledException ignored) {
            // Nothing sensible to do
        }
        stopSelf();
    }

    private class DragListener implements View.OnTouchListener {
        private float downX, downY;
        private int startX, startY;
        private boolean dragging;
        private final int touchSlop = ViewConfiguration.get(BubbleService.this).getScaledTouchSlop();

        @Override
        public boolean onTouch(View v, MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    downX = e.getRawX();
                    downY = e.getRawY();
                    startX = bubbleParams.x;
                    startY = bubbleParams.y;
                    dragging = false;
                    bubble.animate().scaleX(0.9f).scaleY(0.9f).setDuration(80).start();
                    return true;

                case MotionEvent.ACTION_MOVE:
                    float dx = e.getRawX() - downX;
                    float dy = e.getRawY() - downY;
                    if (!dragging && Math.hypot(dx, dy) > touchSlop) {
                        dragging = true;
                        showCloseTarget();
                    }
                    if (dragging) {
                        bubbleParams.x = startX + (int) dx;
                        bubbleParams.y = startY + (int) dy;
                        clampToScreen();
                        windowManager.updateViewLayout(bubble, bubbleParams);
                        highlightCloseTarget(isOverCloseTarget());
                    }
                    return true;

                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    bubble.animate().scaleX(1f).scaleY(1f).setDuration(120).start();
                    boolean wasDragging = dragging;
                    boolean close = wasDragging && isOverCloseTarget();
                    removeCloseTarget();
                    if (close) {
                        stopSelf();
                    } else if (wasDragging) {
                        snapToEdge();
                    } else if (e.getActionMasked() == MotionEvent.ACTION_UP) {
                        openApp();
                    }
                    return true;
            }
            return false;
        }
    }

    private void snapToEdge() {
        DisplayMetrics screen = getResources().getDisplayMetrics();
        boolean left = bubbleParams.x + windowSize / 2 < screen.widthPixels / 2;
        int targetX = left ? edgeMargin : screen.widthPixels - windowSize - edgeMargin;
        ValueAnimator anim = ValueAnimator.ofInt(bubbleParams.x, targetX);
        anim.setDuration(220);
        anim.setInterpolator(new DecelerateInterpolator());
        anim.addUpdateListener(a -> {
            if (bubble == null) return;
            bubbleParams.x = (int) a.getAnimatedValue();
            windowManager.updateViewLayout(bubble, bubbleParams);
        });
        anim.start();
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
            .putInt("x", targetX)
            .putInt("y", bubbleParams.y)
            .apply();
    }

    private void showCloseTarget() {
        if (closeTarget != null) return;
        closeTarget = new TextView(this);
        closeTarget.setText("✕");
        closeTarget.setGravity(Gravity.CENTER);
        closeTarget.setTextColor(Color.WHITE);
        closeTarget.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        GradientDrawable shape = new GradientDrawable();
        shape.setShape(GradientDrawable.OVAL);
        shape.setColor(0xCC1F2430);
        shape.setStroke(dp(2), 0x88FFFFFF);
        closeTarget.setBackground(shape);

        // Not touchable, so it never blocks the app underneath
        closeParams = new WindowManager.LayoutParams(
            dp(60), dp(60), overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT);
        closeParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        closeParams.y = dp(56);
        closeParams.alpha = 0.8f;
        windowManager.addView(closeTarget, closeParams);
    }

    private boolean isOverCloseTarget() {
        if (closeTarget == null || !closeTarget.isAttachedToWindow()) return false;
        // Compare real on-screen centers; window coordinates are offset by the status bar.
        int[] target = new int[2];
        int[] me = new int[2];
        closeTarget.getLocationOnScreen(target);
        bubble.getLocationOnScreen(me);
        float targetX = target[0] + closeTarget.getWidth() / 2f;
        float targetY = target[1] + closeTarget.getHeight() / 2f;
        float bubbleX = me[0] + windowSize / 2f;
        float bubbleY = me[1] + windowSize / 2f;
        return Math.hypot(bubbleX - targetX, bubbleY - targetY) < dp(80);
    }

    private void highlightCloseTarget(boolean over) {
        if (closeTarget == null) return;
        float scale = over ? 1.3f : 1f;
        if (closeTarget.getScaleX() != scale) {
            closeTarget.animate().scaleX(scale).scaleY(scale).setDuration(100).start();
        }
    }

    private void removeCloseTarget() {
        if (closeTarget == null) return;
        try {
            windowManager.removeView(closeTarget);
        } catch (IllegalArgumentException ignored) {
            // Already gone
        }
        closeTarget = null;
    }
}
