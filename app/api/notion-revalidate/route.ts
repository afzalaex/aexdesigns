import { NextRequest, NextResponse } from "next/server";
import { invalidateNotionCache } from "@/lib/notion";

type RevalidateBody = {
  slug?: string;
};

function readSecretFromRequest(request: NextRequest): string | null {
  const headerSecret = request.headers.get("x-revalidate-secret");
  if (headerSecret) {
    return headerSecret;
  }

  return request.nextUrl.searchParams.get("secret");
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.NOTION_REVALIDATE_SECRET?.trim();
  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "NOTION_REVALIDATE_SECRET is not configured." },
      { status: 500 }
    );
  }

  const requestSecret = readSecretFromRequest(request);
  if (requestSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let slug: string | undefined;
  try {
    const body = (await request.json()) as RevalidateBody;
    if (typeof body.slug === "string" && body.slug.trim().length > 0) {
      slug = body.slug;
    }
  } catch {
    // Body is optional.
  }

  invalidateNotionCache(slug);

  return NextResponse.json({
    ok: true,
    revalidated: true,
    scope: slug ? "slug" : "all",
    slug: slug ?? null,
    at: new Date().toISOString(),
  });
}
