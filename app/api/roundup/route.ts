import { aggregate } from "@/lib/aggregate";
import { SITE, mailConfig } from "@/lib/resend";
import { buildRoundup } from "@/lib/roundup";

// Scraping every source takes a while; the default limit is too tight on some plans.
export const maxDuration = 60;

/**
 * Vercel Cron calls this every Monday morning (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 * `?preview` returns the email as HTML without sending, for checking the layout.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { events, generatedAt } = await aggregate();
  const roundup = buildRoundup(events, new Date(generatedAt), SITE);

  if (new URL(request.url).searchParams.has("preview")) {
    return new Response(roundup?.html ?? "Nothing in the next four weeks; no email would go out.", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (!roundup) return Response.json({ sent: false, reason: "no events" });

  const mail = mailConfig();
  if (!mail) return Response.json({ sent: false, reason: "Resend not configured" }, { status: 500 });

  // Cron can fire twice. Broadcast names are dated, so a repeat on the same day is a no-op.
  const { data: existing, error: listError } = await mail.resend.broadcasts.list();
  if (listError) return Response.json({ sent: false, reason: listError.message }, { status: 502 });
  if (existing?.data.some((b) => b.name === roundup.name)) {
    return Response.json({ sent: false, reason: `${roundup.name} already sent` });
  }

  const { data, error } = await mail.resend.broadcasts.create({
    name: roundup.name,
    segmentId: mail.segmentId,
    from: mail.from,
    subject: roundup.subject,
    previewText: roundup.previewText,
    html: roundup.html,
    text: roundup.text,
    send: true,
  });
  if (error) return Response.json({ sent: false, reason: error.message }, { status: 502 });
  return Response.json({ sent: true, id: data?.id, events: roundup.count });
}
