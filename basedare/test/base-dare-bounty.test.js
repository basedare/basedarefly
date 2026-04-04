const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BaseDareBounty", function () {
  const DARE_ID = 1n;
  const AMOUNT = 100_000_000n; // 100 USDC, 6 decimals

  async function deployFixture() {
    const [owner, referee, backer, streamer, referrer, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const BaseDareBounty = await ethers.getContractFactory("BaseDareBounty");
    const bounty = await BaseDareBounty.deploy(await usdc.getAddress(), owner.address);
    await bounty.waitForDeployment();

    await bounty.setAIRefereeAddress(referee.address);

    await usdc.mint(backer.address, AMOUNT * 10n);
    await usdc.connect(backer).approve(await bounty.getAddress(), AMOUNT * 10n);

    return { owner, referee, backer, streamer, referrer, other, usdc, bounty };
  }

  it("funds a bounty and stores the payout parties", async function () {
    const { bounty, backer, streamer, referrer } = await deployFixture();

    await expect(
      bounty.connect(backer).fundBounty(DARE_ID, streamer.address, referrer.address, AMOUNT)
    )
      .to.emit(bounty, "BountyFunded")
      .withArgs(DARE_ID, backer.address, AMOUNT);

    const stored = await bounty.bounties(DARE_ID);
    expect(stored.amount).to.equal(AMOUNT);
    expect(stored.streamer).to.equal(streamer.address);
    expect(stored.referrer).to.equal(referrer.address);
    expect(stored.backer).to.equal(backer.address);
    expect(stored.isVerified).to.equal(false);
  });

  it("rejects zero-address recipients at funding time", async function () {
    const { bounty, backer, referrer } = await deployFixture();

    await expect(
      bounty.connect(backer).fundBounty(DARE_ID, ethers.ZeroAddress, referrer.address, AMOUNT)
    ).to.be.revertedWith("Bounty: Streamer is zero address");

    await expect(
      bounty.connect(backer).fundBounty(DARE_ID, backer.address, ethers.ZeroAddress, AMOUNT)
    ).to.be.revertedWith("Bounty: Referrer is zero address");
  });

  it("allows only the referee to pay out and splits funds correctly", async function () {
    const { bounty, usdc, owner, referee, backer, streamer, referrer, other } = await deployFixture();

    await bounty.connect(backer).fundBounty(DARE_ID, streamer.address, referrer.address, AMOUNT);

    await expect(
      bounty.connect(other).verifyAndPayout(DARE_ID)
    ).to.be.revertedWith("Bounty: Not the AI Referee");

    const ownerBefore = await usdc.balanceOf(owner.address);
    const streamerBefore = await usdc.balanceOf(streamer.address);
    const referrerBefore = await usdc.balanceOf(referrer.address);

    await expect(
      bounty.connect(referee).verifyAndPayout(DARE_ID)
    )
      .to.emit(bounty, "BountyPayout")
      .withArgs(DARE_ID, 89_000_000n, 10_000_000n, 1_000_000n);

    expect(await usdc.balanceOf(streamer.address)).to.equal(streamerBefore + 89_000_000n);
    expect(await usdc.balanceOf(owner.address)).to.equal(ownerBefore + 10_000_000n);
    expect(await usdc.balanceOf(referrer.address)).to.equal(referrerBefore + 1_000_000n);

    const stored = await bounty.bounties(DARE_ID);
    expect(stored.amount).to.equal(0n);
  });

  it("refunds only to the stored original backer", async function () {
    const { bounty, usdc, referee, backer, streamer, referrer, other } = await deployFixture();

    await bounty.connect(backer).fundBounty(DARE_ID, streamer.address, referrer.address, AMOUNT);

    const backerBefore = await usdc.balanceOf(backer.address);
    const attackerBefore = await usdc.balanceOf(other.address);

    await expect(
      bounty.connect(referee).refundBacker(DARE_ID)
    )
      .to.emit(bounty, "BountyRefund")
      .withArgs(DARE_ID, backer.address, AMOUNT);

    expect(await usdc.balanceOf(backer.address)).to.equal(backerBefore + AMOUNT);
    expect(await usdc.balanceOf(other.address)).to.equal(attackerBefore);

    const stored = await bounty.bounties(DARE_ID);
    expect(stored.amount).to.equal(0n);
  });

  it("prevents double processing after payout or refund", async function () {
    const { bounty, referee, backer, streamer, referrer } = await deployFixture();

    await bounty.connect(backer).fundBounty(DARE_ID, streamer.address, referrer.address, AMOUNT);
    await bounty.connect(referee).verifyAndPayout(DARE_ID);

    await expect(bounty.connect(referee).verifyAndPayout(DARE_ID)).to.be.revertedWith(
      "Bounty: Does not exist"
    );

    await expect(bounty.connect(referee).refundBacker(DARE_ID)).to.be.revertedWith(
      "Bounty: Does not exist"
    );
  });
});
