package com.pokerledger.pro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable back button to navigate instead of closing app
        registerPlugin(com.getcapacitor.plugin.BackButton.class);
    }
    
    @Override
    public void onBackPressed() {
        // Let Capacitor handle the back button
        if (!bridge.onBackPressed()) {
            super.onBackPressed();
        }
    }
}
