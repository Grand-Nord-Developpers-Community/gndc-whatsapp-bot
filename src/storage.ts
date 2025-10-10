import dotenv from "dotenv";
dotenv.config();
import { Redis } from "@upstash/redis";

interface StoredItem {
  id: string;
  type: "quiz" | "meme" | "user_score" | "custom";
  data: any;
  createdAt: number;
  expiresAt?: number;
}

export class GNDCRedisStorage {
  private client: Redis;

  constructor() {
    // Upstash Redis peut utiliser les variables d'environnement ou la config explicite
    if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
    } else {
      // Utilise automatiquement UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN
      this.client = Redis.fromEnv();
    }

    console.log("✅ Client Upstash Redis initialisé");
  }

  /**
   * Teste la connexion Redis
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error: any) {
      console.error("❌ Erreur ping Upstash:", error.message);
      return false;
    }
  }

  async saveUserScore(
    userId: string,
    score: number,
    quizId?: string
  ): Promise<boolean> {
    const key = `user:${userId}:score`;
    const data = {
      userId,
      score,
      quizId,
      timestamp: Date.now(),
    };
    return this.save(key, "user_score", data);
  }

  async getUserScore(userId: string): Promise<number> {
    const data = await this.get(`user:${userId}:score`);
    return data?.score || 0;
  }

  async addUserPoints(userId: string, points: number): Promise<number> {
    const key = `user:${userId}:score`;
    try {
      const currentScore = await this.getUserScore(userId);
      const newScore = currentScore + points;
      await this.saveUserScore(userId, newScore);
      return newScore;
    } catch (error: any) {
      console.error(`❌ Erreur ajout points:`, error.message);
      return 0;
    }
  }

  async updateLeaderboard(userId: string, score: number): Promise<boolean> {
    try {
      await this.client.zadd("leaderboard:global", {
        score: score,
        member: userId,
      });
      return true;
    } catch (error: any) {
      console.error("❌ Erreur update leaderboard:", error.message);
      return false;
    }
  }

  async getLeaderboard(
    limit: number = 10
  ): Promise<Array<{ userId: string; score: number; rank: number }>> {
    try {
      // Récupérer les top scores avec ZREVRANGE
      const results = await this.client.zrange(
        "leaderboard:global",
        0,
        limit - 1,
        {
          rev: true,
          withScores: true,
        }
      );

      const leaderboard: Array<{
        userId: string;
        score: number;
        rank: number;
      }> = [];

      for (let i = 0; i < results.length; i += 2) {
        leaderboard.push({
          userId: results[i] as string,
          score: results[i + 1] as number,
          rank: Math.floor(i / 2) + 1,
        });
      }

      return leaderboard;
    } catch (error: any) {
      console.error("❌ Erreur récupération leaderboard:", error.message);
      return [];
    }
  }

  async save(
    key: string,
    type: StoredItem["type"],
    data: any,
    ttl?: number
  ): Promise<boolean> {
    try {
      const item: StoredItem = {
        id: key,
        type,
        data,
        createdAt: Date.now(),
        expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
      };

      if (ttl) {
        // Sauvegarder avec expiration
        await this.client.setex(key, ttl, JSON.stringify(item));
      } else {
        // Sauvegarder sans expiration
        await this.client.set(key, JSON.stringify(item));
      }

      return true;
    } catch (error: any) {
      console.error(`❌ Erreur sauvegarde Upstash (${key}):`, error.message);
      return false;
    }
  }
  private async listByPattern(
    pattern: string,
    limit: number
  ): Promise<string[]> {
    try {
      const keys: string[] = [];
      let cursor = 0;

      do {
        const result = await this.client.scan(cursor, {
          match: pattern,
          count: 100,
        });

        cursor = result[0] as unknown as number;
        keys.push(...result[1]);

        if (keys.length >= limit) break;
      } while (cursor !== 0);

      return keys.slice(0, limit);
    } catch (error: any) {
      console.error(`❌ Erreur listing Upstash (${pattern}):`, error.message);
      return [];
    }
  }
  async listQuizzes(limit: number = 100): Promise<string[]> {
    return this.listByPattern("quiz:*", limit);
  }
  async getQuiz(quizId: string): Promise<any | null> {
    return this.get(`quiz:${quizId}`);
  }
  async getAllQuizzes(limit: number = 100): Promise<any[]> {
    try {
      const quizKeys = await this.listQuizzes(limit);
      const quizzes: any[] = [];

      for (const key of quizKeys) {
        const quizId = key.replace("quiz:", "");
        const quiz = await this.getQuiz(quizId);
        if (quiz) {
          quizzes.push(quiz);
        }
      }

      return quizzes;
    } catch (error: any) {
      console.error("❌ Erreur récupération tous quiz:", error.message);
      return [];
    }
  }
  private extractTimestampFromId(id: string): number {
    if (!id) return 0;

    const parts = id.split("_");
    if (parts.length >= 2) {
      const timestamp = parseInt(parts[1]);
      return isNaN(timestamp) ? 0 : timestamp;
    }
    return 0;
  }
  async getNewestQuiz(): Promise<any | null> {
    try {
      const quizzes = await this.getAllQuizzes();

      if (quizzes.length === 0) {
        return null;
      }

      // Trier par date de création (timestamp dans l'ID)
      const sortedQuizzes = quizzes.sort((a, b) => {
        const timestampA = this.extractTimestampFromId(a.id);
        const timestampB = this.extractTimestampFromId(b.id);
        return timestampB - timestampA; // Du plus récent au plus ancien
      });

      return sortedQuizzes[0];
    } catch (error: any) {
      console.error("❌ Erreur récupération quiz récent:", error.message);
      return null;
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      const item: StoredItem =
        typeof value === "string" ? JSON.parse(value) : value;

      // Vérifier l'expiration (sécurité supplémentaire)
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.delete(key);
        return null;
      }

      return item.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération Upstash (${key}):`, error.message);
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error: any) {
      console.error(`❌ Erreur suppression Upstash (${key}):`, error.message);
      return false;
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      await this.client.flushdb();
      console.log("⚠️ Toutes les données Upstash ont été supprimées");
      return true;
    } catch (error: any) {
      console.error("❌ Erreur flush Upstash:", error.message);
      return false;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error: any) {
      console.error("❌ Erreur expiration:", error.message);
      return false;
    }
  }
}
