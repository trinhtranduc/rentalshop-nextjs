# Intent — #935 iOS my shifts shows hours next to late minutes

Staff open "Ca và công của tôi" to see how many hours they worked. On iOS a late record shows
"muộn N′" in place of its hours, so a late day hides the number they came for. Android had the same
bug (#932, PR #933). Show times, hours, then the late minutes in amber, as on Android.

Constraints: iOS only, no API change, check on a visible Simulator.
