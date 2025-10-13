import * as functions from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

const MAX_SWIPES_PER_DAY = 5;

/**
 * Records a swipe and checks for matches
 */
export const createSwipe = functions.https.onCall(
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
      swiperId: string;
      swipedId: string;
      direction: "left" | "right";
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { swiperId, swipedId, direction } = request.data;

      if (!swiperId || !swipedId || !direction) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Swiper ID, swiped ID, and direction are required"
        );
      }

      const [swiperActiveMatches, swipedActiveMatches] = await Promise.all([
        db
          .collection("matches")
          .where("isActive", "==", true)
          .where("participantIds", "array-contains", swiperId)
          .get(),
        db
          .collection("matches")
          .where("isActive", "==", true)
          .where("participantIds", "array-contains", swipedId)
          .get(),
      ]);

      if (swiperActiveMatches.docs.length > 0) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Cannot swipe while you have an active match"
        );
      }

      if (swipedActiveMatches.docs.length > 0) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Cannot swipe on a user who has an active match"
        );
      }

      const result = await db.runTransaction(async (transaction) => {
        const swiperUserRef = db.collection("users").doc(swiperId);
        const swipedUserRef = db.collection("users").doc(swipedId);
        const [swiperUserDoc, swipedUserDoc] = await transaction.getAll(
          swiperUserRef,
          swipedUserRef
        );

        if (!swiperUserDoc.exists || !swipedUserDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Swiper or swiped user not found"
          );
        }

        const today = new Date();
        const todayStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const counterRef = db
          .collection("users")
          .doc(swiperId)
          .collection("counters")
          .doc("swipes");
        const counterSnap = await transaction.get(counterRef);
        const counterData = counterSnap.exists
          ? (counterSnap.data() as any)
          : {};
        const counterResetDate =
          counterData.resetDate?.toDate?.() ?? todayStart;
        let currentCount = Number(counterData.count || 0);
        if (counterResetDate < todayStart) {
          currentCount = 0;
        }
        if (currentCount >= MAX_SWIPES_PER_DAY) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            "Daily swipe limit reached"
          );
        }

        const existingSwipeDoc = await transaction.get(
          db
            .collection("swipes")
            .doc(swiperId)
            .collection("outgoing")
            .doc(swipedId)
        );

        if (existingSwipeDoc.exists) {
          return { message: "Swipe already exists", swipe: null, match: false };
        }

        const swipeData = {
          swiperId,
          swipedId,
          direction,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        let match = false;
        let matchId = null;

        if (direction === "right") {
          const otherOutgoingRef = db
            .collection("swipes")
            .doc(swipedId)
            .collection("outgoing")
            .doc(swiperId);
          const otherOutgoingSnap = await otherOutgoingRef.get();

          const otherOutgoing = otherOutgoingSnap.exists
            ? (otherOutgoingSnap.data() as any)
            : null;

          if (otherOutgoing && otherOutgoing.direction === "right") {
            match = true;
            const matchRef = db.collection("matches").doc();
            matchId = matchRef.id;

            const matchData = {
              type: "individual",
              participantIds: [swiperId, swipedId],
              matchDate: admin.firestore.FieldValue.serverTimestamp(),
              isActive: true,
              messageCount: 0,
              participantConsent: { [swiperId]: false, [swipedId]: false },
              participantViewed: { [swiperId]: false, [swipedId]: false },
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            transaction.set(matchRef, matchData);
            transaction.update(swiperUserRef, {
              currentMatches: admin.firestore.FieldValue.arrayUnion(matchId),
              isAvailable: false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.update(swipedUserRef, {
              currentMatches: admin.firestore.FieldValue.arrayUnion(matchId),
              isAvailable: false,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        const outgoingRef = db
          .collection("swipes")
          .doc(swiperId)
          .collection("outgoing")
          .doc(swipedId);
        transaction.set(outgoingRef, {
          direction,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const incomingRef = db
          .collection("swipes")
          .doc(swipedId)
          .collection("incoming")
          .doc(swiperId);
        transaction.set(incomingRef, {
          direction,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        transaction.set(
          counterRef,
          {
            count: admin.firestore.FieldValue.increment(1),
            resetDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        const result = {
          message: "Swipe recorded",
          swipe: swipeData,
          match,
          matchId,
        };

        return result;
      });

      if (result.match && "matchId" in result && result.matchId) {
        try {
          const { StreamChat } = await import("stream-chat");
          const { SecretManagerServiceClient } = await import(
            "@google-cloud/secret-manager"
          );

          const secretManager = new SecretManagerServiceClient();

          const [streamApiKeyVersion, streamApiSecretVersion] =
            await Promise.all([
              secretManager.accessSecretVersion({
                name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
              }),
              secretManager.accessSecretVersion({
                name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
              }),
            ]);

          const apiKey = streamApiKeyVersion[0].payload?.data?.toString() || "";
          const apiSecret =
            streamApiSecretVersion[0].payload?.data?.toString() || "";

          if (apiKey && apiSecret) {
            const serverClient = StreamChat.getInstance(apiKey, apiSecret);

            const channelId = [swiperId, swipedId].sort().join("-");
            const channelMembers = [swiperId, swipedId];

            const channel = serverClient.channel("messaging", channelId, {
              members: channelMembers,
              created_by_id: swiperId,
            });

            try {
              await channel.create();
            } catch (err: any) {
              if (err && err.code === 16) {
                await channel.watch();
              } else {
                throw err;
              }
            }

            try {
              await channel.update({
                matchId: result.matchId,
              } as any);

              try {
                await channel.sendMessage({
                  text: "You've matched! Start chatting now.",
                  user_id: "system",
                });

                if ("matchId" in result && result.matchId) {
                  await db.collection("matches").doc(result.matchId).update({
                    introMessageSent: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                }
              } catch (messageErr) {}
            } catch (updateErr) {}
          } else {
            console.error("❌ [SWIPES] Missing Stream API credentials");
          }
        } catch (chatError) {
          console.error(
            "Backend Error: Failed to create chat channel:",
            chatError
          );
        }
      }

      return result;
    } catch (error: any) {
      console.error("💥 [SWIPES] Error in createSwipe function:", error);
      console.error("💥 [SWIPES] Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create swipe"
      );
    }
  }
);

/**
 * Gets a user's swipe count
 */
export const countRecentSwipes = functions.https.onCall(
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
  async (request: CallableRequest<{ id: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id } = request.data;
      if (request.auth.uid !== id) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own swipe count"
        );
      }

      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const counterRef = db
        .collection("users")
        .doc(id)
        .collection("counters")
        .doc("swipes");
      const counterSnap = await counterRef.get();
      const data = counterSnap.exists ? (counterSnap.data() as any) : {};
      const resetDate = data.resetDate?.toDate?.() ?? todayStart;
      let count = Number(data.count || 0);
      if (resetDate < todayStart) {
        count = 0;
      }

      return {
        swipeCount: count,
        dailyLimit: MAX_SWIPES_PER_DAY,
        canSwipe: count < MAX_SWIPES_PER_DAY,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to count recent swipes"
      );
    }
  }
);

/**
 * Gets all swipes by a user
 */
export const getSwipesByUser = functions.https.onCall(
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
  async (request: CallableRequest<{ userId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId } = request.data;
      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own swipes"
        );
      }

      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

      const swipes = swipesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { swipes };
    } catch (error: any) {
      console.error("Error getting swipes by user:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get swipes by user"
      );
    }
  }
);

/**
 * Saves Expo push token
 */
export const savePushToken = functions.https.onCall(
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
    request: CallableRequest<{ userId: string; expoPushToken: string }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, expoPushToken } = request.data;

      if (!userId || !expoPushToken) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and Expo push token are required"
        );
      }

      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only update their own push token"
        );
      }

      await db.collection("users").doc(userId).update({
        expoPushToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { message: "Push token saved successfully" };
    } catch (error: any) {
      console.error("Error saving push token:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to save push token"
      );
    }
  }
);

