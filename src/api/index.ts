import express from "express";
import { WASocket } from "@whiskeysockets/baileys";
import dotenv from "dotenv";
dotenv.config();
import { Logger } from "pino";
import config from "../utils";
import cors from "cors";
import NodeCache from "node-cache";
import QRCode from "qrcode";
import path from "path";
import multer from "multer";
import fs from "fs";
//cache participant
const cacheUser = new NodeCache({ stdTTL: 60 * 5 });

/**
 * Initialize the Express API server
 * @param sock - WhatsApp socket instance
 * @param logger - Logger instance
 * @returns Express app instance
 */
export function initializeApi(sock: WASocket, logger: Logger) {
  const app = express();
  const PORT = process.env.API_PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "WhatsApp API is running" });
  });

  app.get("/api/groups/me", async (req, res) => {
    const chats = await sock.groupFetchAllParticipating();
    res.status(200).json({ status: "ok", chats });
  });

  // QR code endpoint
  app.get("/api/qr", async (req, res) => {
    try {
      const { globalState } = await import("../types");

      if (!globalState.latestQR) {
        return res.status(404).json({
          success: false,
          message:
            "No QR code available. The bot might be already connected or not initialized yet.",
        });
      }

      // Generate QR code as HTML
      const qrCodeImage = await QRCode.toDataURL(globalState.latestQR);

      // Send HTML response with QR code
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WhatsApp QR Code</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f0f2f5;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              text-align: center;
            }
            .container {
              background-color: white;
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              padding: 30px;
              width: 90%;
              max-width: 500px;
            }
            h1 {
              color: #128C7E;
              margin-bottom: 20px;
            }
            .qr-container {
              margin: 20px 0;
            }
            .instructions {
              color: #666;
              margin-top: 20px;
              line-height: 1.5;
              text-align: left;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>WhatsApp QR Code</h1>
            <div class="qr-container">
              <img src="${qrCodeImage}" alt="WhatsApp QR Code" />
            </div>
            <div class="instructions">
              <p><strong>To connect:</strong></p>
              <ol>
                <li>Open WhatsApp on your phone</li>
                <li>Tap Menu or Settings and select Linked Devices</li>
                <li>Tap on "Link a Device"</li>
                <li>Scan this QR code</li>
              </ol>
              <p>This QR code will expire after a few minutes for security reasons.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      logger.error(error, "Failed to generate QR code");
      res.status(500).json({
        success: false,
        message: "Failed to generate QR code",
        error: (error as Error).message,
      });
    }
  });

  // API routes
  app.use("/api/messages", createMessageRoutes(sock, logger));

  // Start server
  const server = app.listen(PORT, () => {
    logger.info(`API server started on port ${PORT}`);
  });
  server.keepAliveTimeout = 120 * 1000;
  server.headersTimeout = 120 * 1000;
  return app;
}

/**
 * Create message routes
 * @param sock - WhatsApp socket instance
 * @param logger - Logger instance
 * @param upload - Multer upload instance
 * @returns Express router
 */
export interface Props {
  message: string;
  groupId?: string;
  tagAll?: boolean;
  targetAdmin?: boolean;
  option?: {
    leaderboard: boolean;
    profil: string;
  };
}
function createMessageRoutes(sock: WASocket, logger: Logger) {
  const router = express.Router();

  // Send text message
  router.post("/text", async (req, res) => {
    console.log("handle requet from a server !!");
    try {
      const {
        groupId = config.bot?.group_target,
        message: msg,
        tagAll,
        targetAdmin,
        option,
      } = req.body as Props;
      console.log(req.body);
      if (!groupId || !msg) {
        return res.status(400).json({
          success: false,
          message: "Group ID and message are required",
        });
      }
      if (!cacheUser.get("Group_user")) {
        const chats = await sock.groupFetchAllParticipating();
        const groupMembers = chats[groupId].participants.map((member) => ({
          jid: member.id,
          name: member.name || member.id.split("@")[0],
          id: member.lid,
        }));
        cacheUser.set(
          "Group_user",
          groupMembers.map((member) => member.jid)
        );
        console.log(groupMembers);
      }

      if (!option) {
        await sock.sendMessage(groupId, {
          text: msg,
          mentions: tagAll ? cacheUser.get("Group_user") : undefined,
        });
      } else {
        await sock.sendMessage(groupId, {
          image: { url: option.profil },
          caption: msg,
          mentions: tagAll ? cacheUser.get("Group_user") : undefined,
        });
      }

      res.status(200).json({
        success: true,
        message: "Text message sent successfully",
      });
    } catch (error) {
      logger.error(error, "Failed to send text message");
      res.status(500).json({
        success: false,
        message: "Failed to send message",
        error: (error as Error).message,
      });
    }
  });

  return router;
}
