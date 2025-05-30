compile:
	@circom zk/circuits/pinVerification.circom --r1cs --wasm --sym -o zk/outputs/

setup-key:
	@wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau -O zk/outputs/pot12.ptau

generate-key:
	@snarkjs groth16 setup zk/outputs/pinVerification.r1cs zk/outputs/pot12.ptau zk/outputs/pinVerification.zkey && \
	snarkjs zkey export verificationkey zk/outputs/pinVerification.zkey zk/outputs/verification_key.json
