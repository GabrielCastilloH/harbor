import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { auth } from "../firebaseConfig";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useFocusEffect } from "@react-navigation/native";
import HeaderBack from "../components/HeaderBack";

type ReportScreenParams = {
  ReportScreen: {
    reportedUserId: string;
    reportedUserEmail?: string;
    reportedUserName?: string;
    matchId?: string; // Make matchId optional
  };
};

const reportReasons = [
  "Inappropriate behavior",
  "Harassment",
  "Fake profile",
  "Spam",
  "Underage user",
  "Other",
];

export default function ReportScreen() {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const route = useRoute<RouteProp<ReportScreenParams, "ReportScreen">>();
  const navigation = useNavigation();
  const { userId: currentUserId } = useAppContext();

  const { reportedUserId, reportedUserEmail, reportedUserName, matchId } =
    route.params || {};

  // Remove the reported card when returning to home screen
  useFocusEffect(
    React.useCallback(() => {
      if (reportSubmitted) {
        // Reset the flag
        setReportSubmitted(false);
        // The card removal will be handled by the home screen
      }
    }, [reportSubmitted])
  );

  const handleBack = () => {
    navigation.goBack();
  };

  const handleBlockUser = async () => {
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? This will also unmatch you.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setIsBlocking(true);
            try {
              const functions = getFunctions();
              const currentUser = auth.currentUser;
              if (!currentUser) {
                throw new Error("User not authenticated");
              }

              const blockUser = httpsCallable(
                functions,
                "reportFunctions-blockUser"
              );

              await blockUser({
                blockedUserId: reportedUserId,
                matchId: matchId,
              });

              Alert.alert(
                "User Blocked",
                "This user has been successfully blocked.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      navigation.goBack();
                    },
                  },
                ]
              );
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert(
                "Error",
                "Failed to block user. Please try again later."
              );
            } finally {
              setIsBlocking(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Error", "Please select a reason for the report.");
      return;
    }

    if (!explanation.trim()) {
      Alert.alert("Error", "Please provide an explanation for the report.");
      return;
    }

    setIsSubmitting(true);

    try {
      const functions = getFunctions();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Use different function based on whether there's a matchId
      if (matchId && matchId.trim() !== "") {
        // Report from a match - use reportAndUnmatch
        const reportAndUnmatch = httpsCallable(
          functions,
          "reportFunctions-reportAndUnmatch"
        );

        await reportAndUnmatch({
          reportedUserId,
          reportedUserEmail,
          reportedUserName,
          reason: selectedReason,
          explanation: explanation.trim(),
          matchId,
        });
      } else {
        // Report from home screen - use createReport
        const createReport = httpsCallable(
          functions,
          "reportFunctions-createReport"
        );

        await createReport({
          reportedUserId,
          reportedUserEmail,
          reportedUserName,
          reason: selectedReason,
          explanation: explanation.trim(),
        });
      }

      setReportSubmitted(true);
      Alert.alert(
        "Report Submitted",
        "Thank you for your report. We will review it and take appropriate action.",
        [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to home screen
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBack
        title="Report User"
        onBack={handleBack}
        rightIcon={{
          text: "Block",
          textStyle: styles.blockButtonText,
          onPress: handleBlockUser,
          disabled: isBlocking || isSubmitting,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Reason for Report</Text>
            <Text style={styles.sectionSubtitle}>
              Please select the primary reason for this report:
            </Text>

            <View style={styles.reasonsContainer}>
              {reportReasons.map((reason) => (
                <Pressable
                  key={reason}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason && styles.reasonButtonSelected,
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text
                    style={[
                      styles.reasonButtonText,
                      selectedReason === reason &&
                        styles.reasonButtonTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Additional Details</Text>
            <Text style={styles.sectionSubtitle}>
              Please provide more details about the incident:
            </Text>

            <TextInput
              style={styles.explanationInput}
              placeholder="Describe what happened..."
              placeholderTextColor={Colors.secondary500}
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <Text style={styles.note}>
              Your report will be reviewed by our team. We take all reports
              seriously and will investigate accordingly.
            </Text>

            {/* Submit button at bottom of scroll content */}
            <View style={styles.submitContainer}>
              <Pressable
                style={[
                  styles.submitButton,
                  (isSubmitting || isBlocking) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || isBlocking}
              >
                {isSubmitting ? (
                  <View style={styles.submitLoadingContainer}>
                    <ActivityIndicator
                      size="small"
                      color={Colors.secondary100}
                    />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Add padding to ensure content ends before tab bar
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.secondary500,
    marginBottom: 16,
    lineHeight: 20,
  },
  reasonsContainer: {
    marginBottom: 24,
  },
  reasonButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondary500,
    backgroundColor: Colors.secondary100,
    marginBottom: 8,
  },
  reasonButtonSelected: {
    backgroundColor: Colors.primary500,
    borderColor: Colors.primary500,
  },
  reasonButtonText: {
    fontSize: 16,
    color: Colors.primary500,
  },
  reasonButtonTextSelected: {
    color: Colors.secondary100,
    fontWeight: "bold",
  },
  explanationInput: {
    borderWidth: 1,
    borderColor: Colors.secondary500,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.primary500,
    backgroundColor: Colors.secondary100,
    minHeight: 120,
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    color: Colors.secondary500,
    lineHeight: 20,
    fontStyle: "italic",
  },
  submitContainer: {
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: Colors.strongRed,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.secondary100,
    fontSize: 16,
    fontWeight: "bold",
  },
  submitLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  blockButtonText: {
    color: Colors.strongRed,
    fontWeight: "bold",
    fontSize: 16,
  },
});
