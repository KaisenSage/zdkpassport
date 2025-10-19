"use client";
import { useEffect, useRef, useState } from "react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import QRCode from "react-qr-code";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export default function Home() {
  const [message, setMessage] = useState("");
  const [isOver18, setIsOver18] = useState<boolean | undefined>(undefined);
  const [queryUrl, setQueryUrl] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [onChainVerified, setOnChainVerified] = useState<boolean | undefined>(undefined);
  const zkPassportRef = useRef<ZKPassport | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport(window.location.hostname);
    }
    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const createRequest = async () => {
    if (!zkPassportRef.current) {
      return;
    }
    setMessage("");
    setQueryUrl("");
    setIsOver18(undefined);
    setUniqueIdentifier("");
    setVerified(undefined);
    setOnChainVerified(undefined);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      const queryBuilder = await zkPassportRef.current.request({
        name: "ZKPassport",
        logo: "https://zkpassport.id/favicon.png",
        purpose: "Proof of adulthood",
        scope: "adult",
        mode: "compressed-evm",
        devMode: true,
      });

      // Minimal request: ONLY .gte("age", 18)
      const {
        url,
        onRequestReceived,
        onGeneratingProof,
        onProofGenerated,
        onResult,
        onReject,
        onError,
      } = queryBuilder
        .gte("age", 18)
        .done();

      setQueryUrl(url);
      setRequestInProgress(true);

      onRequestReceived(() => {
        setMessage("Request received");
      });

      onGeneratingProof(() => {
        setMessage("Generating proof...");
      });

      const proofs: ProofResult[] = [];

      onProofGenerated(async (proof: ProofResult) => {
        try {
          proofs.push(proof);
          setMessage(`Proofs received`);
          setRequestInProgress(false);

          if (!zkPassportRef.current) {
            return;
          }

          // The following on-chain verification is optional, and can be commented out for pure front-end test:
          try {
            const params = zkPassportRef.current.getSolidityVerifierParameters({
              proof,
              scope: "adult",
              devMode: true,
            });

            const { address, abi, functionName } =
              zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

            const publicClient = createPublicClient({
              chain: sepolia,
              transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
            });

            const contractCallResult = await publicClient.readContract({
              address,
              abi,
              functionName,
              args: [params],
            });

            const isVerified = Array.isArray(contractCallResult)
              ? Boolean(contractCallResult[0])
              : false;
            const contractUniqueIdentifier = Array.isArray(contractCallResult)
              ? String(contractCallResult[1])
              : "";
            setOnChainVerified(isVerified);
            setUniqueIdentifier(contractUniqueIdentifier);
          } catch (error) {
            // Just log the error, no modal shown
            console.error("Error preparing verification:", error);
          }
        } catch (error) {
          console.error("Error in onProofGenerated:", error);
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      });

      onResult(async ({ result, uniqueIdentifier, verified }) => {
        setIsOver18(result?.age?.gte?.result);
        setMessage("Result received");
        setUniqueIdentifier(uniqueIdentifier || "");
        setVerified(verified);
        setRequestInProgress(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      });

      onReject(() => {
        setMessage("User rejected the request");
        setRequestInProgress(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      });

      onError(() => {
        setMessage("An error occurred");
        setRequestInProgress(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      });
    } catch (err) {
      setRequestInProgress(false);
      console.error("Unexpected error occurred in request:", err);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  return (
    <main className="w-full h-full flex flex-col items-center p-10">
      {queryUrl && <QRCode className="mb-4" value={queryUrl} />}
      {message && <p>{message}</p>}
      {typeof isOver18 === "boolean" && (
        <p className="mt-2">
          <b>Is over 18:</b> {isOver18 ? "Yes" : "No"}
        </p>
      )}
      {uniqueIdentifier && (
        <p className="mt-2">
          <b>Unique identifier:</b> {uniqueIdentifier}
        </p>
      )}
      {verified !== undefined && (
        <p className="mt-2">
          <b>Verified:</b> {verified ? "Yes" : "No"}
        </p>
      )}
      {onChainVerified !== undefined && (
        <p className="mt-2">
          <b>On-chain verified:</b> {onChainVerified ? "Yes" : "No"}
        </p>
      )}
      {!requestInProgress && (
        <button
          className="p-4 mt-4 bg-gray-500 rounded-lg text-white font-medium"
          onClick={createRequest}
        >
          Generate new request
        </button>
      )}
    </main>
  );
}