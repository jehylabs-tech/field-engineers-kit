import { NextResponse } from "next/server";

export const runtime = "nodejs";

type FeedbackBody = {
  type?: string;
  query?: string;
  priority?: string;
  source?: string;
};

/**
 * Lightweight custom log sink for unmatched search / calculator requests.
 * Persists to server logs (Vercel/hosting) for demand analysis.
 */
export async function POST(request: Request) {
  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const type = body.type;
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 200) : "";
  if (
    (type !== "search_no_results" && type !== "calculator_requested") ||
    query.length < 2
  ) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const entry = {
    at: new Date().toISOString(),
    type,
    query,
    priority: type === "calculator_requested" ? "high" : body.priority ?? "normal",
    source: typeof body.source === "string" ? body.source.slice(0, 64) : "unknown",
  };

  console.info("[search-feedback]", JSON.stringify(entry));

  return NextResponse.json({ ok: true });
}
