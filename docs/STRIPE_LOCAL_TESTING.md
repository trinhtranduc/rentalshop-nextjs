# Stripe local testing (Checkout + Webhook + Auto-renew)

This repo integrates Stripe Billing using:
- `POST /api/stripe/checkout-session`
- `POST /api/stripe/billing-portal`
- `POST /api/stripe/webhook`

## 1) Required environment variables

Set these in the API environment (for `apps/api`):

- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Also ensure Prisma has `DATABASE_URL` available when the API runs.

## 2) Run the API locally

Start the API (example):

```bash
yarn dev:api
```

Make sure it is reachable (default local is `http://localhost:3002`).

## 3) Start Stripe CLI webhook forwarding

Install Stripe CLI and login, then:

```bash
stripe listen --forward-to http://localhost:3002/api/stripe/webhook
```

Stripe CLI prints a webhook signing secret like:
`whsec_...`

Copy that into `STRIPE_WEBHOOK_SECRET`.

## 4) Create Stripe Product + Price, then link to `Plan`

For each plan you want to sell, you need a Stripe **Price ID** (looks like `price_...`).

You can create them in Stripe Dashboard, or via CLI.

Then set the DB field:
- `Plan.stripePriceId = "price_..."`

## 5) Subscribe flow (manual test)

Open the Plans page (client app) and click purchase.

The app calls:
- `POST /api/stripe/checkout-session`

Then it redirects to `session.url` (Stripe Checkout).

After completing checkout:
- Stripe sends `checkout.session.completed`
- Stripe sends `customer.subscription.created/updated`
- Stripe sends `invoice.paid`

The webhook updates DB:
- `Subscription.currentPeriodStart/currentPeriodEnd`
- `Subscription.status`
- creates `Payment` rows
- creates `SubscriptionActivity` rows

## 6) Test renewals / failures / cancel

### Renewal (invoice paid)
Use Stripe test clocks (recommended) or wait for the next billing cycle in test mode.

Expected webhook events:
- `invoice.paid`
- `customer.subscription.updated`

Expected DB effects:
- New `Payment` record
- Subscription `currentPeriodEnd` advanced

### Payment failure
In Stripe Dashboard, attach a failing test payment method to the customer, then attempt renewal.

Expected webhook events:
- `invoice.payment_failed`
- `customer.subscription.updated` (often to `past_due`)

Expected DB effects:
- `Payment.status = FAILED`
- Subscription status becomes `PAST_DUE` (or equivalent mapping)

### Cancel at period end
Use Billing Portal (Manage billing button) to cancel.

Expected webhook events:
- `customer.subscription.updated` with `cancel_at_period_end=true`

Expected DB effects:
- `Subscription.cancelAtPeriodEnd=true`
- Access remains until `currentPeriodEnd` (existing `/api/subscriptions/status` logic)

