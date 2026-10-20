package com.astephens.todobubble;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-specific native plugins must be registered before super.onCreate
        registerPlugin(BubblePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
