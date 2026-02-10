#!/usr/bin/env node
/**
 * Simple script to test subscription email sending
 * Usage: node scripts/test-email-simple.js
 */

require('dotenv').config({ path: '.env.production' });

async function testEmail() {
  // Dynamic import to avoid issues
  const { sendPlanChangeEmail } = await import('../packages/utils/dist/services/email.js');
  
  const testEmail = 'trinh3@yopmail.com';
  
  console.log('\n📧 Testing Subscription Email Sending...\n');
  console.log(`Target Email: ${testEmail}\n`);
  console.log(`EMAIL_PROVIDER: ${process.env.EMAIL_PROVIDER || 'not set'}\n`);

  try {
    const result = await sendPlanChangeEmail({
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
    
    console.log('\n✅ Email sent successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log(`\n💡 Check ${testEmail} inbox to verify email was received.`);
    if (process.env.EMAIL_PROVIDER === 'console') {
      console.log('⚠️  Note: EMAIL_PROVIDER=console, so email was only logged, not sent.');
    }
  } catch (error) {
    console.error('\n❌ Error sending email:', error);
    console.error('Stack:', error.stack);
  }
}

testEmail();
