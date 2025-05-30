compile:
	@circom zk/circuits/pinVerification.circom --r1cs --wasm --sym -o zk/outputs/

setup-key:
	@wget https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau -O zk/outputs/pot12.ptau

generate-key:
	@snarkjs groth16 setup zk/outputs/pinVerification.r1cs zk/outputs/pot12.ptau zk/outputs/pinVerification.zkey && \
	snarkjs zkey export verificationkey zk/outputs/pinVerification.zkey zk/outputs/verification_key.json

generate-input:
	@node zk/inputs/generateInput.js

generate-witness:
	@node zk/outputs/pinVerification_js/generate_witness.js zk/outputs/pinVerification_js/pinVerification.wasm zk/inputs/input.json zk/outputs/witness.wtns

generate-proof:
	@snarkjs groth16 prove zk/outputs/pinVerification.zkey zk/outputs/witness.wtns zk/proofs/proof.json zk/proofs/public.json

verify-proof:
	@snarkjs groth16 verify zk/outputs/verification_key.json zk/proofs/public.json zk/proofs/proof.json

generate-contract:
	@snarkjs zkey export solidityverifier zk/outputs/pinVerification.zkey src/verifier.sol

simulate-verification-call:
	@snarkjs zkey export soliditycalldata zk/proofs/public.json zk/proofs/proof.json

######################################################################################

deploy-all:
	@forge script script/DeployAll.s.sol:DeployAll --rpc-url ${SEPOLIA_RPC_URL} --account burner --sender 0xFB6a372F2F51a002b390D18693075157A459641F --broadcast --verify --verifier blockscout --verifier-url https://eth-sepolia.blockscout.com/api/ -vvvv