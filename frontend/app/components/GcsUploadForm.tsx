"use client";

import { startTransition, useEffect, useLayoutEffect, useState } from "react";

const STORAGE_KEY_BUCKET_NAME = "mfoa-utils-gcs-bucket-name";
const STORAGE_KEY_PATH_LOCATION = "mfoa-utils-gcs-path-location";

interface FileUploadProgress {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "processing" | "success" | "error";
  error?: string;
  objectName?: string;
}

export default function GcsUploadForm() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [bucketName, setBucketName] = useState("");
  const [pathLocation, setPathLocation] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [serviceAccountJsonFocused, setServiceAccountJsonFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Map<string, FileUploadProgress>>(new Map());

  // Load saved bucket name and path location from localStorage and mark as mounted
  useLayoutEffect(() => {
    const savedBucketName = localStorage.getItem(STORAGE_KEY_BUCKET_NAME);
    const savedPathLocation = localStorage.getItem(STORAGE_KEY_PATH_LOCATION);
    startTransition(() => {
      if (savedBucketName) {
        setBucketName(savedBucketName);
      }
      if (savedPathLocation) {
        setPathLocation(savedPathLocation);
      }
      setMounted(true);
    });
  }, []);

  // Save bucket name and path location to localStorage when they change (only after mount)
  useEffect(() => {
    if (mounted) {
      if (bucketName.trim()) {
        localStorage.setItem(STORAGE_KEY_BUCKET_NAME, bucketName);
      } else {
        localStorage.removeItem(STORAGE_KEY_BUCKET_NAME);
      }
    }
  }, [bucketName, mounted]);

  useEffect(() => {
    if (mounted) {
      if (pathLocation.trim()) {
        localStorage.setItem(STORAGE_KEY_PATH_LOCATION, pathLocation);
      } else {
        localStorage.removeItem(STORAGE_KEY_PATH_LOCATION);
      }
    }
  }, [pathLocation, mounted]);

  const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB in bytes

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      // Check file sizes
      const oversizedFiles = selectedFiles.filter((file) => file.size > MAX_FILE_SIZE);
      if (oversizedFiles.length > 0) {
        const fileNames = oversizedFiles.map((f) => f.name).join(", ");
        setError(`File size limit exceeded (4MB max): ${fileNames}. Please select smaller files.`);
        setFiles([]);
        setUploadProgress(new Map());
        // Reset file input
        e.target.value = "";
        return;
      }

      setFiles(selectedFiles);
      setError(null);
      setSuccess(null);
      // Initialize progress tracking for new files
      const newProgress = new Map(uploadProgress);
      selectedFiles.forEach((file) => {
        if (!newProgress.has(file.name)) {
          newProgress.set(file.name, {
            file,
            progress: 0,
            status: "pending"
          });
        }
      });
      setUploadProgress(newProgress);
    }
  };

  const uploadFile = async (file: File, index: number): Promise<void> => {
    const fileKey = `${file.name}-${index}`;

    // Check file size before uploading
    if (file.size > MAX_FILE_SIZE) {
      setUploadProgress((prev) => {
        const updated = new Map(prev);
        const current = updated.get(fileKey);
        if (current) {
          updated.set(fileKey, {
            ...current,
            status: "error",
            error: `File size (${formatFileSize(file.size)}) exceeds 4MB limit`
          });
        }
        return updated;
      });
      throw new Error(`File size exceeds 4MB limit`);
    }

    // Update status to uploading
    setUploadProgress((prev) => {
      const updated = new Map(prev);
      const current = updated.get(fileKey) || { file, progress: 0, status: "pending" as const };
      updated.set(fileKey, { ...current, status: "uploading", progress: 0 });
      return updated;
    });

    try {
      // Use FormData for efficient large file uploads
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucketName", bucketName.trim());
      formData.append("pathLocation", pathLocation.trim());
      formData.append("fileName", file.name);
      formData.append("fileType", file.type || "application/octet-stream");
      formData.append("serviceAccountJson", serviceAccountJson);

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress (client to server)
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress((prev) => {
              const updated = new Map(prev);
              const current = updated.get(fileKey);
              if (current) {
                updated.set(fileKey, { ...current, progress });
              }
              return updated;
            });
          }
        });

        // When upload completes, switch to "processing" while server uploads to GCS
        xhr.upload.addEventListener("load", () => {
          setUploadProgress((prev) => {
            const updated = new Map(prev);
            const current = updated.get(fileKey);
            if (current) {
              updated.set(fileKey, { ...current, status: "processing", progress: 100 });
            }
            return updated;
          });
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              setUploadProgress((prev) => {
                const updated = new Map(prev);
                const current = updated.get(fileKey);
                if (current) {
                  updated.set(fileKey, {
                    ...current,
                    status: "success",
                    progress: 100,
                    objectName: result.objectName
                  });
                }
                return updated;
              });
              resolve();
            } catch {
              reject(new Error("Failed to parse response"));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              setUploadProgress((prev) => {
                const updated = new Map(prev);
                const current = updated.get(fileKey);
                if (current) {
                  updated.set(fileKey, {
                    ...current,
                    status: "error",
                    error: error.error || "Upload failed"
                  });
                }
                return updated;
              });
              reject(new Error(error.error || "Upload failed"));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener("error", () => {
          setUploadProgress((prev) => {
            const updated = new Map(prev);
            const current = updated.get(fileKey);
            if (current) {
              updated.set(fileKey, {
                ...current,
                status: "error",
                error: "Network error"
              });
            }
            return updated;
          });
          reject(new Error("Network error"));
        });

        xhr.open("POST", "/api/gcs/upload");
        xhr.send(formData);
      });
    } catch (err) {
      setUploadProgress((prev) => {
        const updated = new Map(prev);
        const current = updated.get(fileKey);
        if (current) {
          updated.set(fileKey, {
            ...current,
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed"
          });
        }
        return updated;
      });
      throw err;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    // Check file sizes before upload
    const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map((f) => `${f.name} (${formatFileSize(f.size)})`).join(", ");
      setError(`File size limit exceeded (4MB max): ${fileNames}`);
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
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
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

    // Initialize progress for all files
    const newProgress = new Map<string, FileUploadProgress>();
    files.forEach((file, index) => {
      const fileKey = `${file.name}-${index}`;
      newProgress.set(fileKey, {
        file,
        progress: 0,
        status: "pending"
      });
    });
    setUploadProgress(newProgress);

    try {
      // Upload files sequentially to avoid overwhelming the server
      const uploadPromises = files.map((file, i) => uploadFile(file, i));
      await Promise.allSettled(uploadPromises);

      // Check final status after all uploads complete
      setTimeout(() => {
        setUploadProgress((prev) => {
          const successCount = Array.from(prev.values()).filter((p) => p.status === "success").length;
          if (successCount === files.length) {
            setSuccess(`Successfully uploaded ${successCount} file(s) to gs://${bucketName}/${pathLocation}`);
          } else if (successCount > 0) {
            const errorCount = files.length - successCount;
            setError(`${errorCount} file(s) failed to upload. Check individual file status below.`);
          }
          return prev;
        });
      }, 100);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed. Please check the console for details.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceAccountJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setServiceAccountJson(e.target.value);
  };

  const handleServiceAccountJsonBlur = () => {
    setServiceAccountJsonFocused(false);
  };

  const handleServiceAccountJsonFocus = () => {
    setServiceAccountJsonFocused(true);
  };

  const handleClear = () => {
    setFiles([]);
    setBucketName("");
    setPathLocation("");
    setServiceAccountJson("");
    setServiceAccountJsonFocused(false);
    setError(null);
    setSuccess(null);
    setUploadProgress(new Map());
    // Reset file input
    const fileInput = document.getElementById("gcs-file-input") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
            Files to Upload (Multiple files supported) <span className="text-zinc-500">(Max 4MB per file)</span>
          </label>
          <input id="gcs-file-input" type="file" multiple onChange={handleFileChange} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Selected {files.length} file(s) ({formatFileSize(files.reduce((sum, f) => sum + f.size, 0))})
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {files.map((file, index) => (
                  <p key={`${file.name}-${index}`} className="text-xs text-zinc-600 dark:text-zinc-400 pl-2">
                    • {file.name} ({formatFileSize(file.size)})
                  </p>
                ))}
              </div>
            </div>
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

        {uploadProgress.size > 0 && (
          <div>
            <label className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">Upload Progress</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Array.from(uploadProgress.entries()).map(([key, progress]) => (
                <div key={key} className="border border-zinc-300 dark:border-zinc-700 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-black dark:text-zinc-50 truncate flex-1 mr-2">{progress.file.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${progress.status === "success" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : progress.status === "error" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : progress.status === "processing" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" : progress.status === "uploading" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>{progress.status === "success" ? "✓ Success" : progress.status === "error" ? "✗ Error" : progress.status === "processing" ? "⏳ Processing..." : progress.status === "uploading" ? `Uploading ${progress.progress}%` : "Pending"}</span>
                  </div>
                  {(progress.status === "uploading" || progress.status === "processing") && (
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 mt-1">
                      <div className={`h-1.5 rounded-full transition-all duration-300 ${progress.status === "processing" ? "bg-yellow-500 animate-pulse" : "bg-blue-600"}`} style={{ width: `${progress.progress}%` }} />
                    </div>
                  )}
                  {progress.status === "error" && progress.error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{progress.error}</p>}
                  {progress.status === "success" && progress.objectName && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      gs://{bucketName}/{progress.objectName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="service-account-json" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            Service Account JSON <span className="text-red-500">*</span>
          </label>
          <textarea id="service-account-json" value={serviceAccountJson} onChange={handleServiceAccountJsonChange} onBlur={handleServiceAccountJsonBlur} onFocus={handleServiceAccountJsonFocus} placeholder='{"type": "service_account", "project_id": "...", ...}' rows={8} className={`w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-y font-mono transition-all ${serviceAccountJson && !serviceAccountJsonFocused ? "" : ""}`} style={serviceAccountJson && !serviceAccountJsonFocused ? { filter: "blur(4px)" } : {}} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Paste your GCS service account JSON credentials {serviceAccountJson && !serviceAccountJsonFocused && "(blurred for security)"}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={handleUpload} disabled={loading || files.length === 0 || !bucketName.trim() || !pathLocation.trim() || !serviceAccountJson.trim()} className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all active:scale-98 active:bg-blue-800 disabled:active:scale-100">
            {loading ? `Uploading ${files.length} file(s)...` : `Upload ${files.length > 0 ? `${files.length} ` : ""}File(s) to GCS`}
          </button>
          <button onClick={handleClear} disabled={loading} className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:bg-zinc-400 disabled:cursor-not-allowed text-black dark:text-zinc-50 font-medium rounded-lg transition-all active:scale-98 disabled:active:scale-100">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
