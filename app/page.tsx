"use client";
import { useEffect, useRef, useState } from "react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import QRCode from "react-qr-code";

export default function Home() {
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState<string | undefined>(undefined);
  const [isOver18, setIsOver18] = useState<boolean | undefined>(undefined);
  const [queryUrl, setQueryUrl] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const zkPassportRef = useRef<ZKPassport | null>(null);

  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport(window.location.hostname);
    }
  }, []);

  const createRequest = async () => {
    if (!zkPassportRef.current) {
      return;
    }
    setFirstName("");
    setMessage("");
    setQueryUrl("");
    setIsOver18(undefined);
    setUniqueIdentifier("");
    setVerified(undefined);

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of firstname and adulthood",
      scope: "adult-check",
      mode: "fast",
      devMode: true,
    });

    const {
      url,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError,
    } = queryBuilder
      .disclose("firstname")
      .gte("age", 18)
      .disclose("document_type")
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

    onProofGenerated((result: ProofResult) => {
      proofs.push(result);
      setMessage(`Proofs received`);
      setRequestInProgress(false);
    });

    // FIX: Use uniqueIdentifier and actually set it!
    onResult(async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
      setFirstName(result?.firstname?.disclose?.result);
      setIsOver18(result?.age?.gte?.result);
      setMessage("Result received");
      setUniqueIdentifier(uniqueIdentifier || "");
      setVerified(verified);
      setRequestInProgress(false);

      await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify({
          queryResult: result,
          proofs,
          domain: window.location.hostname,
        }),
      });
    });

    onReject(() => {
      setMessage("User rejected the request");
      setRequestInProgress(false);
    });

    onError(() => {
      setMessage("An error occurred");
      setRequestInProgress(false);
    });
  };

  return (
    <main className="w-full h-full flex flex-col items-center p-10">
      {queryUrl && <QRCode className="mb-4" value={queryUrl} />}
      {message && <p>{message}</p>}
      {firstName && (
        <p className="mt-2">
          <b>Firstname:</b> {firstName}
        </p>
      )}
      {typeof isOver18 === "boolean" && (
        <p className="mt-2">
          <b>Is over 18:</b> {isOver18 ? "Yes" : "No"}</p>
      )}
      {uniqueIdentifier && (
        <p className="mt-2">
          <b>Unique identifier:</b> {uniqueIdentifier}</p>
      )}
      {verified !== undefined && (
        <p className="mt-2">
          <b>Verified:</b> {verified ? "Yes" : "No"}</p>
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