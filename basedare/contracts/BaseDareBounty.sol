// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Contract deployed on Base L2 (assuming USDC address is known)
contract BaseDareBounty is Ownable {
    // --- STATE VARIABLES ---
    IERC20 public immutable USDC; 
    address public immutable HOUSE_WALLET;

    // Fees are 1% for referrer and 10% for house (11% total)
    uint256 private constant REFERRAL_FEE_PERCENT = 1; // 1%
    uint256 private constant HOUSE_FEE_PERCENT = 10; // 10%
    uint256 private constant TOTAL_FEE_PERCENT = REFERRAL_FEE_PERCENT + HOUSE_FEE_PERCENT; // 11%

    // Struct to hold locked bounty data
    struct Bounty {
        uint256 amount;
        address payable streamer;
        address payable referrer;
        bool isVerified;
    }

    // Mapping: dareId => Bounty data
    mapping(uint256 => Bounty) public bounties;

    // --- EVENTS ---
    event BountyStaked(uint256 indexed dareId, address indexed staker, uint256 amount);
    event BountyPayout(uint256 indexed dareId, uint256 streamerAmount, uint256 houseFee, uint256 referrerFee);
    event BountyRefund(uint256 indexed dareId, address indexed refundRecipient, uint256 amount);

    // --- MODIFIERS ---
    modifier bountyExists(uint256 _dareId) {
        require(bounties[_dareId].amount > 0, "Bounty: Does not exist");
        _;
    }

    // Only the designated AI Referee (set by owner) can trigger payout/refund
    address public AI_REFEREE_ADDRESS;
    modifier onlyReferee() {
        require(msg.sender == AI_REFEREE_ADDRESS, "Bounty: Not the AI Referee");
        _;
    }

    // --- CONSTRUCTOR ---
    constructor(address _usdc, address _houseWallet) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        HOUSE_WALLET = _houseWallet;
    }

    // --- OWNER/ADMIN FUNCTIONS ---
    function setAIRefereeAddress(address _newReferee) public onlyOwner {
        AI_REFEREE_ADDRESS = _newReferee;
    }

    // --- PRIMARY FUNCTION: STAKE ---
    function stakeBounty(
        uint256 _dareId,
        address _streamer,
        address _referrer,
        uint256 _amount
    ) external {
        // 1. Basic checks
        require(_amount > 0, "Bounty: Amount must be greater than zero");
        require(bounties[_dareId].amount == 0, "Bounty: Already exists");
        
        // 2. Lock the USDC (requires pre-approval from staker)
        require(USDC.transferFrom(msg.sender, address(this), _amount), "Bounty: USDC transfer failed");

        // 3. Store the bounty data
        bounties[_dareId] = Bounty({
            amount: _amount,
            streamer: payable(_streamer),
            referrer: payable(_referrer),
            isVerified: false
        });

        emit BountyStaked(_dareId, msg.sender, _amount);
    }

    // --- EXECUTION FUNCTION: PAYOUT (Called by AI Referee) ---
    function verifyAndPayout(uint256 _dareId) external onlyReferee bountyExists(_dareId) {
        Bounty storage bounty = bounties[_dareId];
        require(!bounty.isVerified, "Bounty: Already processed");

        // Mark as processed immediately
        bounty.isVerified = true;
        uint256 totalAmount = bounty.amount;

        // --- FEE CALCULATION ---
        uint256 referrerFee = (totalAmount * REFERRAL_FEE_PERCENT) / 100;
        uint256 houseFee = (totalAmount * HOUSE_FEE_PERCENT) / 100;
        uint256 streamerAmount = totalAmount - referrerFee - houseFee;

        // --- TRANSFERS (The House Always Wins) ---

        // 1. Referral Payout (The Money Printer)
        require(USDC.transfer(bounty.referrer, referrerFee), "Payout: Referrer transfer failed");

        // 2. House Rake (The Core Revenue)
        require(USDC.transfer(HOUSE_WALLET, houseFee), "Payout: House transfer failed");

        // 3. Streamer Payout
        require(USDC.transfer(bounty.streamer, streamerAmount), "Payout: Streamer transfer failed");

        emit BountyPayout(_dareId, streamerAmount, houseFee, referrerFee);

        // Clear bounty storage (optional for gas savings, but useful for state clarity)
        delete bounties[_dareId];
    }

    // --- FAILURE FUNCTION: REFUND / RAGE FUNNEL (Called by AI Referee) ---
    // For now, only the original staker can get the funds back upon expiry.
    function refundStaker(uint256 _dareId, address _staker) external onlyReferee bountyExists(_dareId) {
        Bounty storage bounty = bounties[_dareId];
        require(!bounty.isVerified, "Bounty: Already processed");

        // Mark as processed
        bounty.isVerified = true;
        uint256 totalAmount = bounty.amount;

        // Refund the full amount 
        require(USDC.transfer(_staker, totalAmount), "Refund: Staker transfer failed");

        emit BountyRefund(_dareId, _staker, totalAmount);
        delete bounties[_dareId];
    }

    // Emergency function to recover misplaced ERC20 tokens
    function rescueERC20(address _token, uint256 _amount) public onlyOwner {
        require(_token != address(USDC), "Cannot rescue USDC");
        IERC20(_token).transfer(owner(), _amount);
    }
}







