/**
 * Utility functions for WhatsApp bot
 * Add helpers here for config, formatting, validation, etc.
 */
import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { BotConfig, BotSettings, CommandList } from "./types/index.js";
import { fileURLToPath } from "url";
import { gloBalSettingCache } from "./index.js";
import { GNDCRedisStorage } from "./storage.js";
import { WASocket } from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
const cacheUser = new NodeCache({ stdTTL: 60 * 5 });
let config: BotConfig = {};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
try {
  // Try multiple possible locations for bot.yml
  const possiblePaths = [
    path.join(process.cwd(), "bot.yml"),
    path.join(__dirname, "..", "bot.yml"),
    path.join(__dirname, "..", "..", "bot.yml"), // For Netlify functions
  ];

  let configFile: string | null = null;
  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      configFile = fs.readFileSync(configPath, "utf8");
      break;
    }
  }

  if (!configFile) {
    throw new Error("Could not find bot.yml in any of the expected locations");
  }

  config = yaml.load(configFile) as BotConfig;
} catch (e) {
  console.error("⚠️ Failed to load bot.yml:", e);
}

export default config;

export function stripHtml(html: string): string {
  if (!html) return "";
  return (
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .slice(0, 30) + "..."
  );
}

export async function getBotConfig(): Promise<BotSettings> {
  const storage = new GNDCRedisStorage();
  const v = await storage.get("bot-settings");
  return v;
}

type AllowedValue<K extends "allowedcommand" | "allowedevent"> =
  BotSettings["host"][K][number];
export async function resolveTargetGroups<
  K extends "allowedcommand" | "allowedevent"
>(permissionKey: K, permissionValue: AllowedValue<K>) {
  const configBot = await getBotConfig();
  const targets: Array<{ id: string; allow_inbox?: CommandList[] }> = [];

  if (
    //@ts-ignore
    configBot.host[permissionKey]?.includes(permissionValue) &&
    !configBot.host.make_inactive
  ) {
    targets.push({
      id: configBot.host.id,
      allow_inbox: configBot.host.allow_inbox,
    });
  }

  for (const other of configBot.other) {
    //@ts-ignore
    if (!other[permissionKey]?.includes(permissionValue) || other.make_inactive)
      continue;
    targets.push({
      id: other.id,
      allow_inbox: other.allow_inbox,
    });
  }

  return targets;
}
async function getGroupMembers(sock: WASocket, groupId: string) {
  const key = `Group_user:${groupId}`;

  const cached = cacheUser.get<string[]>(key);
  if (cached) return cached;

  const chats = await sock.groupFetchAllParticipating();
  const groupMembers = chats[groupId].participants.map((m) => m.id);

  cacheUser.set(key, groupMembers);
  return groupMembers;
}

export async function sendGroupMessage({
  sock,
  groupId,
  msg,
  type,
  data,
  tagAll = false,
}: {
  sock: WASocket;
  groupId: string;
  msg?: string;
  type: "text" | "image" | "poll";
  data?: {
    url?: string;
    options?: string[];
  };
  tagAll?: boolean;
}) {
  if (!groupId) throw new Error("Missing groupId");
  if (!msg && type !== "image") throw new Error("Missing message text");

  // Load users if needed
  const users = tagAll ? await getGroupMembers(sock, groupId) : undefined;

  const payload: any = {};

  switch (type) {
    case "text":
      payload.text = msg;
      break;

    case "image":
      if (!data?.url) throw new Error("Missing image URL");
      payload.image = { url: data.url };
      payload.caption = msg;
      break;

    case "poll":
      if (!Array.isArray(data?.options))
        throw new Error("Poll options must be an array");

      payload.poll = {
        name: msg,
        values: data.options,
      };
      break;

    default:
      throw new Error("Unknown message type");
  }

  if (tagAll) payload.mentions = users;

  return await sock.sendMessage(groupId, payload);
}
