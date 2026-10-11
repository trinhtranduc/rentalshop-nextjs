# Spec

1. New `ResponsiveDialogFooter` (next to the dialogs): below 768 px it is `sticky bottom-0` inside the dialog content with a top border, a safe-area bottom padding, an optional summary line on the left or on top ("Cần thu", amount) and the buttons; from 768 px it renders exactly the old footer layout (buttons row).
2. Each of the three dialogs: below 768 px the dialog content is `h-[100dvh] max-h-[100dvh] w-full rounded-none` (nearly the whole screen), the body scrolls (`overflow-y-auto`) between the header and the footer; from 768 px the existing classes apply.
3. Amount and primary button always visible on a phone:
   - Renew: footer summary = total of the chosen period (from `calculateRenewalTotal`), primary "Process Renewal".
   - Extend: footer summary = the price in the input, primary "Extend Subscription".
   - Change plan: footer summary = total due (`planChange.totalDue`), primary "Change Plan"; before a plan is chosen the summary is hidden and the button stays disabled as today.
4. Order inside the body on a phone: plan and period (start → end) first, then price, then the fields; the "Calculation Details" block (Extend) and the per-option period lines are collapsed behind a "Chi tiết" toggle by default on a phone (open on desktop as today).
5. Every `select`, `input`, checkbox row and button in these dialogs is at least 44 px high on a phone (`min-h-11`); checkbox rows get a 44 px tap area (label wraps the box). From 768 px the sizes are unchanged.
6. Change plan on a phone: start date and end date sit on one row (two columns) instead of stacked.
7. Not changed: prices, dates, props, callbacks, API, locale strings (reuse the existing text; a new "Chi tiết" label reuses an existing key or the same hard-coded English the dialogs use today).
