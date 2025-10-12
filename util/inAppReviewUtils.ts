import { Alert } from "react-native";
import InAppReview from "react-native-in-app-review";

/**
 * Requests an in-app review from the user
 * @returns Promise<boolean> - true if review flow was shown/completed, false otherwise
 */
export const requestInAppReview = async (): Promise<boolean> => {
  try {
    // Check if in-app review is available on this device
    const isAvailable = InAppReview.isAvailable();

    if (!isAvailable) {
      console.log("In-app review not available on this device");
      Alert.alert(
        "Review Not Available",
        "In-app review is not available on this device. Please visit the app store to leave a review.",
        [{ text: "OK" }]
      );
      return false;
    }

    // Request the in-app review flow
    const hasFlowFinishedSuccessfully = await InAppReview.RequestInAppReview();

    if (hasFlowFinishedSuccessfully) {
      // On Android: user completed or closed the review flow
      // On iOS: review flow launched successfully
      console.log("In-app review flow completed successfully");
      return true;
    } else {
      // Flow was not shown (user may have already reviewed recently)
      console.log(
        "In-app review flow was not shown (quota reached or other reason)"
      );
      return false;
    }
  } catch (error) {
    console.error("Error requesting app review:", error);
    Alert.alert(
      "Review Error",
      "Unable to open the review dialog. Please try again later.",
      [{ text: "OK" }]
    );
    return false;
  }
};

/**
 * Checks if in-app review is available on the current device
 * @returns boolean - true if available, false otherwise
 */
export const isInAppReviewAvailable = (): boolean => {
  return InAppReview.isAvailable();
};
