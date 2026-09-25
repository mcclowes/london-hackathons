import { aggregate } from "@/lib/aggregate";
import { toIcal } from "@/lib/ical/serialize";

export const revalidate = 21600;

export async function GET() {
  const { events, generatedAt } = await aggregate();
  return new Response(toIcal(events, new Date(generatedAt)), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'inline; filename="london-hackathons.ics"',
    },
  });
}
