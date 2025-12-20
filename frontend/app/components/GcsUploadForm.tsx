"use client";

import { startTransition, useLayoutEffect, useState } from "react";

export default function GcsUploadForm() {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [bucketName, setBucketName] = useState("");
  const [pathLocation, setPathLocation] = useState("");
  const [objectName, setObjectName] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mark as mounted
  useLayoutEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setSuccess(null);
      // Auto-fill object name with file name if not set
      if (!objectName) {
        setObjectName(selectedFile.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    if (!bucketName.trim()) {
      setError("Please enter a bucket name");
      return;
    }

    if (!pathLocation.trim()) {
      setError("Please enter a path location");
      return;
    }

    if (!serviceAccountJson.trim()) {
      setError("Please provide service account JSON");
      return;
    }

    // Validate JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
      if (!serviceAccount.type || serviceAccount.type !== "service_account") {
        setError("Invalid service account JSON: must be a service account type");
        return;
      }
    } catch {
      setError("Invalid JSON format for service account");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Read file as ArrayBuffer
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      // Call API route
      const response = await fetch("/api/gcs/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bucketName: bucketName.trim(),
          pathLocation: pathLocation.trim(),
          objectName: objectName.trim() || file.name,
          serviceAccountJson: serviceAccount,
          fileData: Array.from(fileBytes),
          fileName: file.name,
          fileType: file.type
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Upload failed");
        return;
      }

      setSuccess(`File uploaded successfully to gs://${bucketName}/${pathLocation}/${result.objectName || objectName || file.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please check the console for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setBucketName("");
    setPathLocation("");
    setObjectName("");
    setServiceAccountJson("");
    setError(null);
    setSuccess(null);
    // Reset file input
    const fileInput = document.getElementById("gcs-file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full space-y-5">
      <div className="text-center mb-3 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-1.5">Upload File to Google Cloud Storage</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Upload files to GCS using service account authentication</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-2xl mx-auto">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 max-w-2xl mx-auto">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      <div className="space-y-3 mx-auto max-w-2xl">
        <div>
          <label htmlFor="gcs-file-input" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            File to Upload
          </label>
          <input id="gcs-file-input" type="file" onChange={handleFileChange} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          {file && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bucket-name" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            Bucket Name <span className="text-red-500">*</span>
          </label>
          <input id="bucket-name" type="text" value={bucketName} onChange={(e) => setBucketName(e.target.value)} placeholder="my-bucket-name" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
        </div>

        <div>
          <label htmlFor="path-location" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            Path Location <span className="text-red-500">*</span>
          </label>
          <input id="path-location" type="text" value={pathLocation} onChange={(e) => setPathLocation(e.target.value)} placeholder="folder/subfolder" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Path within the bucket (e.g., &quot;uploads/2024&quot;)</p>
        </div>

        <div>
          <label htmlFor="object-name" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            Object Name (Optional)
          </label>
          <input id="object-name" type="text" value={objectName} onChange={(e) => setObjectName(e.target.value)} placeholder="custom-filename.txt" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">If not provided, the original filename will be used</p>
        </div>

        <div>
          <label htmlFor="service-account-json" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            Service Account JSON <span className="text-red-500">*</span>
          </label>
          <textarea id="service-account-json" value={serviceAccountJson} onChange={(e) => setServiceAccountJson(e.target.value)} placeholder='{"type": "service_account", "project_id": "...", ...}' rows={8} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-y font-mono" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Paste your GCS service account JSON credentials</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleUpload} disabled={loading || !file || !bucketName.trim() || !pathLocation.trim() || !serviceAccountJson.trim()} className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all active:scale-98 active:bg-blue-800 disabled:active:scale-100">
            {loading ? "Uploading..." : "Upload to GCS"}
          </button>
          <button onClick={handleClear} disabled={loading} className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:bg-zinc-400 disabled:cursor-not-allowed text-black dark:text-zinc-50 font-medium rounded-lg transition-all active:scale-98 disabled:active:scale-100">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
