"use client";
import { useState } from "react";
import { confirmEvidence, prepareEvidence } from "../lib/api/client";
import { submitTx } from "../lib/stellar";
import { useFreighter } from "../hooks/useFreighter";

export default function EvidenceUpload() {
  const [donationId, setDonationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cid, setCid] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { publicKey, connect, sign } = useFreighter();

  async function upload() {
    if (!file || !donationId) return;

    setStatus("uploading");
    setError(null);

    try {
      const walletPublicKey = publicKey || await connect();
      if (!walletPublicKey) throw new Error("Connect Freighter before signing");

      const form = new FormData();
      form.append("file", file);
      form.append("donation_id", donationId);

      const data = await prepareEvidence(form);
      if (!data.ipfsCid || !data.xdr) throw new Error("Evidence preparation failed");

      const signedXdr = await sign(data.xdr);
      const confirmedTxHash = await submitTx(signedXdr);

      await confirmEvidence({ donationId, ipfsCid: data.ipfsCid, txHash: confirmedTxHash });

      setCid(data.ipfsCid);
      setTxHash(confirmedTxHash);
      setStatus("done");

      setTimeout(() => {
        setDonationId("");
        setFile(null);
        setCid(null);
        setTxHash(null);
        setStatus("idle");
      }, 4000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setError(message);
      setStatus("error");
    }
  }

  const canUpload = Boolean(donationId && file && status !== "uploading");

  return (
    <div className="evidence-upload-container">
      <div className="section-header">
        <div className="section-icon">📎</div>
        <div>
          <h3 className="section-title">Upload Evidence (NGO Only)</h3>
          <p className="section-subtitle">
            Upload supported proof (image or PDF). This will be stored on IPFS.
          </p>
        </div>
      </div>

      <div className="evidence-form">
        {/* ✅ Donation ID */}
        <div className="form-group">
          <label>
            <span className="label-icon">🔢</span>
            <span>Donation ID</span>
          </label>
          <input
            className="form-control"
            placeholder="Enter donation ID"
            value={donationId}
            onChange={(e) => setDonationId(e.target.value)}
            type="number"
          />
        </div>

        {/* ✅ File Upload */}
        <div className="form-group">
          <label>
            <span className="label-icon">📁</span>
            <span>Evidence File</span>
          </label>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="form-control"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="form-hint">
            Accepted formats: JPG, PNG, GIF, PDF (max 10MB)
          </div>
        </div>

        {/* ✅ Submit */}
        <button
          className="evidence-upload-btn"
          onClick={upload}
          disabled={!canUpload}
        >
          {status === "uploading" ? "Uploading..." : "Upload Evidence"}
        </button>

        {/* ✅ Status */}
        {status !== "idle" && (
          <div className={`status-enhanced status-${status}`}>
            <div className="status-icon-container">
              {status === "uploading" && "⏳"}
              {status === "done" && "✅"}
              {status === "error" && "❌"}
            </div>

            <div className="status-message">
              {status === "uploading" && "Uploading evidence to IPFS..."}
              {status === "done" && (
                <>
                  Evidence uploaded successfully.<br />
                  CID: <code>{cid}</code>
                  {txHash && (
                    <>
                      <br />
                      Tx: <code>{txHash}</code>
                    </>
                  )}
                </>
              )}
              {status === "error" && (error || "Upload failed")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
