import { onObjectFinalized } from "firebase-functions/v2/storage";
import { initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { tmpdir } from "os";
import { join, dirname } from "path";
import * as fs from "fs-extra";

initializeApp();

export const blurUploadedImage = onObjectFinalized(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    const object = event.data;
    const filePath = object.name!;
    const contentType = object.contentType;

    if (!contentType?.startsWith("image/")) {
      console.log("Not an image, skipping.");
      return;
    }

    if (filePath.includes("-blurred")) {
      console.log("Already blurred, skipping.");
      return;
    }

    const bucket = getStorage().bucket(object.bucket);
    const fileName = filePath.split("/").pop()!;
    const blurredFileName = fileName.replace(".jpg", "-blurred.jpg");
    const blurredFilePath = join(dirname(filePath), blurredFileName);

    const tempLocalFile = join(tmpdir(), fileName);
    const tempLocalBlurredFile = join(tmpdir(), blurredFileName);

    // Download the image locally
    await bucket.file(filePath).download({ destination: tempLocalFile });

    // Blur the image using sharp
    await sharp(tempLocalFile).blur(7).toFile(tempLocalBlurredFile);

    // Upload blurred image
    await bucket.upload(tempLocalBlurredFile, {
      destination: blurredFilePath,
      metadata: { contentType },
    });

    // Clean up temp files
    fs.unlinkSync(tempLocalFile);
    fs.unlinkSync(tempLocalBlurredFile);

    console.log("Blurred image uploaded:", blurredFilePath);
  }
);

// Import all function modules
import { authFunctions } from "./auth/auth";
import { blurFunctions } from "./blur/blur";
import { chatFunctions } from "./chat/chat";
import { imageFunctions } from "./images/images";
import { matchFunctions } from "./matches/matches";
import { recommendationsFunctions } from "./recommendations/recommendations";
import { swipeFunctions } from "./swipes/swipes";
import { userFunctions } from "./users/users";

export {
  authFunctions,
  blurFunctions,
  chatFunctions,
  imageFunctions,
  matchFunctions,
  recommendationsFunctions,
  swipeFunctions,
  userFunctions,
};
