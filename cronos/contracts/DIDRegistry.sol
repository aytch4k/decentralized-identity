pragma solidity ^0.8.0;

contract DIDRegistry {
    struct Credential {
        string id;
        string issuer;
        string subject;
        string claim;
    }

    mapping(string => Credential) public credentials;

    function issueCredential(
        string memory id,
        string memory issuer,
        string memory subject,
        string memory claim
    ) public {
        credentials[id] = Credential(id, issuer, subject, claim);
    }

    function getCredential(string memory id) public view returns (Credential memory) {
        return credentials[id];
    }
}
