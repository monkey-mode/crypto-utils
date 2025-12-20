import { Storage } from "@google-cloud/storage";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

// Increase body size limit for large files (Next.js default is 4.5MB)
export const maxDuration = 300; // 5 minutes for large file uploads
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Parse FormData
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const bucketName = formData.get("bucketName") as string;
    const pathLocation = formData.get("pathLocation") as string;
    const fileName = formData.get("fileName") as string;
    const fileType = formData.get("fileType") as string;
    const serviceAccountJsonStr = formData.get("serviceAccountJson") as string;

    // Validate required fields
    if (!file || !bucketName || !pathLocation || !serviceAccountJsonStr) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Parse service account JSON
    let serviceAccountJson;
    try {
      serviceAccountJson = JSON.parse(serviceAccountJsonStr);
    } catch {
      return NextResponse.json({ error: "Invalid service account JSON format" }, { status: 400 });
    }

    // Validate service account JSON
    if (!serviceAccountJson.type || serviceAccountJson.type !== "service_account") {
      return NextResponse.json({ error: "Invalid service account JSON: must be a service account type" }, { status: 400 });
    }

    // Initialize GCS client with service account
    const storage = new Storage({
      credentials: serviceAccountJson
    });

    // Construct the full object path
    const pathPrefix = pathLocation.endsWith("/") ? pathLocation : `${pathLocation}/`;
    const finalObjectName = fileName;
    const fullPath = `${pathPrefix}${finalObjectName}`;

    // Get bucket
    const bucket = storage.bucket(bucketName);

    // Create file reference
    const gcsFile = bucket.file(fullPath);

    // Get file size for resumable upload decision
    const fileSize = file.size;

    // Upload file with resumable upload for large files
    // Stream directly from File to GCS without loading into memory
    const writeStream = gcsFile.createWriteStream({
      metadata: {
        contentType: fileType || "application/octet-stream"
      },
      resumable: fileSize > 5 * 1024 * 1024 // Enable resumable for files > 5MB
    });

    // Convert Web File stream to Node.js stream
    // This avoids loading the entire file into memory
    const fileStream = file.stream();
    const reader = fileStream.getReader();

    // Manually convert Web ReadableStream to Node.js Readable stream
    // This avoids type compatibility issues between Web and Node stream types
    const nodeStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read();
          if (done) {
            this.push(null); // End of stream
            reader.releaseLock();
          } else {
            // Convert Uint8Array to Buffer for Node.js
            this.push(Buffer.from(value));
          }
        } catch (error) {
          reader.releaseLock();
          this.destroy(error instanceof Error ? error : new Error(String(error)));
        }
      }
    });

    // Pipe the stream to GCS and return response
    return new Promise<NextResponse>((resolve) => {
      writeStream.on("error", (error) => {
        console.error("GCS upload stream error:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to upload file to GCS";
        const errorDetails = error && typeof error === "object" && "code" in error ? String(error.code) : "Unknown error";
        resolve(
          NextResponse.json(
            {
              error: errorMessage,
              details: errorDetails
            },
            { status: 500 }
          )
        );
      });

      writeStream.on("finish", () => {
        resolve(
          NextResponse.json({
            success: true,
            objectName: fullPath,
            bucket: bucketName,
            message: `File uploaded successfully to gs://${bucketName}/${fullPath}`
          })
        );
      });

      nodeStream.on("error", (error) => {
        console.error("File stream error:", error);
        writeStream.destroy(error instanceof Error ? error : new Error(String(error)));
      });

      nodeStream.pipe(writeStream);
    });
  } catch (error) {
    console.error("GCS upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload file to GCS";
    const errorDetails = error && typeof error === "object" && "code" in error ? String(error.code) : "Unknown error";
    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}
