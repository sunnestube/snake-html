/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package li.jueni.snakegame;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.browser.customtabs.CustomTabsCallback;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    // The default callback (QualityEnforcer) deliberately throws a RuntimeException on the main
    // thread when Chrome reports a "quality violation" (failed Digital Asset Links check, HTTP
    // 404/5xx or offline failure of the main document). That shows up as the Android dialog
    // "App keeps stopping". Log it instead: the app then stays open (Chrome falls back to a
    // Custom Tab if verification fails) and the reason is visible in logcat.
    @Override
    protected CustomTabsCallback getCustomTabsCallback() {
        return new CustomTabsCallback() {
            @Nullable
            @Override
            public Bundle extraCallbackWithResult(@NonNull String callbackName,
                                                  @Nullable Bundle args) {
                Log.w("SnakeTwa", "Chrome quality callback ignored: " + callbackName + " "
                        + (args != null ? args.getString("crash_reason") : null));
                return null;
            }
        };
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        

        return uri;
    }
}
