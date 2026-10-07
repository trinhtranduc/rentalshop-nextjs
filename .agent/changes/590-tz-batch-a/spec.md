# Spec — Timezone batch A (#578 §A)

A request window is turned into an inclusive range of VN day keys `from..to`, then into the bounds
`[from 00:00 VN, to+1 00:00 VN)`. An active RENT order conflicts iff `pickupPlanAt < end AND returnPlanAt >= start`
(= its VN pickup day ≤ to and its VN return day ≥ from; same model as the calendar and the #518 schedule check).

| Input | Days |
|---|---|
| `date=D` | D..D |
| `pickupDate=P&returnDate=R` (legacy route) | P..R |
| UTC-day window `X T00:00:00[.000]Z … Y T23:59:59[.mmm]Z`, Y ≥ X (App Store iOS Order Check, `main-real` Android cart, admin create order in a UTC browser) | X..Y |
| any other ISO window (web Tạo đơn, current iOS/Android carts) | VN day of start .. VN day of end |

- A1 legacy `GET /api/products/availability`: no UTC day, no return stretched to 23:59:59Z.
- A2 batch: pickup `< end`, return `>= start` on the half-open VN range (#575). Orders without a return keep
  today's rule (pickup inside the window).
- A3 `.000Z` / any-ms ends and multi-day UTC-day windows are recognised (#576).
- Response shapes unchanged. `rentalPeriod.startDate/endDate` echo the resolved window as before for ISO
  windows; for UTC-day windows they show the VN-day bounds (already the case for one-day windows).
