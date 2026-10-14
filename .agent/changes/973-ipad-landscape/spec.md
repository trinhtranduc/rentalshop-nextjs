# Spec — #973

Status: in-progress

1. `Info.plist`: `UISupportedInterfaceOrientations~ipad` = landscape left/right, iPhone portrait, `UIRequiresFullScreen` YES (unit test).
2. `UIPopoverPresentationController.anchor(to:fallback:)`: keep an existing anchor, else a visible source, else the middle of the screen. Used where the source could be nil (product delete, bank account outlet, user outlet).
3. `UIView.readableColumn()`: centered guide, width = min(view, 900). iPhone: full width (no change).
4. Product form (`V2.presentForm`): iPad form sheet 720×900 (fits the window), not dismissable by swipe.
5. Product photo box: 62% of width, capped at 320 pt; iPad shows the whole photo (aspect fit).
6. Camera preview / captured frame follow the interface orientation (attendance scan, image search).
7. UI test `testIPadLandscapeTour` (iPad only): launch in landscape, open each main screen, screenshot.
