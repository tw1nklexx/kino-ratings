import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export type RatingBody = {
  movieId: string;
  userKey: "me" | "her";
  rating: number | null;
  comment?: string | null;
};

function isValidUserKey(k: string): k is "me" | "her" {
  return k === "me" || k === "her";
}

function isValidRating(r: number | null): boolean {
  if (r === null) return true;
  return Number.isInteger(r) && r >= 1 && r <= 10;
}

export async function POST(request: NextRequest) {
  let body: RatingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { movieId, userKey, rating, comment } = body;
  if (!movieId || typeof movieId !== "string") {
    return NextResponse.json({ error: "movieId required" }, { status: 400 });
  }
  if (!isValidUserKey(userKey)) {
    return NextResponse.json({ error: "userKey must be 'me' or 'her'" }, { status: 400 });
  }
  if (!isValidRating(rating ?? null)) {
    return NextResponse.json({ error: "rating must be 1-10 or null" }, { status: 400 });
  }

  const updated = await prisma.rating.upsert({
    where: { movieId_userKey: { movieId, userKey } },
    create: {
      movieId,
      userKey,
      rating: rating ?? undefined,
      comment: comment ?? undefined,
    },
    update: {
      rating: rating ?? undefined,
      comment: comment ?? undefined,
    },
  });

  return NextResponse.json(updated);
}
