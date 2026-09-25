import { aggregate } from "@/lib/aggregate";

export const revalidate = 21600;

export async function GET() {
  return Response.json(await aggregate());
}
