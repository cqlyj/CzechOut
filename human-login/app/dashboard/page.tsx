"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkRegistration = async () => {
      try {
        const response = await fetch('/api/check-registration');
        if (!response.ok) {
          throw new Error('Failed to check registration status');
        }
        const data = await response.json();
        setIsRegistered(data.isRegistered);
        
        // If registered, redirect to dashboard on port 5173 after 2 seconds
        if (data.isRegistered) {
          setTimeout(() => {
            window.location.href = 'http://localhost:5173/register';
          }, 2000);
        } else {
          // If not registered, redirect to register page on port 5173
          window.location.href = 'http://localhost:5173/dashboard';
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    checkRegistration();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="border border-black rounded-3xl p-8 w-full max-w-2xl min-h-[40vh] flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        {error ? (
          <div className="text-red-500">{error}</div>
        ) : isRegistered === null ? (
          <div className="text-gray-500">Checking registration status...</div>
        ) : isRegistered ? (
          <div className="text-green-600 text-lg font-semibold">
            You are registered! Redirecting back...
          </div>
        ) : (
          <div className="text-red-500">
            You are not registered. Redirecting to register page...
          </div>
        )}
      </div>
    </div>
  );
}
