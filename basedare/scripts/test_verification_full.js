/**
 * Full verification system test
 * Creates test dares and validates the security logic
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function createTestDare(bounty, title) {
  const dare = await prisma.dare.create({
    data: {
      title: title,
      bounty: bounty,
      streamerHandle: '@test_streamer',
      stakerAddress: '0x0000000000000000000000000000000000000002',
      status: 'PENDING',
      isSimulated: true,
    },
  });
  console.log(`Created test dare: ${dare.id} (${title}, $${bounty})`);
  return dare;
}

async function testVerification(dareId, proofData, description) {
  console.log(`\n--- ${description} ---`);

  const response = await fetch(`${BASE_URL}/api/verify-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dareId, proofData }),
  });

  const data = await response.json();
  const status = data.data?.status || data.error || 'Unknown';
  const reason = data.data?.verification?.reason || data.data?.message || data.error || '';

  console.log(`Status: ${status}`);
  console.log(`Reason: ${reason}`);

  return { status, reason, data };
}

async function cleanup(dareIds) {
  for (const id of dareIds) {
    await prisma.dare.delete({ where: { id } }).catch(() => {});
  }
  console.log('\nCleaned up test dares');
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SYSTEM SECURITY TESTS');
  console.log('='.repeat(60));

  const testDareIds = [];
  let passed = 0;
  let failed = 0;

  try {
    // =========================================================================
    // TEST 1: No proof submitted
    // =========================================================================
    const dare1 = await createTestDare(25, 'Test: No proof');
    testDareIds.push(dare1.id);

    const result1 = await testVerification(dare1.id, {}, 'TEST 1: No proof submitted');

    if (result1.status === 'FAILED' && result1.reason.includes('No video proof')) {
      console.log('✅ PASSED - Correctly rejected missing proof');
      passed++;
    } else {
      console.log('❌ FAILED - Should have rejected missing proof');
      failed++;
    }

    // =========================================================================
    // TEST 2: Invalid proof URL (YouTube)
    // =========================================================================
    const dare2 = await createTestDare(25, 'Test: Invalid URL');
    testDareIds.push(dare2.id);

    const result2 = await testVerification(dare2.id, {
      videoUrl: 'https://youtube.com/watch?v=fake123',
      timestamp: Date.now(),
    }, 'TEST 2: Invalid proof URL (YouTube)');

    if (result2.status === 'FAILED' && result2.reason.includes('Invalid proof source')) {
      console.log('✅ PASSED - Correctly rejected invalid URL');
      passed++;
    } else {
      console.log('❌ FAILED - Should have rejected invalid URL');
      failed++;
    }

    // =========================================================================
    // TEST 3: Gaming attempt ("pass" in URL)
    // =========================================================================
    const dare3 = await createTestDare(25, 'Test: Gaming attempt');
    testDareIds.push(dare3.id);

    const result3 = await testVerification(dare3.id, {
      videoUrl: 'https://evil.com/pass/video.mp4',
      timestamp: Date.now(),
    }, 'TEST 3: Gaming attempt (pass in URL)');

    if (result3.status === 'FAILED') {
      console.log('✅ PASSED - Gaming attempt blocked');
      passed++;
    } else {
      console.log('❌ FAILED - Gaming attempt should have been blocked');
      failed++;
    }

    // =========================================================================
    // TEST 4: Valid IPFS proof + low value → AUTO-APPROVE
    // =========================================================================
    const dare4 = await createTestDare(25, 'Test: Low value auto-approve');
    testDareIds.push(dare4.id);

    const result4 = await testVerification(dare4.id, {
      videoUrl: 'https://gateway.pinata.cloud/ipfs/QmTest' + Date.now(),
      timestamp: Date.now(),
    }, 'TEST 4: Valid IPFS proof + low value ($25)');

    if (result4.status === 'VERIFIED') {
      console.log('✅ PASSED - Low-value dare auto-approved');
      passed++;
    } else {
      console.log('❌ FAILED - Should have auto-approved low-value dare');
      console.log('   Got:', result4.status);
      failed++;
    }

    // =========================================================================
    // TEST 5: Valid proof + high value → MANUAL REVIEW
    // =========================================================================
    const dare5 = await createTestDare(100, 'Test: High value manual review');
    testDareIds.push(dare5.id);

    const result5 = await testVerification(dare5.id, {
      videoUrl: 'https://gateway.pinata.cloud/ipfs/QmHighValue' + Date.now(),
      timestamp: Date.now(),
    }, 'TEST 5: Valid proof + high value ($100)');

    if (result5.status === 'PENDING_REVIEW' || result5.reason.includes('manual review')) {
      console.log('✅ PASSED - High-value dare queued for manual review');
      passed++;
    } else {
      console.log('❌ FAILED - Should have queued for manual review');
      console.log('   Got:', result5.status);
      failed++;
    }

    // =========================================================================
    // TEST 6: Replay protection (reuse proof URL)
    // =========================================================================
    const replayProofUrl = 'https://gateway.pinata.cloud/ipfs/QmReplayTest123';

    const dare6a = await createTestDare(25, 'Test: Replay original');
    testDareIds.push(dare6a.id);

    await testVerification(dare6a.id, {
      videoUrl: replayProofUrl,
      timestamp: Date.now(),
    }, 'TEST 6a: First use of proof URL');

    const dare6b = await createTestDare(25, 'Test: Replay attempt');
    testDareIds.push(dare6b.id);

    const result6 = await testVerification(dare6b.id, {
      videoUrl: replayProofUrl,
      timestamp: Date.now(),
    }, 'TEST 6b: Replay attempt (same proof URL)');

    if (result6.status === 'FAILED' && result6.reason.includes('already been used')) {
      console.log('✅ PASSED - Replay attack blocked');
      passed++;
    } else {
      console.log('❌ FAILED - Should have blocked replay attack');
      failed++;
    }

    // =========================================================================
    // TEST 7: Old proof (>7 days)
    // =========================================================================
    const dare7 = await createTestDare(25, 'Test: Old proof');
    testDareIds.push(dare7.id);

    const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000); // 8 days ago

    const result7 = await testVerification(dare7.id, {
      videoUrl: 'https://gateway.pinata.cloud/ipfs/QmOldProof' + Date.now(),
      timestamp: oldTimestamp,
    }, 'TEST 7: Old proof (8 days ago)');

    if (result7.status === 'FAILED' && result7.reason.includes('too old')) {
      console.log('✅ PASSED - Old proof rejected');
      passed++;
    } else {
      console.log('❌ FAILED - Should have rejected old proof');
      failed++;
    }

  } finally {
    await cleanup(testDareIds);
    await prisma.$disconnect();
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of 7 tests`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n✅ ALL SECURITY TESTS PASSED\n');
  } else {
    console.log(`\n⚠️  ${failed} TESTS FAILED - Review the verification logic\n`);
  }
}

runTests().catch(async (e) => {
  console.error('Test error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
