# Intent — #1138 "Nhận đặt online" shows OFF after login

**What:** Settings → Cửa hàng shows the shop's real online-booking state on every device and after every login.
**Why:** e2e on dev `78cf8e87f`: the switch showed OFF (and outlet switches dimmed) while `Merchant.onlineBookingEnabled = true`. An owner could believe booking is off, or turn it "on" again.
**Constraints:** web only, no API change, minimal diff (another agent is auditing settings).
