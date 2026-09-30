# React Native / Hermes keep rules for release minify.
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }

-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}

-dontwarn com.facebook.react.**
