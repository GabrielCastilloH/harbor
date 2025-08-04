import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

// @ts-ignore
async function logToNtfy(msg: string) {
  try {
    await fetch("https://ntfy.sh/harbor-debug-randomr", {
      method: "POST",
      body: msg,
    });
  } catch (error) {
    // Don't throw
  }
}

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
          console.log("Could not get reported user email:", error);
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

      // Log the report for monitoring
      await logToNtfy(
        `🚩 NEW REPORT: ${reporterEmail} reported ${
          finalReportedUserEmail || reportedUserId
        } for ${reason}`
      );

      return {
        message: "Report created successfully",
        reportId: reportRef.id,
      };
    } catch (error: any) {
      console.error("Error creating report:", error);
      await logToNtfy(`❌ REPORT ERROR: ${error.message}`);

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
 * Creates a report and unmatch users in a single transaction
 */
export const createReportAndUnmatch = functions.https.onCall(
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
          console.log("Could not get reported user email:", error);
        }
      }

      // Perform both operations in a single transaction
      const result = await db.runTransaction(async (transaction) => {
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

        const reportRef = db.collection("reports").doc();
        transaction.set(reportRef, reportData);

        // 2. Get the match document
        const matchDoc = await transaction.get(
          db.collection("matches").doc(matchId)
        );
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

        // 3. Deactivate the match
        transaction.update(db.collection("matches").doc(matchId), {
          isActive: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 4. Remove match from both users' currentMatches arrays
        transaction.update(db.collection("users").doc(matchData.user1Id), {
          currentMatches: admin.firestore.FieldValue.arrayRemove(matchId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.update(db.collection("users").doc(matchData.user2Id), {
          currentMatches: admin.firestore.FieldValue.arrayRemove(matchId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          reportId: reportRef.id,
          matchId: matchId,
          user1Id: matchData.user1Id,
          user2Id: matchData.user2Id,
        };
      });

      // Log the report and unmatch for monitoring
      await logToNtfy(
        `🚩 REPORT & UNMATCH: ${reporterEmail} reported and unmatched from ${
          finalReportedUserEmail || reportedUserId
        } for ${reason}`
      );

      return {
        message: "Report created and users unmatched successfully",
        reportId: result.reportId,
        matchId: result.matchId,
      };
    } catch (error: any) {
      console.error("Error creating report and unmatching:", error);
      await logToNtfy(`❌ REPORT & UNMATCH ERROR: ${error.message}`);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to create report and unmatch users"
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

export const reportFunctions = {
  createReport,
  createReportAndUnmatch,
  getReports,
  updateReportStatus,
};