export const swipeFunctions = {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
  savePushToken,
};

/**
 * Resets daily swipe counters and notifies active users
 */
export const resetDailySwipes = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "America/New_York",
    region: "us-central1",
  },
  async () => {
    const pageSize = 400;
    let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let processed = 0;

    while (true) {
      let query = db
        .collection("users")
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(pageSize);
      if (lastDoc) {
        query = query.startAfter(lastDoc.id);
      }

      const usersSnap = await query.get();
      if (usersSnap.empty) break;

      const batch = db.batch();
      const notifyTasks: Array<Promise<void>> = [];

      for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        const countersRef = db
          .collection("users")
          .doc(userId)
          .collection("counters")
          .doc("swipes");
        const countersSnap = await countersRef.get();
        if (!countersSnap.exists) continue;

        const data = countersSnap.data() as { count?: number } | undefined;
        const count = Number(data?.count || 0);

        batch.update(countersRef, {
          count: 0,
          resetDate: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (count >= 3) {
          const fcmToken =
            (userDoc.get("fcmToken") as string | undefined) || undefined;
          if (fcmToken) {
            notifyTasks.push(
              admin
                .messaging()
                .send({
                  token: fcmToken,
                  notification: {
                    title: "Daily Swipe Reset",
                    body: "Your swipes have been reset! Keep matching 🚀",
                  },
                })
                .then(() => {})
                .catch(() => {})
            );
          }
        }
      }

      await batch.commit();
      await Promise.allSettled(notifyTasks);

      processed += usersSnap.size;
      lastDoc = usersSnap.docs[usersSnap.docs.length - 1];
      if (usersSnap.size < pageSize) break;
    }

    return;
  }
);
