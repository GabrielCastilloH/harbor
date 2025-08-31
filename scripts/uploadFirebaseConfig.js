const { StreamChat } = require("stream-chat");
const fs = require("fs");
const path = require("path");

/**
 * Upload Firebase Configuration to Stream Chat
 * This script reads the Firebase service account JSON and uploads it to Stream
 */
async function uploadFirebaseConfig() {
  try {
    console.log("🔔 Starting Firebase config upload to Stream...");

    // You need to provide your Stream API credentials here
    // Get these from: https://dashboard.getstream.io/
    const API_KEY = process.env.STREAM_API_KEY || "YOUR_STREAM_API_KEY";
    const API_SECRET = process.env.STREAM_API_SECRET || "YOUR_STREAM_API_SECRET";

    if (API_KEY === "YOUR_STREAM_API_KEY" || API_SECRET === "YOUR_STREAM_API_SECRET") {
      console.error("❌ Please set STREAM_API_KEY and STREAM_API_SECRET environment variables");
      console.log("💡 Run: export STREAM_API_KEY=your_key && export STREAM_API_SECRET=your_secret");
      process.exit(1);
    }

    // Initialize Stream client with server-side credentials
    const client = StreamChat.getInstance(API_KEY, API_SECRET);

    // Read Firebase service account JSON
    const firebaseConfigPath = path.join(
      __dirname,
      "..",
      "harbor-ch-firebase-adminsdk-fbsvc-69162087da.json"
    );

    if (!fs.existsSync(firebaseConfigPath)) {
      console.error("❌ Firebase service account file not found at:", firebaseConfigPath);
      process.exit(1);
    }

    const firebaseCredentials = fs.readFileSync(firebaseConfigPath, "utf-8");
    console.log("🔔 Firebase credentials loaded from file");

    // Validate JSON
    try {
      JSON.parse(firebaseCredentials);
    } catch (jsonError) {
      console.error("❌ Invalid JSON in Firebase credentials file:", jsonError.message);
      process.exit(1);
    }

    // Upload Firebase credentials to Stream
    console.log("🔔 Uploading Firebase config to Stream...");
    const response = await client.updateAppSettings({
      push_config: {
        version: "v2",
      },
      firebase_config: {
        credentials_json: firebaseCredentials,
      },
    });

    console.log("🔔 ✅ Firebase configuration uploaded successfully to Stream!");
    console.log("🔔 Response:", JSON.stringify(response, null, 2));

    // Wait a moment for changes to propagate
    console.log("🔔 Waiting for changes to propagate...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify the configuration
    console.log("🔔 Verifying configuration...");
    const appSettings = await client.getAppSettings();
    console.log("🔔 Full app settings:", JSON.stringify(appSettings.app, null, 2));
    
    // Access push config properties
    const app = appSettings.app;
    console.log("🔔 Current push config version:", app?.push_config?.version);
    console.log("🔔 Firebase config present:", !!app?.firebase_config);
    console.log("🔔 Available app keys:", Object.keys(app || {}));

    if (app?.firebase_config) {
      console.log("🔔 ✅ SUCCESS: Firebase config is now properly configured!");
      console.log("🔔 💡 You can now test push notifications on your device");
    } else {
      console.log("🔔 ❌ WARNING: Firebase config still not detected in verification");
      console.log("🔔 💡 Try using the Stream Dashboard web interface as backup");
    }

    return true;
  } catch (error) {
    console.error("🔔 ❌ Error uploading Firebase config to Stream:");
    console.error("Error details:", error);
    
    if (error.message?.includes("Invalid API key")) {
      console.log("💡 Check your STREAM_API_KEY - it might be incorrect");
    }
    if (error.message?.includes("signature")) {
      console.log("💡 Check your STREAM_API_SECRET - it might be incorrect");
    }
    
    return false;
  }
}

// Instructions
console.log(`
🔔 FIREBASE STREAM CONFIGURATION UPLOAD SCRIPT

USAGE:
1. Set your Stream credentials as environment variables:
   export STREAM_API_KEY="your_stream_api_key"
   export STREAM_API_SECRET="your_stream_api_secret"

2. Run this script:
   node scripts/uploadFirebaseConfig.js

NOTES:
- Get your Stream credentials from: https://dashboard.getstream.io/
- This script reads harbor-ch-firebase-adminsdk-fbsvc-69162087da.json
- Provider name will be set to "HarborFirebasePush" to match your app
- This enables Push Notifications V2
`);

// Run the upload if this file is executed directly
if (require.main === module) {
  uploadFirebaseConfig()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

module.exports = { uploadFirebaseConfig };
