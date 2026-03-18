import Stripe from 'stripe';
import { env } from '@rentalshop/env';

/**
 * Stripe SDK instance (server-only).
 *
 * We intentionally keep this tiny and reusable across routes.
 */
export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
    // Typescript: keep this on to reduce surprises
    typescript: true,
  });
}

