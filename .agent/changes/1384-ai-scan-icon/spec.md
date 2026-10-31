# Spec — AI scan button

Issue: #1384

1. iOS new Home: same place and 38×38 pt, radius 10; gradient #1D4ED8 → #7C3AED (top-left to bottom-right); white camera with sparkle, 20 pt. Touch area still 46 pt. Tap still opens image search. VoiceOver label still `products.home.imageSearch`.
2. Android new Home: matches iOS at 38×38 dp, radius 10, icon 20 dp. Touch area still 48 dp, same `contentDescription`, same action.
3. Merchant web `/products`: same gradient and icon, text still `imageSearch.open` ("Tìm bằng ảnh") in white, height 36. Same gradient in light and dark; text at least 4.5:1 on both stops.
4. The gradient is a token: iOS `DS.Gradient.aiScan`, Android `DS.Gradients.AiScan`, web `--ar-ai-scan` / `bg-ar-ai-scan`.

## Out of scope

Old Home floating buttons, public shop page, a hint, a pill, animation, other buttons in the search bar, any string or API change.
