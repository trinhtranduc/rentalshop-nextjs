# Plan — #1073

1. Edit the two files (sed on the exact old values) and check every occurrence changed.
2. iOS: build the Development scheme for the simulator; Android: `:app:assembleDebug`. Both must succeed.
3. PR into `dev` with `Fixes #1073`.
