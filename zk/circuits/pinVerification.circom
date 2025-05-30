pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

/// Intent: 
/// 0: Register
/// 1: Transfer

template PinVerification() {
    // Private inputs
    signal input pin;       // User's private pin

    // Public inputs
    signal input walletAddress;     // Optional identity anchor
    signal input intent;            // The intent of this operation
    signal input credential_hash;   // Poseidon(walletAddress, pin, intent)
    signal input nonce;             // Anti-replay
    signal input result_hash;       // Expected result: Poseidon(credential_hash, nonce)

    // Step 1: Hash (walletAddress, pin, salt)
    component innerHasher = Poseidon(3);
    innerHasher.inputs[0] <== walletAddress;
    innerHasher.inputs[1] <== pin;
    innerHasher.inputs[2] <== intent;

    // Step 2: Constrain that it matches credential_hash
    innerHasher.out === credential_hash;

    // Step 3: Hash credential_hash with nonce
    component finalHasher = Poseidon(2);
    finalHasher.inputs[0] <== credential_hash;
    finalHasher.inputs[1] <== nonce;

    // Step 4: Constrain final result
    finalHasher.out === result_hash;
}

component main { public [walletAddress, intent, credential_hash, nonce, result_hash] } = PinVerification();