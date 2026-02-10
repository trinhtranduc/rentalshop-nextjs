#!/usr/bin/env tsx
/**
 * Script to test subscription email sending
 * 
 * Usage:
 *   tsx scripts/test-subscription-email.ts
 * 
 * On Railway:
 *   railway run --service apis tsx scripts/test-subscription-email.ts
 */

import { sendPlanChangeEmail, sendSubscriptionStatusChangeEmail } from '@rentalshop/utils';

async function testSubscriptionEmail() {
  const testEmail = 'trinh3@yopmail.com';
  
  console.log('\n📧 Testing Subscription Email Sending...\n');
  console.log(`Target Email: ${testEmail}\n`);

  // Test 1: Plan Change Email
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Plan Change Email');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const planChangeResult = await sendPlanChangeEmail({
      merchantName: 'Test Merchant',
      email: testEmail,
      oldPlanName: 'Basic Plan',
      newPlanName: 'Premium Plan',
      amount: 500000,
      currency: 'VND',
      billingInterval: 'monthly',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    console.log('\n📬 Plan Change Email Result:');
    console.log(JSON.stringify(planChangeResult, null, 2));
  } catch (error) {
    console.error('❌ Error sending plan change email:', error);
  }

  // Test 2: Subscription Status Change (Paused)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Subscription Status Change (Paused)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const pauseResult = await sendSubscriptionStatusChangeEmail({
      merchantName: 'Test Merchant',
      email: testEmail,
      planName: 'Premium Plan',
      status: 'PAUSED',
      periodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    });
    
    console.log('\n📬 Pause Email Result:');
    console.log(JSON.stringify(pauseResult, null, 2));
  } catch (error) {
    console.error('❌ Error sending pause email:', error);
  }

  // Test 3: Subscription Status Change (Cancelled)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Subscription Status Change (Cancelled)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const cancelResult = await sendSubscriptionStatusChangeEmail({
      merchantName: 'Test Merchant',
      email: testEmail,
      planName: 'Premium Plan',
      status: 'CANCELLED',
      reason: 'Test cancellation',
      periodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
    });
    
    console.log('\n📬 Cancellation Email Result:');
    console.log(JSON.stringify(cancelResult, null, 2));
  } catch (error) {
    console.error('❌ Error sending cancellation email:', error);
  }

  console.log('\n✅ Email tests completed!');
  console.log(`\n💡 Check ${testEmail} inbox to verify emails were received.`);
  console.log('   (If EMAIL_PROVIDER=console, emails are only logged, not sent)');
}

testSubscriptionEmail();
