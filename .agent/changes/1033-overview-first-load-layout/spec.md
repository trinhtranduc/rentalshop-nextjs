# Spec
- While the figures load, the cards hold spinners stretched across a vertical stack; a spinner hugs its width at 750.
- `UIView.readableColumn()` kept "as wide as the view" at 750 too, so the tie could resolve to the narrowest width the
  content allows (197pt on a 393pt phone). When the figures replace the spinners nothing hugs, and the column widens.
- The column's "as wide as the view" rule wins over any content hugging (priority 999). `<= maxWidth` and
  `<= view width` stay required: iPhone = full width, iPad = 900pt centered, as before.
- Android: Compose `fillMaxWidth` does not depend on content; check on an emulator that the first load does not jump.
