"use client";
import { useState } from "react";
import { authFetch } from "../lib/auth";

export default function EvidenceUpload() {
  const [donationId, setDonationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cid, setCid] = useState<string | null>(null);

  async function upload() {
    if (!file || !donationId) return;

    setStatus("uploading");
    setError(null);

    try {
      // ✅ 1. Upload file to IPFS via SECURED backend
      const form = new FormData();
      form.append("file", file);

      const res = await authFetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/evidence/upload`,
        {
          method: "POST",
          body: form,
        }
      );

      const data = await res.json();

      if (!res.ok || !data.cid) {
        throw new Error(data?.error || "IPFS upload failed");
      }

      setCid(data.cid);

      // ✅ 2. Bind Evidence to Donation (optional future hard-binding)
      // You already secured the backend evidence route for this

      setStatus("done");

      setTimeout(() => {
        setDonationId("");
        setFile(null);
        setCid(null);
        setStatus("idle");
      }, 4000);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed");
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
