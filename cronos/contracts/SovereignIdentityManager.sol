// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Sovereign Identity Manager
 * @notice Manages DIDs and a secure vault for credentials with NFT-based ownership
 * @dev Extends ERC-721 with vault CID storage and export authorization
 */
contract SovereignIdentityManager is ERC721 {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    struct Identity {
        address wallet;
        bytes32[] merkleRoots;    // Roots of sharded vault contents
        bytes32 commitment;       // Hash of (merkleRoots, secret)
        string vaultCid;          // IPFS CID of the encrypted vault
        bool isActive;
        uint256 createdAt;
        string region;
        bytes[] regionalSignatures;
        uint256 identityTokenId;
        uint256 exportTokenId;    // 0 if none
    }

    // Mapping from wallet address to its Identity struct
    mapping(address => Identity) public identities;
    
    // Mapping to track commitment uniqueness
    mapping(bytes32 => bool) public commitmentExists;
    
    // Mapping from region to authorized nodes
    mapping(string => address[]) public regionNodes;
    
    // Mapping from token ID to metadata
    mapping(uint256 => bytes) public tokenMetadata;

    // Contract owner
    address public immutable owner;
    
    // Minimum required signatures for regional validation
    uint256 public constant MIN_SIGNATURES = 2;

    // Events
    event IdentityRegistered(address indexed wallet, bytes32 commitment, string vaultCid, string region, uint256 tokenId, uint256 timestamp);
    event VaultUpdated(address indexed wallet, bytes32 newCommitment, string newVaultCid, uint256 timestamp);
    event ExportAuthorized(address indexed wallet, uint256 exportTokenId, uint256 timestamp);
    event IdentityRevoked(address indexed wallet, uint256 timestamp);

    /**
     * @notice Restricts function access to the wallet owner
     * @param wallet The address to check against msg.sender
     */
    modifier onlyWalletOwner(address wallet) {
        require(msg.sender == wallet, "Caller is not the wallet owner");
        _;
    }

    /**
     * @notice Ensures the identity exists and is active
     * @param wallet The address to check
     */
    modifier identityExists(address wallet) {
        require(identities[wallet].isActive, "Identity is inactive or does not exist");
        _;
    }

    /**
     * @notice Restricts function access to the contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    /**
     * @notice Constructor to set up regional nodes and contract owner
     * @param euNodes Array of authorized node addresses for EU region
     * @param usNodes Array of authorized node addresses for US region
     */
    constructor(address[] memory euNodes, address[] memory usNodes) ERC721("SovereignDiD", "SDID") {
        owner = msg.sender;
        regionNodes["EU"] = euNodes;
        regionNodes["US"] = usNodes;
    }

    /**
     * @notice Registers an identity with a secure vault
     * @param merkleRoots Roots of sharded vault contents
     * @param commitment Hash of (merkleRoots, secret)
     * @param vaultCid IPFS CID of the encrypted vault
     * @param region User's jurisdiction (e.g., "EU", "US")
     * @param signatures Multi-sig from regional nodes
     * @param metadata NFT metadata with vault reference
     */
    function registerIdentity(
        bytes32[] memory merkleRoots,
        bytes32 commitment,
        string memory vaultCid,
        string memory region,
        bytes[] memory signatures,
        bytes memory metadata
    ) external {
        address wallet = msg.sender;
        require(!identities[wallet].isActive, "Wallet already has an active identity");
        require(!commitmentExists[commitment], "Commitment already registered");

        // Verify region and signatures
        address[] memory nodes = regionNodes[region];
        require(nodes.length > 0, "Region not supported");
        require(signatures.length >= MIN_SIGNATURES, "Insufficient signatures");
        
        uint256 validSigs = 0;
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = recoverSigner(keccak256(abi.encodePacked(wallet, commitment, region)), signatures[i]);
            if (isNodeInRegion(signer, region)) validSigs++;
        }
        require(validSigs >= MIN_SIGNATURES, "Invalid regional signatures");

        // Mint identity NFT
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        _mint(wallet, tokenId);
        tokenMetadata[tokenId] = metadata;

        // Store identity data
        identities[wallet] = Identity({
            wallet: wallet,
            merkleRoots: merkleRoots,
            commitment: commitment,
            vaultCid: vaultCid,
            isActive: true,
            createdAt: block.timestamp,
            region: region,
            regionalSignatures: signatures,
            identityTokenId: tokenId,
            exportTokenId: 0
        });
        commitmentExists[commitment] = true;

        emit IdentityRegistered(wallet, commitment, vaultCid, region, tokenId, block.timestamp);
    }

    /**
     * @notice Updates the secure vault
     * @param newMerkleRoots New roots of sharded vault contents
     * @param newCommitment New hash of (newMerkleRoots, secret)
     * @param newVaultCid New IPFS CID of the updated vault
     */
    function updateVault(
        bytes32[] memory newMerkleRoots,
        bytes32 newCommitment,
        string memory newVaultCid
    ) external onlyWalletOwner(msg.sender) identityExists(msg.sender) {
        address wallet = msg.sender;
        bytes32 oldCommitment = identities[wallet].commitment;

        // Update identity data
        identities[wallet].merkleRoots = newMerkleRoots;
        identities[wallet].commitment = newCommitment;
        identities[wallet].vaultCid = newVaultCid;
        
        // Update commitment tracking
        commitmentExists[oldCommitment] = false;
        commitmentExists[newCommitment] = true;

        emit VaultUpdated(wallet, newCommitment, newVaultCid, block.timestamp);
    }

    /**
     * @notice Authorizes vault data export with an NFT
     * @param metadata Metadata for export (e.g., consent, encryption key)
     */
    function authorizeExport(bytes memory metadata) external onlyWalletOwner(msg.sender) identityExists(msg.sender) {
        address wallet = msg.sender;
        require(identities[wallet].exportTokenId == 0, "Export token already minted");

        // Mint export NFT
        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();
        _mint(wallet, tokenId);
        tokenMetadata[tokenId] = metadata;
        identities[wallet].exportTokenId = tokenId;

        emit ExportAuthorized(wallet, tokenId, block.timestamp);
    }

    /**
     * @notice Revokes the caller's identity, deactivating it
     */
    function revokeIdentity() external onlyWalletOwner(msg.sender) identityExists(msg.sender) {
        address wallet = msg.sender;
        bytes32 commitment = identities[wallet].commitment;

        // Deactivate the identity
        identities[wallet].isActive = false;
        commitmentExists[commitment] = false;

        emit IdentityRevoked(wallet, block.timestamp);
    }

    /**
     * @notice Retrieves identity details for a given wallet address
     * @param wallet The wallet address to query
     * @return Identity struct containing all identity data
     */
    function getIdentity(address wallet) external view returns (Identity memory) {
        return identities[wallet];
    }

    /**
     * @notice Gets the metadata for a token ID
     * @param tokenId The token ID to query
     * @return bytes The metadata associated with the token
     */
    function getTokenMetadata(uint256 tokenId) external view returns (bytes memory) {
        require(_exists(tokenId), "Token does not exist");
        return tokenMetadata[tokenId];
    }

    /**
     * @notice Adds a new region with authorized nodes
     * @param region The region code (e.g., "EU", "US")
     * @param nodes Array of authorized node addresses
     */
    function addRegion(string memory region, address[] memory nodes) external onlyOwner {
        require(nodes.length >= MIN_SIGNATURES, "Insufficient nodes for region");
        regionNodes[region] = nodes;
    }

    /**
     * @notice Checks if a node is authorized for a region
     * @param node The node address to check
     * @param region The region to check against
     * @return bool True if the node is authorized for the region
     */
    function isNodeInRegion(address node, string memory region) internal view returns (bool) {
        address[] memory nodes = regionNodes[region];
        for (uint256 i = 0; i < nodes.length; i++) {
            if (nodes[i] == node) return true;
        }
        return false;
    }

    /**
     * @notice Recovers the signer of a message
     * @param message The message that was signed
     * @param signature The signature to verify
     * @return address The address that signed the message
     */
    function recoverSigner(bytes32 message, bytes memory signature) internal pure returns (address) {
        // Split the signature into r, s, v components
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // Version of signature should be 27 or 28, but some wallets use 0 or 1
        if (v < 27) {
            v += 27;
        }
        
        // Recover the signer address
        return ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message)),
            v,
            r,
            s
        );
    }
}