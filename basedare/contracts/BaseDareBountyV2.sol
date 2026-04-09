// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Successor bounty contract for the lower-fee growth phase.
/// @dev Keeps the same operational interface as BaseDareBounty so the app can
/// switch contracts by config instead of requiring a broad client/API rewrite.
contract BaseDareBountyV2 is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    address public immutable PLATFORM_WALLET;

    uint256 private constant PLATFORM_FEE_PERCENT = 4; // 4%
    uint256 private constant REFERRAL_FEE_PERCENT = 0; // paused for now
    uint256 private constant TOTAL_FEE_PERCENT = PLATFORM_FEE_PERCENT + REFERRAL_FEE_PERCENT; // 4%

    struct Bounty {
        uint256 amount;
        address payable streamer;
        address payable referrer;
        address backer;
        bool isVerified;
    }

    mapping(uint256 => Bounty) public bounties;

    event BountyFunded(uint256 indexed dareId, address indexed backer, uint256 amount);
    event BountyPayout(uint256 indexed dareId, uint256 streamerAmount, uint256 platformFee, uint256 referrerFee);
    event BountyRefund(uint256 indexed dareId, address indexed refundRecipient, uint256 amount);

    modifier bountyExists(uint256 _dareId) {
        require(bounties[_dareId].amount > 0, "Bounty: Does not exist");
        _;
    }

    modifier onlyActive(uint256 _dareId) {
        require(!bounties[_dareId].isVerified, "Bounty: Already processed");
        _;
    }

    address public AI_REFEREE_ADDRESS;

    modifier onlyReferee() {
        require(msg.sender == AI_REFEREE_ADDRESS, "Bounty: Not the AI Referee");
        _;
    }

    constructor(address _usdc, address _platformWallet) Ownable(msg.sender) {
        require(_usdc != address(0), "Bounty: USDC is zero address");
        require(_platformWallet != address(0), "Bounty: Platform wallet is zero address");
        USDC = IERC20(_usdc);
        PLATFORM_WALLET = _platformWallet;
    }

    function setAIRefereeAddress(address _newReferee) public onlyOwner {
        require(_newReferee != address(0), "Bounty: Referee is zero address");
        AI_REFEREE_ADDRESS = _newReferee;
    }

    function fundBounty(
        uint256 _dareId,
        address _streamer,
        address _referrer,
        uint256 _amount
    ) external nonReentrant {
        require(_amount > 0, "Bounty: Amount must be greater than zero");
        require(bounties[_dareId].amount == 0, "Bounty: Already exists");
        require(_streamer != address(0), "Bounty: Streamer is zero address");

        USDC.safeTransferFrom(msg.sender, address(this), _amount);

        bounties[_dareId] = Bounty({
            amount: _amount,
            streamer: payable(_streamer),
            referrer: payable(_referrer),
            backer: msg.sender,
            isVerified: false
        });

        emit BountyFunded(_dareId, msg.sender, _amount);
    }

    function verifyAndPayout(uint256 _dareId) external nonReentrant onlyReferee bountyExists(_dareId) onlyActive(_dareId) {
        Bounty storage bounty = bounties[_dareId];

        bounty.isVerified = true;
        uint256 totalAmount = bounty.amount;

        uint256 referrerFee = (totalAmount * REFERRAL_FEE_PERCENT) / 100;
        uint256 platformFee = (totalAmount * PLATFORM_FEE_PERCENT) / 100;
        uint256 streamerAmount = totalAmount - referrerFee - platformFee;

        if (referrerFee > 0 && bounty.referrer != address(0)) {
            USDC.safeTransfer(bounty.referrer, referrerFee);
        }

        USDC.safeTransfer(PLATFORM_WALLET, platformFee);
        USDC.safeTransfer(bounty.streamer, streamerAmount);

        emit BountyPayout(_dareId, streamerAmount, platformFee, referrerFee);

        delete bounties[_dareId];
    }

    function refundBacker(uint256 _dareId) external nonReentrant onlyReferee bountyExists(_dareId) onlyActive(_dareId) {
        Bounty storage bounty = bounties[_dareId];

        bounty.isVerified = true;
        uint256 totalAmount = bounty.amount;
        address originalBacker = bounty.backer;

        require(originalBacker != address(0), "Refund: Invalid backer address");
        USDC.safeTransfer(originalBacker, totalAmount);

        emit BountyRefund(_dareId, originalBacker, totalAmount);
        delete bounties[_dareId];
    }

    function rescueERC20(address _token, uint256 _amount) public onlyOwner {
        require(_token != address(USDC), "Cannot rescue USDC");
        IERC20(_token).safeTransfer(owner(), _amount);
    }

    function platformFeePercent() external pure returns (uint256) {
        return PLATFORM_FEE_PERCENT;
    }

    function referralFeePercent() external pure returns (uint256) {
        return REFERRAL_FEE_PERCENT;
    }

    function totalFeePercent() external pure returns (uint256) {
        return TOTAL_FEE_PERCENT;
    }
}
