import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFirstKinopoiskLink } from "@/lib/telegram";
import { fetchMovieDetails, shouldRefreshDetails } from "@/lib/kinopoisk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KINOPOISK_FETCH_TIMEOUT_MS = 12000;
const noStore = { "Cache-Control": "no-store" as const };

function validateSecret(request: NextRequest): boolean {
  const envSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!envSecret || envSecret.trim() === "") {
    return false;
  }
  if (!headerSecret) {
    return false;
  }
  return headerSecret === envSecret;
}

type TelegramUpdate = {
  update_id?: number;
  channel_post?: {
    message_id: number;
    chat: { id: number; type?: string };
    date?: number;
    text?: string;
    caption?: string;
  };
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    date?: number;
    text?: string;
    caption?: string;
  };
};

async function processPost(
  chatId: string,
  messageId: number,
  dateSeconds: number | undefined,
  text: string | undefined,
  caption: string | undefined
) {
  const raw = (text ?? caption ?? "").trim();
  const parsed = extractFirstKinopoiskLink(raw || (text ?? caption ?? ""));
  if (!parsed) return;

  const { kinopoiskId, type } = parsed;

  const movie = await prisma.movie.upsert({
    where: {
      kinopoiskId_type: { kinopoiskId, type },
    },
    create: {
      kinopoiskId,
      type,
      detailsStatus: "pending",
    },
    update: {},
  });

  await prisma.telegramPost.upsert({
    where: {
      telegramChatId_telegramMessageId: {
        telegramChatId: String(chatId),
        telegramMessageId: String(messageId),
      },
    },
    create: {
      telegramChatId: String(chatId),
      telegramMessageId: String(messageId),
      postedAt: dateSeconds ? new Date(dateSeconds * 1000) : new Date(),
      originalText: raw || null,
      movieId: movie.id,
    },
    update: {},
  });

  if (shouldRefreshDetails(movie.lastFetchedAt)) {
    try {
      const details = await fetchMovieDetails(movie.kinopoiskId, type, {
        timeoutMs: KINOPOISK_FETCH_TIMEOUT_MS,
      });
      if (details) {
        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            titleRu: details.titleRu,
            titleOriginal: details.titleOriginal,
            year: details.year,
            durationMinutes: details.durationMinutes,
            description: details.description,
            posterUrl: details.posterUrl,
            genres: details.genres,
            countries: details.countries,
            cast: details.cast as object,
            ratingKinopoisk: details.ratingKinopoisk,
            lastFetchedAt: new Date(),
            detailsStatus: "ready",
          },
        });
      } else {
        await prisma.movie.update({
          where: { id: movie.id },
          data: { detailsStatus: "failed" },
        });
      }
    } catch {
      await prisma.movie.update({
        where: { id: movie.id },
        data: { detailsStatus: "failed" },
      }).catch(() => {});
    }
  }
}

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: noStore }
    );
  }

  let body: TelegramUpdate;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channelPost = body.channel_post;
  const message = body.message;

  if (channelPost) {
    await processPost(
      String(channelPost.chat.id),
      channelPost.message_id,
      channelPost.date,
      channelPost.text,
      channelPost.caption
    );
  }

  if (message) {
    await processPost(
      String(message.chat.id),
      message.message_id,
      message.date,
      message.text,
      message.caption
    );
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
