import AsyncStorage from "@react-native-async-storage/async-storage";

interface CachedImage {
  url: string;
  timestamp: number;
  type: "blurred" | "original";
  userId: string;
}

export class ImageCache {
  private static CACHE_PREFIX = "harbor_image_cache_";
  private static CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Cache an image URL
   */
  static async cacheImage(
    userId: string,
    imageUrl: string,
    type: "blurred" | "original"
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${userId}_${type}`;
      const cachedImage: CachedImage = {
        url: imageUrl,
        timestamp: Date.now(),
        type,
        userId,
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cachedImage));
    } catch (error) {
      console.error(`❌ [ImageCache] Error caching ${type} image:`, error);
    }
  }

  /**
   * Get cached image URL
   */
  static async getCachedImage(
    userId: string,
    type: "blurred" | "original"
  ): Promise<string | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${userId}_${type}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        return null;
      }

      const cachedImage: CachedImage = JSON.parse(cached);
      const isExpired = Date.now() - cachedImage.timestamp > this.CACHE_EXPIRY;

      if (isExpired) {
        await this.removeCachedImage(userId, type);
        return null;
      }

      console.log(
        `📦 [ImageCache] Retrieved cached ${type} image for user ${userId}`
      );
      return cachedImage.url;
    } catch (error) {
      console.error(
        `❌ [ImageCache] Error getting cached ${type} image:`,
        error
      );
      return null;
    }
  }

  /**
   * Remove cached image
   */
  static async removeCachedImage(
    userId: string,
    type: "blurred" | "original"
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${userId}_${type}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error(
        `❌ [ImageCache] Error removing cached ${type} image:`,
        error
      );
    }
  }

  /**
   * Clear all cached images for a user
   */
  static async clearUserCache(userId: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(
        (key) => key.startsWith(this.CACHE_PREFIX) && key.includes(userId)
      );

      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }
    } catch (error) {
      console.error(`❌ [ImageCache] Error clearing user cache:`, error);
    }
  }

  /**
   * Clear all cached images
   */
  static async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error(`❌ [ImageCache] Error clearing all cache:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalCached: number;
    expiredCount: number;
    validCount: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.CACHE_PREFIX));
      const cachedItems = await AsyncStorage.multiGet(cacheKeys);

      let expiredCount = 0;
      let validCount = 0;

      cachedItems.forEach(([key, value]) => {
        if (value) {
          const cachedImage: CachedImage = JSON.parse(value);
          const isExpired =
            Date.now() - cachedImage.timestamp > this.CACHE_EXPIRY;

          if (isExpired) {
            expiredCount++;
          } else {
            validCount++;
          }
        }
      });

      return {
        totalCached: cacheKeys.length,
        expiredCount,
        validCount,
      };
    } catch (error) {
      console.error(`❌ [ImageCache] Error getting cache stats:`, error);
      return { totalCached: 0, expiredCount: 0, validCount: 0 };
    }
  }
}
