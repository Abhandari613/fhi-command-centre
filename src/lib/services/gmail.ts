import { google } from "googleapis";

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
