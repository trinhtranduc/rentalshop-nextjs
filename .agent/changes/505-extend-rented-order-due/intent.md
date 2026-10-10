# Intent — #505 the extra rent of a gia hạn must be due, and must not rewrite the pickup day

Gia hạn on a PICKUPED order raises `totalAmount` by the extra rent. Today the extra rent is never shown as due (`computeOrderBalance` for PICKUPED only knows fees and collateral), and `getOrderRevenueEvents` recomputes the pickup event from the CURRENT `totalAmount`, so the extra lands retroactively on the pickup day.

Wanted: "còn thu / trả lại khách" includes the extra rent, and the money collected on the pickup day does not change after the fact.

Constraints: installed iOS/Android builds cannot be force-updated. Additive only (new nullable column, new field). Never change what `totalAmount`, `amountDue`, `refundDue` mean for an order that was never extended. Money rule: needs owner review.
