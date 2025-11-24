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

  async getQuiz(quizId: string): Promise<any | null> {
    return this.get(`quiz:${quizId}`);
  }
  async get(key: string): Promise<any | null> {
    try {
      let value = await this.client.get<any>(key);

      if (!value) return null;

      const item: StoredItem =
        typeof value === "string" ? JSON.parse(value) : value;

      // Vérifier l'expiration (sécurité supplémentaire)
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.delete(key);
        return null;
      }

      return item.data || item;
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
}
