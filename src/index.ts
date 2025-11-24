/**
 * WhatsApp Bot Entry Point
 * Loads config, commands, events, and starts the bot.
 */
import {
  default as makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import pino from "pino";
import config from "./utils.js";
import { Command, EventHandler, ExtendedWASocket } from "./types/index.js";
import { initializeApi } from "./api/index.js";
import NodeCache from "node-cache";
import { initializeCron } from "./cron/index.js";
import { fileURLToPath } from "url";
import * as commandModules from "./commands/index.js";
import * as eventModules from "./events/index.js";
// Re-implement __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logging via pino
const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logFile = path.join(
  logDir,
  `${new Date().toISOString().slice(0, 10)}.log`
);
//@ts-ignore
const logger = pino(
  {
    level: config.logging?.level || "info",
    transport: { target: "pino-pretty" },
  },
  pino.destination(logFile)
);

/**
 * Loads all command modules from the commands directory.
 * @returns {Map<string, Command>}
 */
export const commands = new Map<string, Command>();
Object.values(commandModules).forEach((mod: any) => {
  if (mod.name && mod.execute) {
    commands.set(mod.name, mod);
  }
});
console.log("Commands loaded:", Array.from(commands.keys()));

/**
 * Loads all event handler modules from the events directory.
 * @returns {Array<EventHandler>}
 */
export const eventHandlers: EventHandler[] = [];
Object.values(eventModules).forEach((mod: any) => {
  if (mod.eventName && typeof mod.handler === "function") {
    eventHandlers.push(mod);
  }
});
console.log(
  "Events loaded:",
  eventHandlers.map((e) => e.eventName)
);
/**
 * Starts the WhatsApp bot and registers event handlers.
 */
export const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
export const gloBalCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
export async function startBot(): Promise<void> {
  const logger = createLogger();
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Using Baileys v${version.join(".")}, Latest: ${isLatest}`);
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    //@ts-ignore
    logger: pino({ level: "silent" }),
    browser: ["NexosBot", "Opera GX", "120.0.5543.204"],
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: config.bot?.online || true,
    syncFullHistory: config.bot?.history || false,
    shouldSyncHistoryMessage: () => config.bot?.history || false,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
  }) as ExtendedWASocket;

  // Save login credentials on update
  sock.ev.on("creds.update", saveCreds);

  // Register all event handlers
  for (const { eventName, handler } of eventHandlers) {
    // Pass only the dependencies that the handler expects
    if (eventName === "connection.update") {
      sock.ev.on(eventName, handler(sock, logger, saveCreds, startBot));
    } else if (eventName === "messages.upsert") {
      sock.ev.on(eventName, handler(sock, logger, commands));
    } else {
      // For future extensibility, just pass sock and logger
      //@ts-ignore
      sock.ev.on(eventName, handler(sock, logger));
    }
  }
  console.log("hi");
  // Initialize Express API server
  // initializeApi(sock, logger);
  initializeCron(sock, logger);
}

await startBot();
