// GET /api/feed?mode=discover|following&category=&sort=&cursor=
//
// Returns a page of showcase projects for the newsfeed grid. Filtering, sorting
// and cursor pagination all run against the deterministic mock dataset in
// lib/feed. When a real backend lands, only getFeedPage changes — the shape
// (projects + nextCursor + total) stays.

import { NextResponse } from "next/server";
import { getFeedPage, parseFeedParams } from "@/lib/feed";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = parseFeedParams(searchParams);
  const cursor = searchParams.get("cursor");
  return NextResponse.json(getFeedPage(params, cursor));
}
