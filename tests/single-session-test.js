/**
 * Single Session Test
 * Tests that only the latest login session is valid
 * 
 * Test flow:
 * 1. Login as user A (session 1) -> get token A
 * 2. Login as user A again (session 2) -> get token B
 * 3. Try to use token A -> should fail (session invalidated)
 * 4. Use token B -> should succeed (current session)
 * 5. Logout with token B
 * 6. Try to use token B -> should fail (logged out)
 */

const API_URL = process.env.API_URL || 'http://localhost:3002';

// Test credentials
const TEST_USER = {
  email: 'admin@rentalshop.com',
  password: 'admin123'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[Step ${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function login(credentials) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  return data;
}

async function verifyToken(token) {
  const response = await fetch(`${API_URL}/api/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  return {
    success: response.ok,
    status: response.status,
    data
  };
}

async function logout(token) {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  
  return {
    success: response.ok,
    status: response.status,
    data
  };
}

async function runTests() {
  log('\n========================================', 'blue');
  log('  SINGLE SESSION TEST', 'blue');
  log('========================================\n', 'blue');
  log(`Testing against: ${API_URL}`, 'yellow');

  let tokenA, tokenB;
  let allTestsPassed = true;

  try {
    // ============================================================================
    // Test 1: First Login (Session 1)
    // ============================================================================
    logStep(1, 'First login - Creating session 1');
    const login1 = await login(TEST_USER);
    tokenA = login1.data.token;
    
    if (tokenA) {
      logSuccess(`First login successful - Token A: ${tokenA.substring(0, 30)}...`);
      log(`User: ${login1.data.user.email}`, 'yellow');
    } else {
      logError('First login failed - No token received');
      allTestsPassed = false;
      return;
    }

    // ============================================================================
    // Test 2: Verify Token A Works
    // ============================================================================
    logStep(2, 'Verify token A works (session 1 is active)');
    const verify1 = await verifyToken(tokenA);
    
    if (verify1.success) {
      logSuccess('Token A is valid ✓');
    } else {
      logError(`Token A should be valid but got: ${verify1.status} - ${verify1.data.message}`);
      allTestsPassed = false;
    }

    // Wait a bit to ensure distinct sessions
    await new Promise(resolve => setTimeout(resolve, 1000));

    // ============================================================================
    // Test 3: Second Login (Session 2) - Should Invalidate Session 1
    // ============================================================================
    logStep(3, 'Second login - Creating session 2 (should invalidate session 1)');
    const login2 = await login(TEST_USER);
    tokenB = login2.data.token;
    
    if (tokenB) {
      logSuccess(`Second login successful - Token B: ${tokenB.substring(0, 30)}...`);
      log(`User: ${login2.data.user.email}`, 'yellow');
    } else {
      logError('Second login failed - No token received');
      allTestsPassed = false;
      return;
    }

    // ============================================================================
    // Test 4: Verify Token A is Now Invalid (Session 1 Invalidated)
    // ============================================================================
    logStep(4, 'Verify token A is now INVALID (session 1 should be invalidated)');
    const verify2 = await verifyToken(tokenA);
    
    if (!verify2.success && verify2.status === 401) {
      logSuccess(`Token A is now invalid ✓ (${verify2.data.code || verify2.data.message})`);
      log('✨ Single session enforcement working correctly!', 'green');
    } else if (verify2.success) {
      logError('Token A should be invalid but still works! Single session NOT working!');
      log(`Response: ${JSON.stringify(verify2.data, null, 2)}`, 'red');
      allTestsPassed = false;
    } else {
      logWarning(`Token A is invalid but with unexpected status: ${verify2.status}`);
      log(`Response: ${JSON.stringify(verify2.data, null, 2)}`, 'yellow');
    }

    // ============================================================================
    // Test 5: Verify Token B Still Works (Session 2 Active)
    // ============================================================================
    logStep(5, 'Verify token B still works (session 2 is active)');
    const verify3 = await verifyToken(tokenB);
    
    if (verify3.success) {
      logSuccess('Token B is valid ✓');
    } else {
      logError(`Token B should be valid but got: ${verify3.status} - ${verify3.data.message}`);
      allTestsPassed = false;
    }

    // ============================================================================
    // Test 6: Logout with Token B
    // ============================================================================
    logStep(6, 'Logout with token B (invalidate session 2)');
    const logoutResult = await logout(tokenB);
    
    if (logoutResult.success) {
      logSuccess('Logout successful ✓');
    } else {
      logError(`Logout failed: ${logoutResult.status} - ${logoutResult.data.message}`);
      allTestsPassed = false;
    }

    // ============================================================================
    // Test 7: Verify Token B is Now Invalid (After Logout)
    // ============================================================================
    logStep(7, 'Verify token B is now INVALID (after logout)');
    const verify4 = await verifyToken(tokenB);
    
    if (!verify4.success && verify4.status === 401) {
      logSuccess(`Token B is now invalid after logout ✓ (${verify4.data.code || verify4.data.message})`);
    } else if (verify4.success) {
      logError('Token B should be invalid after logout but still works!');
      allTestsPassed = false;
    } else {
      logWarning(`Token B is invalid but with unexpected status: ${verify4.status}`);
    }

    // ============================================================================
    // Test Summary
    // ============================================================================
    log('\n========================================', 'blue');
    log('  TEST SUMMARY', 'blue');
    log('========================================\n', 'blue');

    if (allTestsPassed) {
      logSuccess('All tests PASSED! ✨');
      log('\n✅ Single Session Implementation is working correctly:', 'green');
      log('  - Token A invalidated when user logged in again (Token B)', 'green');
      log('  - Token B worked until logout', 'green');
      log('  - Token B invalidated after logout', 'green');
      process.exit(0);
    } else {
      logError('Some tests FAILED!');
      log('\n❌ Please check the implementation:', 'red');
      log('  - Session invalidation on new login', 'red');
      log('  - Token verification with session check', 'red');
      log('  - Logout session invalidation', 'red');
      process.exit(1);
    }

  } catch (error) {
    logError(`\nTest error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

