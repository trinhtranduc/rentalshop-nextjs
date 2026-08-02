# Keep FCM / API models if minify is enabled later.
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <fields>;
}
