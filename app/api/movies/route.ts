import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // queued | watched | dropped
  const unratedBy = searchParams.get("unratedBy"); // me | her | both
  const search = searchParams.get("search")?.trim() ?? "";

  const orderBy = [
    { telegramPosts: { _count: "desc" } },
    { telegramPosts: { postedAt: "desc" } },
    { createdAt: "desc" },
  ] as const;

  const movies = await prisma.movie.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      ratings: true,
      telegramPosts: { orderBy: { postedAt: "desc" }, take: 1 },
    },
  });

  let filtered = movies;

  if (status && ["queued", "watched", "dropped"].includes(status)) {
    filtered = filtered.filter((m) => m.status === status);
  }

  if (unratedBy === "me") {
    filtered = filtered.filter((m) => !m.ratings.find((r) => r.userKey === "me" && r.rating != null));
  } else if (unratedBy === "her") {
    filtered = filtered.filter((m) => !m.ratings.find((r) => r.userKey === "her" && r.rating != null));
  } else if (unratedBy === "both") {
    filtered = filtered.filter((m) => {
      const me = m.ratings.find((r) => r.userKey === "me");
      const her = m.ratings.find((r) => r.userKey === "her");
      return (me?.rating == null) && (her?.rating == null);
    });
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((m) => {
      const titleRu = (m.titleRu ?? "").toLowerCase();
      const titleOrig = (m.titleOriginal ?? "").toLowerCase();
      return titleRu.includes(q) || titleOrig.includes(q);
    });
  }

  filtered.sort((a, b) => {
    const aPosted = a.telegramPosts[0]?.postedAt ?? a.createdAt;
    const bPosted = b.telegramPosts[0]?.postedAt ?? b.createdAt;
    return bPosted.getTime() - aPosted.getTime();
  });

  return NextResponse.json(filtered);
}
