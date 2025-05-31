import { useSearchParams } from "react-router";
import { truncateHashOrAddr } from "../../shared/lib/utils";
import { useAccount } from "wagmi";
import { sepolia } from 'viem/chains';
import { useNavigate } from "react-router";

export const SuccessContainer = () => {
  const [searchParams] = useSearchParams();
  const domain = searchParams.get("domain");
  const recipient = searchParams.get("recipient");
  const { address } = useAccount();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[30vh]">
      <div className="text-center space-y-4 text-black">
        {address && (
          <div className="text-lg">
            Your Address: <span className="font-mono">{truncateHashOrAddr(address)}</span>
            <a
              href={`${sepolia.blockExplorers.default.url}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              className="text-violet-500 hover:text-violet-600 font-medium block mt-2"
            >
              View on block explorer
            </a>
          </div>
        )}

      </div>
      <div className="mt-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-violet-500 text-white py-2 px-6 rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
