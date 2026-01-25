// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Contract deployed on Base L2 (assuming USDC address is known)
contract BaseDareBounty is Ownable, ReentrancyGuard {
    // --- STATE VARIABLES ---
    IERC20 public immutable USDC;
    address public immutable PLATFORM_WALLET;

    // Fees are 1% for referrer and 10% for platform (11% total)
    uint256 private constant REFERRAL_FEE_PERCENT = 1; // 1%
    uint256 private constant PLATFORM_FEE_PERCENT = 10; // 10%
    uint256 private constant TOTAL_FEE_PERCENT = REFERRAL_FEE_PERCENT + PLATFORM_FEE_PERCENT; // 11%

    // Struct to hold locked bounty data
    struct Bounty {
        uint256 amount;
        address payable streamer;
        address payable referrer;
        address backer;
        bool isVerified;
    }

    // Mapping: dareId => Bounty data
    mapping(uint256 => Bounty) public bounties;

    // --- EVENTS ---
    event BountyFunded(uint256 indexed dareId, address indexed backer, uint256 amount);
    event BountyPayout(uint256 indexed dareId, uint256 streamerAmount, uint256 platformFee, uint256 referrerFee);
    event BountyRefund(uint256 indexed dareId, address indexed refundRecipient, uint256 amount);

    // --- MODIFIERS ---
    modifier bountyExists(uint256 _dareId) {
        require(bounties[_dareId].amount > 0, "Bounty: Does not exist");
        _;
    }

    modifier onlyActive(uint256 _dareId) {
        require(!bounties[_dareId].isVerified, "Bounty: Already processed");
        _;
    }

    // Only the designated AI Referee (set by owner) can trigger payout/refund
    address public AI_REFEREE_ADDRESS;
    modifier onlyReferee() {
        require(msg.sender == AI_REFEREE_ADDRESS, "Bounty: Not the AI Referee");
        _;
    }

    // --- CONSTRUCTOR ---
    constructor(address _usdc, address _platformWallet) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        PLATFORM_WALLET = _platformWallet;
    }

    // --- OWNER/ADMIN FUNCTIONS ---
    function setAIRefereeAddress(address _newReferee) public onlyOwner {
        AI_REFEREE_ADDRESS = _newReferee;
    }

    // --- PRIMARY FUNCTION: FUND BOUNTY ---
    function fundBounty(
        uint256 _dareId,
        address _streamer,
        address _referrer,
        uint256 _amount
    ) external nonReentrant {
        // 1. Basic checks
        require(_amount > 0, "Bounty: Amount must be greater than zero");
        require(bounties[_dareId].amount == 0, "Bounty: Already exists");

        // 2. Lock the USDC (requires pre-approval from backer)
        require(USDC.transferFrom(msg.sender, address(this), _amount), "Bounty: USDC transfer failed");

        // 3. Store the bounty data
        bounties[_dareId] = Bounty({
            amount: _amount,
            streamer: payable(_streamer),
            referrer: payable(_referrer),
            backer: msg.sender,
            isVerified: false
        });

        emit BountyFunded(_dareId, msg.sender, _amount);
    }

    // --- EXECUTION FUNCTION: PAYOUT (Called by AI Referee) ---
    function verifyAndPayout(uint256 _dareId) external nonReentrant onlyReferee bountyExists(_dareId) onlyActive(_dareId) {
        Bounty storage bounty = bounties[_dareId];

        // Mark as processed immediately
        bounty.isVerified = true;
        uint256 totalAmount = bounty.amount;

        // --- FEE CALCULATION ---
        uint256 referrerFee = (totalAmount * REFERRAL_FEE_PERCENT) / 100;
        uint256 platformFee = (totalAmount * PLATFORM_FEE_PERCENT) / 100;
        uint256 streamerAmount = totalAmount - referrerFee - platformFee;

        // --- TRANSFERS ---

        // 1. Referral Payment
        require(USDC.transfer(bounty.referrer, referrerFee), "Payout: Referrer transfer failed");

        // 2. Platform Service Fee
        require(USDC.transfer(PLATFORM_WALLET, platformFee), "Payout: Platform transfer failed");

        // 3. Creator Reward
        require(USDC.transfer(bounty.streamer, streamerAmount), "Payout: Streamer transfer failed");

        emit BountyPayout(_dareId, streamerAmount, platformFee, referrerFee);

        // Clear bounty storage
        delete bounties[_dareId];
    }

    // --- REFUND FUNCTION (Called by AI Referee on expiry/failure) ---
    // SECURITY FIX: Uses stored backer address, not caller-provided
    function refundBacker(uint256 _dareId) external nonReentrant onlyReferee bountyExists(_dareId) onlyActive(_dareId) {
        Bounty storage bounty = bounties[_dareId];

        // Mark as processed (CEI pattern - Checks-Effects-Interactions)
        bounty.isVerified = true;
        uint256 totalAmount = bounty.amount;
        address originalBacker = bounty.backer;

        // SECURITY: Refund to STORED backer address, not caller-provided
        require(originalBacker != address(0), "Refund: Invalid backer address");
        require(USDC.transfer(originalBacker, totalAmount), "Refund: Backer transfer failed");

        emit BountyRefund(_dareId, originalBacker, totalAmount);
        delete bounties[_dareId];
    }

    // Emergency function to recover misplaced ERC20 tokens
    function rescueERC20(address _token, uint256 _amount) public onlyOwner {
        require(_token != address(USDC), "Cannot rescue USDC");
        IERC20(_token).transfer(owner(), _amount);
    }
}
