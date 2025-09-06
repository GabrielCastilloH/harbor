import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Creates a report for a user
 */
export const createReport = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (
    request: CallableRequest<{
      reportedUserId: string;
      reportedUserEmail?: string;
      reportedUserName?: string;
      reason: string;
      explanation: string;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const {
        reportedUserId,
        reportedUserEmail,
        reportedUserName,
        reason,
        explanation,
      } = request.data;

      const reporterId = request.auth.uid;

      if (!reportedUserId || !reason || !explanation) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: reportedUserId, reason, or explanation"
        );
      }

      // Prevent self-reporting
      if (reporterId === reportedUserId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Cannot report yourself"
        );
      }

      // Get reporter's email
      const reporterUser = await admin.auth().getUser(reporterId);
      const reporterEmail = reporterUser.email;

      // Get reported user's email if not provided
      let finalReportedUserEmail = reportedUserEmail;
      if (!finalReportedUserEmail) {
        try {
          const reportedUser = await admin.auth().getUser(reportedUserId);
          finalReportedUserEmail = reportedUser.email;
        } catch (error) {
          console.error("Could not get reported user email:", error);
        }
      }

      // Check if this report already exists (prevent duplicate reports)
      const existingReport = await db
        .collection("reports")
        .where("reporterId", "==", reporterId)
        .where("reportedUserId", "==", reportedUserId)
        .where("reason", "==", reason)
        .limit(1)
        .get();

      if (!existingReport.empty) {
        return {
          message: "Report already exists",
          reportId: existingReport.docs[0].id,
        };
      }

      // Create the report
      const reportData = {
        reporterId,
        reporterEmail,
        reportedUserId,
        reportedUserEmail: finalReportedUserEmail,
        reportedUserName,
        reason,
        explanation,
        status: "pending", // pending, reviewed, resolved, dismissed
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const reportRef = await db.collection("reports").add(reportData);

      return {
        message: "Report created successfully",
        reportId: reportRef.id,
      };
    } catch (error: any) {
      console.error("Error creating report:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to create report"
      );
    }
  }
);

/**
 * Gets all reports (admin function)
 */
export const getReports = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      // TODO: Add admin check here when implementing admin functionality
      // For now, allow any authenticated user to view reports
      // In production, you'd want to check if the user is an admin

      const reportsSnapshot = await db
        .collection("reports")
        .orderBy("createdAt", "desc")
        .get();

      const reports = reportsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { reports };
    } catch (error: any) {
      console.error("Error getting reports:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", "Failed to get reports");
    }
  }
);

/**
 * Updates report status (admin function)
 */
export const updateReportStatus = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (
    request: CallableRequest<{
      reportId: string;
      status: "pending" | "reviewed" | "resolved" | "dismissed";
      adminNotes?: string;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { reportId, status, adminNotes } = request.data;

      if (!reportId || !status) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Report ID and status are required"
        );
      }

      // TODO: Add admin check here when implementing admin functionality

      const updateData: any = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      await db.collection("reports").doc(reportId).update(updateData);

      return {
        message: "Report status updated successfully",
      };
    } catch (error: any) {
      console.error("Error updating report status:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update report status"
      );
    }
  }
);

/**
 * Creates a report and unmatch users in a single transaction
 */
export const reportAndUnmatch = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (
    request: CallableRequest<{
      reportedUserId: string;
      reportedUserEmail?: string;
      reportedUserName?: string;
      reason: string;
      explanation: string;
      matchId: string;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const {
        reportedUserId,
        reportedUserEmail,
        reportedUserName,
        reason,
        explanation,
        matchId,
      } = request.data;

      const reporterId = request.auth.uid;

      if (!reportedUserId || !reason || !explanation || !matchId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing required fields: reportedUserId, reason, explanation, or matchId"
        );
      }

      // Prevent self-reporting
      if (reporterId === reportedUserId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Cannot report yourself"
        );
      }

      // Get reporter's email
      const reporterUser = await admin.auth().getUser(reporterId);
      const reporterEmail = reporterUser.email;

      // Get reported user's email if not provided
      let finalReportedUserEmail = reportedUserEmail;
      if (!finalReportedUserEmail) {
        try {
          const reportedUser = await admin.auth().getUser(reportedUserId);
          finalReportedUserEmail = reportedUser.email;
        } catch (error) {
          console.error("Could not get reported user email:", error);
        }
      }

      // Get the match document to verify it exists and get user IDs
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      if (!matchData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Match data not found"
        );
      }

      // Verify the requesting user is part of this match
      if (
        reporterId !== matchData.user1Id &&
        reporterId !== matchData.user2Id
      ) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User not part of this match"
        );
      }

      // Use transaction for atomic report + unmatch operations
      const reportRef = db.collection("reports").doc();
      await db.runTransaction(async (transaction) => {
        // 1. Create the report
        const reportData = {
          reporterId,
          reporterEmail,
          reportedUserId,
          reportedUserEmail: finalReportedUserEmail,
          reportedUserName,
          reason,
          explanation,
          status: "pending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        transaction.set(reportRef, reportData);

        // 2. Deactivate the match
        transaction.update(db.collection("matches").doc(matchId), {
          isActive: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. Remove match from both users' currentMatches arrays atomically
        transaction.update(db.collection("users").doc(matchData.user1Id), {
          currentMatches: admin.firestore.FieldValue.arrayRemove(matchId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.update(db.collection("users").doc(matchData.user2Id), {
          currentMatches: admin.firestore.FieldValue.arrayRemove(matchId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Freeze the chat channel and send system message (outside transaction)
      try {
        const { StreamChat } = await import("stream-chat");
        const { SecretManagerServiceClient } = await import(
          "@google-cloud/secret-manager"
        );

        const secretManager = new SecretManagerServiceClient();

        // Get Stream API credentials from Secret Manager
        const [streamApiKeyVersion, streamApiSecretVersion] = await Promise.all(
          [
            secretManager.accessSecretVersion({
              name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
            }),
            secretManager.accessSecretVersion({
              name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
            }),
          ]
        );

        const apiKey = streamApiKeyVersion[0].payload?.data?.toString() || "";
        const apiSecret =
          streamApiSecretVersion[0].payload?.data?.toString() || "";

        if (apiKey && apiSecret) {
          const serverClient = StreamChat.getInstance(apiKey, apiSecret);

          // Create channel ID (sorted to ensure consistency)
          const channelId = [matchData.user1Id, matchData.user2Id]
            .sort()
            .join("-");
          const channel = serverClient.channel("messaging", channelId);

          // Freeze the channel
          await channel.update({ frozen: true });

          // Send system message about unmatch
          await channel.sendMessage({
            text: "This chat has been frozen because one of the users unmatched.",
            user_id: "system",
          });
        }
      } catch (streamError) {
        console.error(
          "Error freezing chat or sending system message:",
          streamError
        );
        // Don't fail the operation if Stream Chat operations fail
      }

      return {
        message: "Report submitted and users unmatched successfully",
        reportId: reportRef.id,
        matchId: matchId,
      };
    } catch (error: any) {
      console.error("Error in reportAndUnmatch:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to report and unmatch users"
      );
    }
  }
);

export const reportFunctions = {
  createReport,
  getReports,
  updateReportStatus,
  reportAndUnmatch,
};
