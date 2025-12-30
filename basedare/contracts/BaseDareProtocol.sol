// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BaseDareProtocol (Platinum)
 * @notice The "Truth Machine" Settlement Layer on Base L2.
 * @dev Handles USDC Escrow, Referral Splits, and Emergency Pausing.
 */
contract BaseDareProtocol is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- Configuration ---
    IERC20 public immutable usdc; // The Stablecoin Interface
    address public oracleAddress; // The Truth Machine (AI)
    
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public protocolFee = 500; // 5%
    uint256 public referralFee = 100; // 1% (Incentivize sharing)

    // --- State ---
    enum DareStatus { ACTIVE, COMPLETED, VERIFIED, FAILED }

    struct Dare {
        uint256 id;
        address creator;
        address streamer;
        uint256 totalPot;
        DareStatus status;
        bool isBrandSponsored;
        bytes verificationProof; // Raw zk-proof data
        address referrer;        // Who brought this deal?
    }

    uint256 public nextDareId;
    mapping(uint256 => Dare) public dares;
    uint256 public accumulatedFees;

    // --- Events ---
    event DareCreated(uint256 indexed dareId, address indexed streamer, uint256 amount, address referrer);
    event CapitalInjected(uint256 indexed dareId, address indexed backer, uint256 amount);
    event DareVerified(uint256 indexed dareId, bytes proof, uint256 payout);
    event FeesWithdrawn(address indexed owner, uint256 amount);
    event OracleUpdated(address newOracle);

    // --- Modifiers ---
    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Only Truth Machine can verify");
        _;
    }

    constructor(address _oracleAddress, address _usdcAddress) Ownable(msg.sender) {
        oracleAddress = _oracleAddress;
        usdc = IERC20(_usdcAddress);
    }

    // --- Core Logic ---

    // 1. Create a Dare (Deposit USDC)
    // Frontend must call `usdc.approve()` before this!
    function createDare(address _streamer, uint256 _amount, address _referrer) external whenNotPaused nonReentrant {
        require(_amount > 0, "Must stake USDC");
        
        // Pull Funds from Creator to Vault
        usdc.safeTransferFrom(msg.sender, address(this), _amount);
        
        uint256 dareId = nextDareId++;
        
        dares[dareId] = Dare({
            id: dareId,
            creator: msg.sender,
            streamer: _streamer,
            totalPot: _amount,
            status: DareStatus.ACTIVE,
            isBrandSponsored: false,
            verificationProof: "",
            referrer: _referrer
        });

        emit DareCreated(dareId, _streamer, _amount, _referrer);
    }

    // 2. Inject Capital (Crowd-Staking)
    function injectCapital(uint256 _dareId, uint256 _amount) external whenNotPaused nonReentrant {
        require(dares[_dareId].status == DareStatus.ACTIVE, "Dare not active");
        require(_amount > 0, "No capital provided");

        // Pull Funds
        usdc.safeTransferFrom(msg.sender, address(this), _amount);

        dares[_dareId].totalPot += _amount;
        emit CapitalInjected(_dareId, msg.sender, _amount);
    }

    // 3. The Truth Trigger (Called by AI)
    function verifyAndPayout(uint256 _dareId, bytes calldata _proof) external onlyOracle whenNotPaused nonReentrant {
        Dare storage dare = dares[_dareId];
        require(dare.status == DareStatus.ACTIVE, "Dare not active");

        // Update State
        dare.status = DareStatus.VERIFIED;
        dare.verificationProof = _proof;

        // Calculate Splits
        uint256 pFee = (dare.totalPot * protocolFee) / BASIS_POINTS;
        uint256 rFee = 0;
        
        // Handle Referral (if exists)
        if (dare.referrer != address(0)) {
            rFee = (dare.totalPot * referralFee) / BASIS_POINTS;
            usdc.safeTransfer(dare.referrer, rFee);
        }

        uint256 payout = dare.totalPot - pFee - rFee;
        
        accumulatedFees += pFee; // Store Protocol Fee

        // Pay the Streamer (94-95%)
        usdc.safeTransfer(dare.streamer, payout);

        emit DareVerified(_dareId, _proof, payout);
    }

    // --- Admin / Safety ---

    function setOracle(address _newOracle) external onlyOwner {
        oracleAddress = _newOracle;
        emit OracleUpdated(_newOracle);
    }

    function withdrawFees() external onlyOwner {
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        usdc.safeTransfer(owner(), amount);
        emit FeesWithdrawn(owner(), amount);
    }

    // Circuit Breakers
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
