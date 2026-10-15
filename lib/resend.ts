import { Resend } from "resend";

/** Reading the request host would opt pages out of static rendering, so use Vercel's production URL. */
export const SITE = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000"}`;

export interface MailConfig {
  resend: Resend;
  segmentId: string;
  from: string;
}

/** Null when the environment isn't set up, so the page and the cron can degrade instead of throwing. */
export function mailConfig(): MailConfig | null {
  const { RESEND_API_KEY, RESEND_SEGMENT_ID, ROUNDUP_FROM } = process.env;
  if (!RESEND_API_KEY || !RESEND_SEGMENT_ID || !ROUNDUP_FROM) return null;
  return { resend: new Resend(RESEND_API_KEY), segmentId: RESEND_SEGMENT_ID, from: ROUNDUP_FROM };
}
