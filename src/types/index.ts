import { proto, WASocket } from "@whiskeysockets/baileys";
import { Logger } from "pino";

// Bot configuration types
export interface BotConfig {
  bot?: {
    name?: string;
    description: string;
    group_target?: string;
    online?: boolean;
    prefix?: string;
    history?: boolean;
    author_jid?: string;
  };
  logging?: {
    level?: string;
    logToFile?: boolean;
  };
}

// Command interface
export interface Command {
  name: string;
  description: string;
  execute: (
    sock: WASocket,
    from: string,
    msg: proto.IWebMessageInfo,
    args: string[]
  ) => Promise<void>;
}

// Event handler interface
export interface EventHandler {
  eventName: string;
  handler: (
    sock: WASocket,
    logger: Logger,
    ...args: any[]
  ) => (...args: any[]) => Promise<void>;
}

// Message type
export type WAMessage = proto.IWebMessageInfo;

// Socket type with additional properties
export type ExtendedWASocket = WASocket & {
  user?: {
    id?: string;
    jid?: string;
  };
};

export type BlogPostResponse = {
  title: string;
  description: string;
  id: string;
  createdAt: Date;
  like: number | null;
  slug: string;
  author: {
    id: string;
    name: string | null;
  };
};

export type ForumPostResponse = {
  id: string;
  title: string;
  createdAt: Date;
  textContent: string;
  author: {
    name: string | null;
  };
  replies: {
    id: string;
  }[];
};

export interface LeaderboardType {
  users: User[];
  hasMore: boolean;
}

export interface User {
  image: null;
  name: string;
  email: string;
  experiencePoints: number;
  createdAt: Date;
  username: string;
}

export type EventType = {
  title: string;
  description: string;
  id: string;
  location: string;
  createdAt: Date;

  link: string | null;
  creatorId: string;
  creator: {
    id: string;
  };
};
