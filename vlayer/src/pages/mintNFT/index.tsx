import { useEmailProofVerification } from "../../shared/hooks/useEmailProofVerification";
import { MintNFT } from "./Presentational";
import { useLocalStorage } from "usehooks-ts";

export const MintNFTContainer = () => {
  const [emlFile] = useLocalStorage("emlFile", "");

  const { currentStep, startProving, verificationError } =
    useEmailProofVerification();

  const handleProving = () => {
    console.log("start proving");
    // console.log("emlFile", emlFile);
    if (emlFile) {
      void startProving(emlFile);
    }
  };

  return (
    <MintNFT
      currentStep={currentStep}
      handleProving={handleProving}
      verificationError={verificationError?.message ?? null}
    />
  );
};
