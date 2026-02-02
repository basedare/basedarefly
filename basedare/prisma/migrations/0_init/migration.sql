-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "baseTag" TEXT NOT NULL,
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dare" (
    "id" TEXT NOT NULL,
    "shortId" TEXT,
    "title" TEXT NOT NULL,
    "bounty" DOUBLE PRECISION NOT NULL,
    "streamerHandle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "videoUrl" TEXT,
    "proofHash" TEXT,
    "creatorId" TEXT,
    "streamId" TEXT,
    "txHash" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifyTxHash" TEXT,
    "verifyConfidence" DOUBLE PRECISION,
    "appealStatus" TEXT,
    "appealReason" TEXT,
    "appealedAt" TIMESTAMP(3),
    "referrerTag" TEXT,
    "referrerAddress" TEXT,
    "referrerPayout" DOUBLE PRECISION,
    "stakerAddress" TEXT,
    "inviteToken" TEXT,
    "claimDeadline" TIMESTAMP(3),
    "targetWalletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discoveryRadiusKm" DOUBLE PRECISION DEFAULT 5,
    "geohash" TEXT,
    "isNearbyDare" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "locationLabel" TEXT,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Dare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamerTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "twitterId" TEXT,
    "twitterHandle" TEXT,
    "twitterVerified" BOOLEAN NOT NULL DEFAULT false,
    "twitchId" TEXT,
    "twitchHandle" TEXT,
    "twitchVerified" BOOLEAN NOT NULL DEFAULT false,
    "youtubeId" TEXT,
    "youtubeHandle" TEXT,
    "youtubeVerified" BOOLEAN NOT NULL DEFAULT false,
    "kickHandle" TEXT,
    "kickVerificationCode" TEXT,
    "kickVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokeReason" TEXT,
    "totalEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedDares" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "walletAddress" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "totalSpend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "budgetUsdc" DOUBLE PRECISION NOT NULL,
    "creatorCountTarget" INTEGER NOT NULL,
    "payoutPerCreator" DOUBLE PRECISION NOT NULL,
    "targetingCriteria" TEXT NOT NULL DEFAULT '{}',
    "verificationCriteria" TEXT NOT NULL DEFAULT '{}',
    "syncTime" TIMESTAMP(3),
    "windowHours" INTEGER NOT NULL DEFAULT 24,
    "strikeWindowMinutes" INTEGER NOT NULL DEFAULT 10,
    "precisionMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "vetoWindowEndsAt" TIMESTAMP(3),
    "vetoCount" INTEGER NOT NULL DEFAULT 0,
    "maxVetoPercent" INTEGER NOT NULL DEFAULT 25,
    "rakePercent" INTEGER NOT NULL DEFAULT 30,
    "fundedAt" TIMESTAMP(3),
    "liveAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSlot" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "scoutId" TEXT,
    "creatorAddress" TEXT,
    "creatorHandle" TEXT,
    "creatorFollowers" INTEGER,
    "claimRationale" TEXT,
    "claimedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "submittedAt" TIMESTAMP(3),
    "proofUrl" TEXT,
    "proofHash" TEXT,
    "visualScore" DOUBLE PRECISION,
    "audioScore" DOUBLE PRECISION,
    "metadataPass" BOOLEAN,
    "totalConfidence" DOUBLE PRECISION,
    "basePayout" DOUBLE PRECISION,
    "precisionBonus" DOUBLE PRECISION,
    "totalPayout" DOUBLE PRECISION,
    "discoveryRake" DOUBLE PRECISION,
    "activeRake" DOUBLE PRECISION,
    "paidAt" TIMESTAMP(3),
    "payoutTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scout" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "handle" TEXT,
    "reputationScore" INTEGER NOT NULL DEFAULT 50,
    "totalCampaigns" INTEGER NOT NULL DEFAULT 0,
    "successfulSlots" INTEGER NOT NULL DEFAULT 0,
    "failedSlots" INTEGER NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'BLOODHOUND',
    "totalDiscoveryRake" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalActiveRake" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoutCreator" (
    "id" TEXT NOT NULL,
    "creatorAddress" TEXT NOT NULL,
    "creatorHandle" TEXT,
    "discoveryScoutId" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeScoutId" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCompletions" INTEGER NOT NULL DEFAULT 0,
    "bindingStatus" TEXT NOT NULL DEFAULT 'BOUND',
    "totalDiscoveryRakeEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalActiveRakeEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoutCreator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePot" (
    "id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeposited" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDistributed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSlashed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastDepositAt" TIMESTAMP(3),
    "lastDistributionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LivePot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PotTransaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "recipientAddress" TEXT,
    "recipientType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PotTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityAddress" TEXT NOT NULL,
    "entityHandle" TEXT,
    "totalVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgPayout" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "previousRank" INTEGER,
    "rewardEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRewardDistribution" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "potBalanceBefore" DOUBLE PRECISION NOT NULL,
    "distributionAmount" DOUBLE PRECISION NOT NULL,
    "potBalanceAfter" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "creatorRewards" TEXT NOT NULL DEFAULT '[]',
    "scoutRewards" TEXT NOT NULL DEFAULT '[]',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyRewardDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "User_baseTag_key" ON "User"("baseTag");

-- CreateIndex
CREATE UNIQUE INDEX "Dare_shortId_key" ON "Dare"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "Dare_inviteToken_key" ON "Dare"("inviteToken");

-- CreateIndex
CREATE INDEX "Dare_inviteToken_idx" ON "Dare"("inviteToken");

-- CreateIndex
CREATE INDEX "Dare_streamerHandle_status_idx" ON "Dare"("streamerHandle", "status");

-- CreateIndex
CREATE INDEX "Dare_geohash_idx" ON "Dare"("geohash");

-- CreateIndex
CREATE INDEX "Dare_isNearbyDare_status_idx" ON "Dare"("isNearbyDare", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerTag_tag_key" ON "StreamerTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerTag_twitterId_key" ON "StreamerTag"("twitterId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerTag_twitchId_key" ON "StreamerTag"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerTag_youtubeId_key" ON "StreamerTag"("youtubeId");

-- CreateIndex
CREATE INDEX "StreamerTag_walletAddress_idx" ON "StreamerTag"("walletAddress");

-- CreateIndex
CREATE INDEX "StreamerTag_twitterHandle_idx" ON "StreamerTag"("twitterHandle");

-- CreateIndex
CREATE INDEX "StreamerTag_status_idx" ON "StreamerTag"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_walletAddress_key" ON "Brand"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_shortId_key" ON "Campaign"("shortId");

-- CreateIndex
CREATE UNIQUE INDEX "Scout_walletAddress_key" ON "Scout"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ScoutCreator_creatorAddress_key" ON "ScoutCreator"("creatorAddress");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_period_periodStart_entityType_entityAddres_key" ON "LeaderboardEntry"("period", "periodStart", "entityType", "entityAddress");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRewardDistribution_weekStart_key" ON "WeeklyRewardDistribution"("weekStart");

-- AddForeignKey
ALTER TABLE "Dare" ADD CONSTRAINT "Dare_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSlot" ADD CONSTRAINT "CampaignSlot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSlot" ADD CONSTRAINT "CampaignSlot_scoutId_fkey" FOREIGN KEY ("scoutId") REFERENCES "Scout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutCreator" ADD CONSTRAINT "ScoutCreator_activeScoutId_fkey" FOREIGN KEY ("activeScoutId") REFERENCES "Scout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoutCreator" ADD CONSTRAINT "ScoutCreator_discoveryScoutId_fkey" FOREIGN KEY ("discoveryScoutId") REFERENCES "Scout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

