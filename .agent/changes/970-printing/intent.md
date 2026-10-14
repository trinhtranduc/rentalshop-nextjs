# #970 Intent — printing shows results, "printer not set up", Mac hint, virtual printer

Found while reproducing "a customer on a MacBook cannot print" (14/10/26). The app prints fine on the Mac,
but several bugs make it look broken.

- iOS "In thử" never shows its result: the result alert is presented while the "Connecting…" alert is up.
- iOS falls back to a fake printer IP `192.168.1.199`; print from order detail / preview sends there,
  waits 5 s and reports a timeout instead of "printer not set up".
- Connection errors give no hint for the Mac ("Designed for iPad") case.
- No printer to test with: a virtual printer script goes into the repo.

Constraints: no API change. Unit tests for "is a printer configured" and the messages. Android gets the
same fixes where it has the same bug. Keep it simple (owner).
