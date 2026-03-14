import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/gcal/callback`
  );
}

export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export async function exchangeCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

type GCalTokens = {
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  calendar_id?: string;
};

function getAuthedClient(tokens: GCalTokens) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  return google.calendar({ version: "v3", auth: oauth2Client });
}

type JobEventInput = {
  jobNumber: string;
  address: string;
  taskSummary: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  subEmails?: string[];
};

export async function createJobEvent(
  tokens: GCalTokens,
  job: JobEventInput
): Promise<string | null> {
  const calendar = getAuthedClient(tokens);
  const calendarId = tokens.calendar_id || "primary";

  const event = {
    summary: `${job.jobNumber} | ${job.address}`,
    location: job.address,
    description: job.taskSummary,
    start: { date: job.startDate },
    end: { date: job.endDate },
    attendees: (job.subEmails || []).map((email) => ({ email })),
  };

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
    sendUpdates: "all",
  });

  return res.data.id || null;
}

export async function updateJobEvent(
  tokens: GCalTokens,
  eventId: string,
  changes: Partial<JobEventInput>
): Promise<void> {
  const calendar = getAuthedClient(tokens);
  const calendarId = tokens.calendar_id || "primary";

  const patch: any = {};
  if (changes.address) {
    patch.location = changes.address;
    patch.summary = changes.jobNumber
      ? `${changes.jobNumber} | ${changes.address}`
      : undefined;
  }
  if (changes.startDate) patch.start = { date: changes.startDate };
  if (changes.endDate) patch.end = { date: changes.endDate };
  if (changes.taskSummary) patch.description = changes.taskSummary;
  if (changes.subEmails) {
    patch.attendees = changes.subEmails.map((email) => ({ email }));
  }

  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: patch,
    sendUpdates: "all",
  });
}

export async function deleteJobEvent(
  tokens: GCalTokens,
  eventId: string
): Promise<void> {
  const calendar = getAuthedClient(tokens);
  const calendarId = tokens.calendar_id || "primary";

  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: "all",
  });
}
