import { Link, useSearchParams } from "react-router";
import { truncateHashOrAddr } from "../../shared/lib/utils";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

export const RegisterContainer = () => {
  const [searchParams] = useSearchParams();
  const txHash = searchParams.get("txHash");
  const domain = searchParams.get("domain");
  const recipient = searchParams.get("recipient");
  const { address, chain } = useAccount();

  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!address) {
      setError("Wallet not connected");
      return;
    }

    // Validate inputs
    if (!email || !pin || !confirmPin) {
      setError("All fields are required");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    try {
      // Store registration data in localStorage
      localStorage.setItem('registered_address', address);
      localStorage.setItem('user_email', email);
      localStorage.setItem('user_pin', pin);
      
      // Redirect to welcome page
      window.location.href = "/dashboard";
    } catch (error) {
      console.error('Error registering:', error);
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      <div className="flex flex-col gap-4 mt-5">
        <div className="flex flex-col">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black bg-white shadow-sm focus:border-black focus:ring-black text-black"
            placeholder="Enter your email"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="pin" className="text-sm font-medium text-gray-700">
            PIN
          </label>
          <input
            type="password"
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black bg-white shadow-sm focus:border-black focus:ring-black text-black"
            placeholder="Enter your PIN"
            maxLength={6}
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="confirmPin" className="text-sm font-medium text-gray-700">
            Confirm PIN
          </label>
          <input
            type="password"
            id="confirmPin"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            className="mt-1 block w-full rounded-md border border-black bg-white shadow-sm focus:border-black focus:ring-black text-black"
            placeholder="Confirm your PIN"
            maxLength={6}
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <button 
            type="submit"
            className="mt-4 bg-violet-500 text-white py-2 px-4 rounded-md hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            id="nextButton" 
            data-testid="start-page-button"
          >
            Next
          </button>
        </div>
      </div>
    </form>
  );
};
