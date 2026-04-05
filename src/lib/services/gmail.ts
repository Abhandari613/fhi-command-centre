import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/gcal/callback`,
  );
}

type StoredTokens = {
  access_token: string;
  refresh_token: string;
};

function getAuthedGmail(tokens: StoredTokens) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
};

export type GmailAttachment = {
  attachmentId: string;
  messageId: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type GmailThreadMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  date: string;
  snippet: string;
  labelIds: string[];
  attachments: GmailAttachment[];
};

export type GmailThread = {
  id: string;
  subject: string;
  snippet: string;
  lastMessageDate: string;
  messages: GmailThreadMessage[];
  participants: string[];
};

/**
 * Fetch recent unread emails from inbox
 */
export async function fetchRecentEmails(
  tokens: StoredTokens,
  maxResults: number = 20,
  afterTimestamp?: string,
): Promise<GmailMessage[]> {
  const gmail = getAuthedGmail(tokens);

  let query = "in:inbox is:unread";
  if (afterTimestamp) {
    query += ` after:${afterTimestamp}`;
  }

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messageIds = listRes.data.messages || [];
  if (!messageIds.length) return [];

  const messages: GmailMessage[] = [];

  for (const msg of messageIds) {
    try {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = detail.data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
          ?.value || "";

      // Extract body text
      let bodyText = "";
      const payload = detail.data.payload;

      if (payload?.body?.data) {
        bodyText = Buffer.from(payload.body.data, "base64url").toString(
          "utf-8",
        );
      } else if (payload?.parts) {
        const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
        if (textPart?.body?.data) {
          bodyText = Buffer.from(textPart.body.data, "base64url").toString(
            "utf-8",
          );
        } else {
          const htmlPart = payload.parts.find(
            (p) => p.mimeType === "text/html",
          );
          if (htmlPart?.body?.data) {
            bodyText = Buffer.from(htmlPart.body.data, "base64url")
              .toString("utf-8")
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          }
        }
      }

      messages.push({
        id: msg.id!,
        threadId: msg.threadId || "",
        from: getHeader("From"),
        to: getHeader("To"),
        subject: getHeader("Subject"),
        body: bodyText.substring(0, 3000), // Cap body length for AI
        date: getHeader("Date"),
        snippet: detail.data.snippet || "",
      });
    } catch (err) {
      console.error(`Failed to fetch message ${msg.id}:`, err);
    }
  }

  return messages;
}

/**
 * Send an email via Gmail API (keeps it in Frank's sent folder, threaded)
 */
export async function sendGmailMessage(
  tokens: StoredTokens,
  opts: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    threadId?: string;
    inReplyTo?: string;
  },
): Promise<string | null> {
  const gmail = getAuthedGmail(tokens);

  const headers = [
    `To: ${opts.to}`,
    opts.cc ? `Cc: ${opts.cc}` : "",
    `Subject: ${opts.subject}`,
    "Content-Type: text/html; charset=utf-8",
    opts.inReplyTo ? `In-Reply-To: ${opts.inReplyTo}` : "",
    opts.inReplyTo ? `References: ${opts.inReplyTo}` : "",
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = Buffer.from(`${headers}\r\n\r\n${opts.body}`).toString(
    "base64url",
  );

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: opts.threadId,
    },
  });

  return res.data.id || null;
}

/**
 * Mark a message as read
 */
export async function markAsRead(
  tokens: StoredTokens,
  messageId: string,
): Promise<void> {
  const gmail = getAuthedGmail(tokens);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      removeLabelIds: ["UNREAD"],
    },
  });
}

// --------------- Thread & attachment helpers ---------------

function parseMessage(
  msg: gmail_v1.Schema$Message,
): GmailThreadMessage {
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    "";

  // Extract body text (handles nested multipart)
  let bodyText = "";
  function extractBody(part: gmail_v1.Schema$MessagePart | undefined) {
    if (!part) return;
    if (part.body?.data && part.mimeType === "text/plain") {
      bodyText = Buffer.from(part.body.data, "base64url").toString("utf-8");
      return;
    }
    if (part.parts) {
      // Prefer text/plain, fall back to text/html
      const textPart = part.parts.find((p) => p.mimeType === "text/plain");
      if (textPart?.body?.data) {
        bodyText = Buffer.from(textPart.body.data, "base64url").toString(
          "utf-8",
        );
        return;
      }
      const htmlPart = part.parts.find((p) => p.mimeType === "text/html");
      if (htmlPart?.body?.data) {
        bodyText = Buffer.from(htmlPart.body.data, "base64url")
          .toString("utf-8")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return;
      }
      // Recurse into nested multipart
      for (const sub of part.parts) {
        extractBody(sub);
        if (bodyText) return;
      }
    }
  }
  extractBody(msg.payload);

  // Extract attachment metadata (don't download the bytes)
  const attachments: GmailAttachment[] = [];
  function collectAttachments(part: gmail_v1.Schema$MessagePart | undefined) {
    if (!part) return;
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        attachmentId: part.body.attachmentId,
        messageId: msg.id!,
        filename: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body.size || 0,
      });
    }
    if (part.parts) {
      for (const sub of part.parts) collectAttachments(sub);
    }
  }
  collectAttachments(msg.payload);

  return {
    id: msg.id!,
    threadId: msg.threadId || "",
    from: getHeader("From"),
    to: getHeader("To"),
    cc: getHeader("Cc"),
    subject: getHeader("Subject"),
    body: bodyText.substring(0, 5000),
    date: getHeader("Date"),
    snippet: msg.snippet || "",
    labelIds: msg.labelIds || [],
    attachments,
  };
}

/**
 * Fetch recent threads (both sent and received) with all messages
 */
export async function fetchRecentThreads(
  tokens: StoredTokens,
  maxResults: number = 25,
  afterTimestamp?: string,
): Promise<GmailThread[]> {
  const gmail = getAuthedGmail(tokens);

  let query = "in:inbox OR in:sent";
  if (afterTimestamp) {
    query += ` after:${afterTimestamp}`;
  }

  const listRes = await gmail.users.threads.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const threadIds = listRes.data.threads || [];
  if (!threadIds.length) return [];

  const threads: GmailThread[] = [];

  for (const t of threadIds) {
    try {
      const detail = await gmail.users.threads.get({
        userId: "me",
        id: t.id!,
        format: "full",
      });

      const messages = (detail.data.messages || []).map(parseMessage);
      if (!messages.length) continue;

      // Collect unique participants
      const participantSet = new Set<string>();
      for (const m of messages) {
        if (m.from) participantSet.add(m.from);
        if (m.to)
          m.to.split(",").forEach((addr) => participantSet.add(addr.trim()));
      }

      threads.push({
        id: t.id!,
        subject: messages[0].subject,
        snippet: detail.data.snippet || messages[messages.length - 1].snippet,
        lastMessageDate: messages[messages.length - 1].date,
        messages,
        participants: Array.from(participantSet),
      });
    } catch (err) {
      console.error(`Failed to fetch thread ${t.id}:`, err);
    }
  }

  return threads;
}

/**
 * Fetch a single thread by ID with all messages
 */
export async function fetchThread(
  tokens: StoredTokens,
  threadId: string,
): Promise<GmailThread | null> {
  const gmail = getAuthedGmail(tokens);

  try {
    const detail = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full",
    });

    const messages = (detail.data.messages || []).map(parseMessage);
    if (!messages.length) return null;

    const participantSet = new Set<string>();
    for (const m of messages) {
      if (m.from) participantSet.add(m.from);
      if (m.to)
        m.to.split(",").forEach((addr) => participantSet.add(addr.trim()));
    }

    return {
      id: threadId,
      subject: messages[0].subject,
      snippet: detail.data.snippet || messages[messages.length - 1].snippet,
      lastMessageDate: messages[messages.length - 1].date,
      messages,
      participants: Array.from(participantSet),
    };
  } catch (err) {
    console.error(`Failed to fetch thread ${threadId}:`, err);
    return null;
  }
}

/**
 * Fetch an attachment's raw data on-demand (returns base64 data)
 */
export async function fetchAttachment(
  tokens: StoredTokens,
  messageId: string,
  attachmentId: string,
): Promise<{ data: string; size: number } | null> {
  const gmail = getAuthedGmail(tokens);

  try {
    const res = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: attachmentId,
    });

    return {
      data: res.data.data || "",
      size: res.data.size || 0,
    };
  } catch (err) {
    console.error(`Failed to fetch attachment ${attachmentId}:`, err);
    return null;
  }
}
