// GET /api/feed?mode=discover|following|saved|appreciated&category=&sort=&cursor=&follow=c4:1,c1:0&ids=p1,p2
//
// Returns a page of showcase projects for the newsfeed grid. Filtering, sorting
// and cursor pagination all run against the deterministic mock dataset in
// lib/feed. When a real backend lands, only getFeedPage changes — the shape
// (projects + nextCursor + total) stays.

import { NextResponse } from "next/server";
import { getFeedPage, parseFeedParams, parseFollowParam, parseIdsParam } from "@/lib/feed";

export const runtime = "edge";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params = parseFeedParams(searchParams);
  const cursor = searchParams.get("cursor");
  return NextResponse.json(getFeedPage(params, cursor, parseFollowParam(searchParams.get("follow")), parseIdsParam(searchParams.get("ids"))));
}
