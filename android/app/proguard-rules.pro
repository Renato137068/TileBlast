# Tile Blast — release shrink rules

-keepattributes *Annotation*,InnerClasses,EnclosingMethod,Signature
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor / WebView bridge
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# Tile Blast native bridge (must stay callable from JS)
-keep class com.tileblast.game.TileBlastBridge { *; }
-keep class com.tileblast.game.MainActivity { *; }

# Google AdMob
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# Google Play Billing
-keep class com.android.billingclient.** { *; }
-keep class com.android.vending.billing.** { *; }
-dontwarn com.android.billingclient.**

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.measurement.** { *; }
-dontwarn com.google.firebase.**

# User Messaging Platform (UMP / consent)
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.ump.**

# JSON (billing / bridge callbacks)
-keepclassmembers class * {
    @org.json.* <fields>;
}
