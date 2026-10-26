# Only used if minifyEnabled is switched on again (currently false, #6).
# Components referenced by the manifest are kept by AGP automatically; keep the whole
# androidbrowserhelper library readable because it toggles its own components via PackageManager.
-keep class com.google.androidbrowserhelper.** { *; }
-keep class androidx.browser.** { *; }
-keep class li.jueni.snakegame.** { *; }
