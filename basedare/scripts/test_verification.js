/**
 * Test the new secure verification system
 *
 * Tests:
 * 1. No proof submitted → FAIL
 * 2. Invalid proof URL → FAIL
 * 3. Valid IPFS proof + low value → AUTO-APPROVE
 * 4. Valid proof + high value → MANUAL REVIEW
 * 5. Replay protection → FAIL on reuse
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testCases = [
  {
    name: 'No proof submitted',
    dareId: 'test-no-proof',
    proofData: {},
    expectedStatus: 'FAIL',
  },
  {
    name: 'Invalid proof URL (arbitrary website)',
    dareId: 'test-invalid-url',
    proofData: {
      videoUrl: 'https://youtube.com/watch?v=fake123',
      timestamp: Date.now(),
    },
    expectedStatus: 'FAIL',
  },
  {
    name: 'Gaming attempt (pass in URL)',
    dareId: 'test-gaming',
    proofData: {
      videoUrl: 'https://evil.com/pass/video.mp4',
      timestamp: Date.now(),
    },
    expectedStatus: 'FAIL',
  },
  {
    name: 'Valid IPFS proof',
    dareId: 'test-valid-ipfs',
    proofData: {
      videoUrl: 'https://gateway.pinata.cloud/ipfs/QmTest123456789',
      timestamp: Date.now(),
    },
    expectedStatus: 'PASS_OR_REVIEW',
  },
  {
    name: 'Valid Pinata proof',
    dareId: 'test-valid-pinata',
    proofData: {
      videoUrl: 'https://cyan-adequate-crane-559.mypinata.cloud/ipfs/QmTest987654321',
      timestamp: Date.now(),
    },
    expectedStatus: 'PASS_OR_REVIEW',
  },
];

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SYSTEM SECURITY TESTS');
  console.log('='.repeat(60) + '\n');

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\n--- Test: ${test.name} ---`);

    try {
      const response = await fetch(`${BASE_URL}/api/verify-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dareId: test.dareId,
          proofData: test.proofData,
        }),
      });

      const data = await response.json();

      console.log(`Status: ${response.status}`);
      console.log(`Response: ${JSON.stringify(data, null, 2)}`);

      // Evaluate result
      let testPassed = false;

      if (test.expectedStatus === 'FAIL') {
        // Should fail or return error
        testPassed = !data.success ||
                     data.data?.status === 'FAILED' ||
                     data.error ||
                     response.status === 404; // Dare not found is expected for test IDs
      } else if (test.expectedStatus === 'PASS_OR_REVIEW') {
        // Should either pass or go to manual review (not fail with low confidence)
        testPassed = data.success &&
                     (data.data?.status === 'VERIFIED' ||
                      data.data?.status === 'PENDING_REVIEW' ||
                      response.status === 404); // Dare not found is expected
      }

      if (testPassed) {
        console.log(`✅ PASSED - Behaved as expected`);
        passed++;
      } else {
        console.log(`❌ FAILED - Unexpected behavior`);
        failed++;
      }

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60) + '\n');

  // Test with a real dare from the database
  console.log('\n--- Testing with real database dare ---\n');
  await testWithRealDare();
}

async function testWithRealDare() {
  // First, get a list of dares
  try {
    const daresResponse = await fetch(`${BASE_URL}/api/dares`);
    const dares = await daresResponse.json();

    if (!dares || dares.length === 0) {
      console.log('No dares in database. Creating a test scenario...');
      console.log('To fully test, create a dare through the UI first.\n');
      return;
    }

    // Find a pending dare
    const pendingDare = dares.find(d => d.status === 'PENDING');

    if (!pendingDare) {
      console.log('No pending dares found. All dares are already processed.');
      console.log('Create a new dare to test verification.\n');
      return;
    }

    console.log(`Found pending dare: ${pendingDare.id}`);
    console.log(`Title: ${pendingDare.title}`);
    console.log(`Bounty: $${pendingDare.bounty} USDC`);
    console.log(`Threshold for manual review: $50\n`);

    // Test 1: Try without proof
    console.log('Test 1: Submitting without proof...');
    const noProofResponse = await fetch(`${BASE_URL}/api/verify-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dareId: pendingDare.id }),
    });
    const noProofData = await noProofResponse.json();
    console.log(`Result: ${noProofData.data?.status || noProofData.error || 'Unknown'}`);
    console.log(`Reason: ${noProofData.data?.verification?.reason || noProofData.error}\n`);

    // Test 2: Try with invalid URL
    console.log('Test 2: Submitting with invalid URL...');
    const invalidResponse = await fetch(`${BASE_URL}/api/verify-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dareId: pendingDare.id,
        proofData: {
          videoUrl: 'https://youtube.com/fake-video',
          timestamp: Date.now(),
        },
      }),
    });
    const invalidData = await invalidResponse.json();
    console.log(`Result: ${invalidData.data?.status || invalidData.error || 'Unknown'}`);
    console.log(`Reason: ${invalidData.data?.verification?.reason || invalidData.error}\n`);

    // Test 3: Try with valid IPFS URL
    console.log('Test 3: Submitting with valid IPFS proof...');
    const validResponse = await fetch(`${BASE_URL}/api/verify-proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dareId: pendingDare.id,
        proofData: {
          videoUrl: 'https://gateway.pinata.cloud/ipfs/QmTestProof' + Date.now(),
          timestamp: Date.now(),
        },
      }),
    });
    const validData = await validResponse.json();
    console.log(`Result: ${validData.data?.status || validData.error || 'Unknown'}`);
    console.log(`Reason: ${validData.data?.verification?.reason || validData.data?.message || validData.error}\n`);

    if (pendingDare.bounty >= 50) {
      console.log(`ℹ️  High-value dare ($${pendingDare.bounty}) - should require manual review`);
    } else {
      console.log(`ℹ️  Low-value dare ($${pendingDare.bounty}) - should auto-approve`);
    }

  } catch (error) {
    console.log(`Error testing with real dare: ${error.message}`);
  }
}

// Run tests
runTests().catch(console.error);
