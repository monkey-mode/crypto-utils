import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucketName, pathLocation, objectName, serviceAccountJson, fileData, fileName, fileType } = body;

    // Validate required fields
    if (!bucketName || !pathLocation || !serviceAccountJson || !fileData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate service account JSON
    if (!serviceAccountJson.type || serviceAccountJson.type !== "service_account") {
      return NextResponse.json({ error: "Invalid service account JSON: must be a service account type" }, { status: 400 });
    }

    // Initialize GCS client with service account
    const storage = new Storage({
      credentials: serviceAccountJson,
    });

    // Convert fileData array back to Buffer
    const fileBuffer = Buffer.from(fileData);

    // Construct the full object path
    const pathPrefix = pathLocation.endsWith("/") ? pathLocation : `${pathLocation}/`;
    const finalObjectName = objectName || fileName;
    const fullPath = `${pathPrefix}${finalObjectName}`;

    // Get bucket
    const bucket = storage.bucket(bucketName);

    // Create file reference
    const file = bucket.file(fullPath);

    // Upload file
    await file.save(fileBuffer, {
      metadata: {
        contentType: fileType || "application/octet-stream",
      },
    });

    return NextResponse.json({
      success: true,
      objectName: fullPath,
      bucket: bucketName,
      message: `File uploaded successfully to gs://${bucketName}/${fullPath}`,
    });
  } catch (error: any) {
    console.error("GCS upload error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to upload file to GCS",
        details: error.code || "Unknown error",
      },
      { status: 500 }
    );
  }
}

