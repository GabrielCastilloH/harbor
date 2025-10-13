import { Platform } from "react-native";

const NTFY_TOPIC = "harbor-debug-logs";
const NTFY_URL = "https://ntfy.sh";

export const logToNtfy = async (message: string, data?: any) => {
  console.log("🚀 logToNtfy called with message:", message);
  console.log("🚀 data:", data);

  try {
    const payload = {
      topic: NTFY_TOPIC,
      title: `Harbor App Log`,
      message: `${new Date().toISOString()} [${Platform.OS}] ${message}${
        data ? "\n\nData: " + JSON.stringify(data, null, 2) : ""
      }`,
      priority: 2,
      tags: ["harbor", Platform.OS],
    };

    console.log(
      "🚀 Sending payload to ntfy:",
      JSON.stringify(payload, null, 2)
    );
    console.log("🚀 NTFY_URL:", NTFY_URL);
    console.log("🚀 NTFY_TOPIC:", NTFY_TOPIC);

    const response = await fetch(NTFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("🚀 ntfy response status:", response.status);
    console.log("🚀 ntfy response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("🚀 ntfy error response:", errorText);
    }
  } catch (error) {
    console.error("🚀 Failed to send ntfy log:", error);
  }
};
