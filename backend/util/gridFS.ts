import { GridFSBucket, ObjectId } from "mongodb";
import { getDb } from "./database.js";
import { Readable } from "stream";

/**
 * Stores base64 data as file in GridFS
 * @param base64Data File content as base64 string
 * @param filename Name for stored file
 * @param contentType MIME type of file
 * @returns ID of stored file
 */
export async function storeFileFromBase64(
  base64Data: string,
  filename: string,
  contentType: string = "image/jpeg"
): Promise<ObjectId> {
  const db = getDb();
  const bucket = new GridFSBucket(db);

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, "base64");

  // Create a readable stream from the buffer using Readable.from
  const readableStream = Readable.from(buffer);

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: { uploadDate: new Date() },
    });

    readableStream
      .pipe(uploadStream)
      .on("error", (error) => {
        console.error("Error during file upload:", error);
        reject(error);
      })
      .on("finish", () => {
        console.log(`File ${filename} uploaded with ID: ${uploadStream.id}`);
        resolve(uploadStream.id);
      });
  });
}

/**
 * Retrieves file as base64 string
 * @param fileId GridFS file ID
 * @returns Object with base64 content and MIME type
 * @throws If file not found
 */
export async function getFileAsBase64(
  fileId: ObjectId
): Promise<{ base64: string; contentType: string }> {
  const db = getDb();
  const bucket = new GridFSBucket(db);

  const fileInfo = await db.collection("fs.files").findOne({ _id: fileId });
  if (!fileInfo) {
    throw new Error("File not found");
  }

  const contentType = fileInfo.contentType || "image/jpeg";
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    bucket
      .openDownloadStream(fileId)
      .on("data", (chunk) => chunks.push(Buffer.from(chunk)))
      .on("error", reject)
      .on("end", () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString("base64");
        resolve({ base64, contentType });
      });
  });
}

/**
 * Gets all files in GridFS
 * @returns Array of file documents
 */
export async function listFiles() {
  const db = getDb();
  return db.collection("fs.files").find({}).toArray();
}

/**
 * Removes file from GridFS
 * @param fileId ID of file to delete
 * @returns Success status
 * @throws If deletion fails
 */
export async function deleteFile(fileId: ObjectId): Promise<boolean> {
  const db = getDb();
  const bucket = new GridFSBucket(db);
  try {
    await bucket.delete(fileId);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
