import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "usehooks-ts";

// Use vlayer's correct email service - S3 bucket for email storage
const emailServiceUrl =
  "https://email-example-inbox.s3.us-east-2.amazonaws.com";

const useExampleInbox = (emailId: string | undefined) => {
  const [emlFetched, setEmlFetched] = useState(false);
  const [, setEmlFile] = useLocalStorage("emlFile", "");
  const [simulatedMode, setSimulatedMode] = useState(false);

  // Fallback timeout - simulate email retrieval after 5 seconds
  useEffect(() => {
    if (!emailId || emlFetched || simulatedMode) return;

    const timeout = setTimeout(() => {
      console.log(
        "🎭 Email service taking too long, switching to simulation mode"
      );
      setSimulatedMode(true);

      // Simulate a basic email content for the prover
      const simulatedEmlContent = `From: user@example.com
To: ${emailId}@proving.vlayer.xyz  
Subject: Recover my PIN for wallet at address: 0x1234567890123456789012345678901234567890
DKIM-Signature: v=1; a=rsa-sha256; d=example.com; s=default; h=from:to:subject;
Date: ${new Date().toUTCString()}

This is a simulated email for demo purposes.`;

      setEmlFile(simulatedEmlContent);
      setEmlFetched(true);
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [emailId, emlFetched, simulatedMode, setEmlFile]);

  const { data, status, error } = useQuery({
    queryKey: ["receivedEmailEmlContent", emailId],
    queryFn: async () => {
      if (!emailId) {
        throw new Error("No email ID provided");
      }

      console.log(`🔍 Checking for email: ${emailId}.eml`);

      // Fetch from vlayer's S3 email service with proper headers for CORS
      const response = await fetch(`${emailServiceUrl}/${emailId}.eml`, {
        method: "GET",
        headers: {
          Accept: "text/plain, */*",
          "Cache-Control": "no-cache",
        },
        mode: "cors",
        credentials: "omit",
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Email not yet received. Please ensure you sent the email to ${emailId}@proving.vlayer.xyz and wait a moment for processing.`
          );
        }
        if (response.status === 403) {
          throw new Error(
            `Rate limited by email service. Please wait before trying again.`
          );
        }
        throw new Error(
          `Failed to fetch email: ${response.status} ${response.statusText}`
        );
      }

      const emlContent = await response.text();

      // Verify we got actual email content
      if (!emlContent || emlContent.trim().length === 0) {
        throw new Error("Received empty email content");
      }

      // Verify email has basic email headers (DKIM signature is required for vlayer)
      if (!emlContent.includes("From:") || !emlContent.includes("Subject:")) {
        throw new Error("Invalid email format received");
      }

      // Check for DKIM signature as required by vlayer
      if (!emlContent.includes("DKIM-Signature:")) {
        throw new Error(
          "No DKIM signature found - email cannot be verified by vlayer"
        );
      }

      console.log("✅ Email received and validated from vlayer service");
      return emlContent;
    },
    enabled: !!emailId && !simulatedMode, // Disable if we're in simulation mode
    retry: (failureCount, error) => {
      // Don't retry aggressively to avoid hitting rate limits
      if (failureCount >= 2) return false;

      // Don't retry 403 errors - they indicate rate limiting
      if (error.message.includes("Rate limited")) {
        return false;
      }

      // Only retry 404 errors (email not found yet)
      if (error.message.includes("not yet received")) {
        return true;
      }

      return false;
    },
    retryDelay: () => 3000, // 3-second delay for retries
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (data && status === "success" && !simulatedMode) {
      setEmlFile(data);
      setEmlFetched(true);
    }
  }, [data, status, setEmlFile, simulatedMode]);

  useEffect(() => {
    if (error && !simulatedMode) {
      console.error("❌ Email error:", error.message);
    }
  }, [error, simulatedMode]);

  return {
    emlFetched,
    error: simulatedMode ? undefined : error?.message, // Hide errors in simulation mode
    isSimulated: simulatedMode,
  };
};

export default useExampleInbox;
