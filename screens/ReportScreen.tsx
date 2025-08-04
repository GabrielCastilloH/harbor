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
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { auth } from "../firebaseConfig";
import { getFunctions, httpsCallable } from "firebase/functions";

type ReportScreenParams = {
  ReportScreen: {
    reportedUserId: string;
    reportedUserEmail?: string;
    reportedUserName?: string;
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

  const route = useRoute<RouteProp<ReportScreenParams, "ReportScreen">>();
  const navigation = useNavigation();
  const { userId: currentUserId } = useAppContext();

  const { reportedUserId, reportedUserEmail, reportedUserName } = route.params;

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
      const createReport = httpsCallable(
        functions,
        "reportFunctions-createReport"
      );

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      await createReport({
        reportedUserId,
        reportedUserEmail,
        reportedUserName,
        reason: selectedReason,
        explanation: explanation.trim(),
      });

      Alert.alert(
        "Report Submitted",
        "Thank you for your report. We will review it and take appropriate action.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
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
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="flag" size={24} color={Colors.strongRed} />
          <Text style={styles.headerTitle}>Report User</Text>
        </View>

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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={styles.submitLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.secondary100} />
              <Text style={styles.submitButtonText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </Pressable>
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary500,
    marginLeft: 8,
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
    borderColor: Colors.secondary200,
    backgroundColor: Colors.secondary100,
    marginBottom: 8,
  },
  reasonButtonSelected: {
    backgroundColor: Colors.strongRed,
    borderColor: Colors.strongRed,
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
    borderColor: Colors.secondary200,
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
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary200,
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
});
