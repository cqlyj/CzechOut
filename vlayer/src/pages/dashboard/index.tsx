import { useAccount } from "wagmi";
import { v4 as uuidv4 } from "uuid";

export const DashboardContainer = () => {
  const { address } = useAccount();
  const emailId = uuidv4();

  // Placeholder data
  const balance = "1234.56";
  const recentTransactions = [
    { type: "CzechIn", desc: "xxx from 0xabc..." },
    { type: "CzechOut", desc: "xxx to 0xdef..." },
  ];

  const subject = `Mint my domain NFT at address: ${address}`;
  const uniqueEmail = `${emailId}@proving.vlayer.xyz`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black">
      <div className="border border-black rounded-3xl p-8 w-full max-w-5xl min-h-[70vh] flex flex-row gap-8 text-black">
        {/* Left Side */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <div className="text-4xl md:text-5xl font-bold mb-8 text-black" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
                Balance: {balance} USDC
              </div>
              <button className="flex items-center border border-black rounded-xl px-6 py-2 mb-2 ml-4 text-black" style={{ minWidth: 180 }}>
                <span className="w-8 h-8 rounded-full border border-black mr-2 inline-block" />
                <span className="font-mono text-lg text-black">{address ? `${address.slice(0, 5)}...` : '0xabc...'}</span>
              </button>
            </div>
            <div className="mt-8 flex flex-col gap-6">
              <button className="w-full py-6 text-2xl rounded-xl border border-black mb-2 hover:bg-gray-100 transition text-black" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
                Send
              </button>
              <button className="w-full py-6 text-2xl rounded-xl border border-black mb-2 hover:bg-gray-100 transition text-black" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
                CzechOut Now
              </button>
              <button className="w-full py-6 text-2xl rounded-xl border border-black hover:bg-gray-100 transition text-black" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
                Reset PIN
              </button>
            </div>
          </div>
        </div>
        {/* Right Side */}
        <div className="w-[350px] flex-shrink-0">
          <div className="border border-black rounded-2xl p-4 h-full flex flex-col text-black">
            <div className="text-2xl font-bold mb-2 text-black" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              Recent Transactions
            </div>
            <div className="border-t border-black pt-2 flex-1 text-black">
              {recentTransactions.map((tx, idx) => (
                <div key={idx} className="text-lg font-mono mb-1 text-black">
                  {tx.type}: {tx.desc}
                </div>
              ))}
              <div className="text-lg font-mono text-black">...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
