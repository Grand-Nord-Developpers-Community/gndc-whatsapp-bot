import { proto, WASocket } from "@whiskeysockets/baileys";
import config from "../utils";

/**
 * Lists all groups the user is currently in.
 * Usage: !groups
 */
export const name = "groups";
export const description = "List all groups you are currently in.";

/**
 * Fetches and displays all groups the user is a member of.
 * @param {WASocket} sock - WhatsApp socket instance
 * @param {string} from - Sender JID
 * @param {Array<string>} args - Command arguments
 */
export async function execute(
  sock: WASocket,
  from: string,
  msg: proto.IWebMessageInfo,
  args: string[]
): Promise<void> {
  if (from !== config.bot?.author_jid) {
    return;
  }
  try {
    // Get all chats
    const chats = await sock.groupFetchAllParticipating();

    if (!chats || Object.keys(chats).length === 0) {
      await sock.sendMessage(from, { text: "You are not in any groups." });
      return;
    }

    // Format the groups list
    let message = "*Your Groups:*\n\n";
    let count = 1;

    for (const [id, group] of Object.entries(chats)) {
      message += `${count}. *${group.subject}*\n`;
      message += `   - Members: ${group.participants?.length || 0}\n`;
      message += `   - ID: ${id}\n\n`;
      count++;
    }

    message += `\nTotal: ${Object.keys(chats).length} groups`;

    //mentions all group members
    const groupMembers = chats[from].participants.map((member) => ({
      jid: member.id,
      name: member.name || member.id.split("@")[0],
      id: member.lid,
    }));

    console.log(groupMembers);
    await sock.sendMessage(from, {
      text: "yup",
      mentions: [...groupMembers.map((member) => member.jid)],
    });
    // Send the formatted message
    //await sock.sendMessage(from, { text: message });
  } catch (error) {
    console.error("Error fetching groups:", error);
    await sock.sendMessage(from, {
      text: "❌ Error fetching groups. Please try again later.",
    });
  }
}
