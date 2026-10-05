# Spec — #472 product image viewer

1. `ProductImages.viewerUrls(product)`: the product's `images` without blank entries; when none, `[image_url]`
   if it is not blank; otherwise empty. Same list the detail pager shows.
2. `ProductImages.thumbnailTap(product)` returns a viewer request (urls from 1, start index of the thumbnail's
   URL in that list, else 0) or nothing when the product has no photo.
3. A thumbnail tap with a request opens the viewer; with nothing it opens detail (row behaviour). A tap on the
   rest of the row opens detail. The + button adds to cart.
4. Detail: a tap on the photo opens the viewer at the current pager page (clamped to the list).
5. Viewer: black full screen, one page per URL, horizontal paging, pinch zoom (1x–4x), double-tap zoom toggle,
   X button labelled "Đóng"/"Close", swipe down (iOS) / back (Android) closes. Zoom resets when the page changes.
6. Accessibility: the thumbnail label is `products.image.view.accessibility` / `v2_view_image_named`
   ("Xem ảnh %@" / "View photo of %@") when the product has a photo.

Out of scope: old Home / note / preview viewers, product form, sharing or saving the photo.
