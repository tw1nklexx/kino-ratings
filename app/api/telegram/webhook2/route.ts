import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractFirstKinopoiskLink } from "@/lib/telegram";
import { fetchMovieDetails, shouldRefreshDetails } from "@/lib/kinopoisk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FETCH_TIMEOUT_MS = 4000;

function validateSecret(request: NextRequest): boolean {
  const envSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? null;
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");

  console.log("[tg webhook] header secret:", headerSecret);
  console.log("[tg webhook] env secret:", envSecret);

  if (!envSecret) {
    console.error("[tg webhook] TELEGRAM_WEBHOOK_SECRET is NOT set in env");
    return false;
  }

  if (!headerSecret) {
    console.error("[tg webhook] Telegram did NOT send secret header");
    return false;
  }

  if (headerSecret !== envSecret) {
    console.error("[tg webhook] Secret mismatch");
    return false;
  }

  return true;
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
    fetchMovieDetails(movie.kinopoiskId, type, { timeoutMs: FETCH_TIMEOUT_MS })
      .then((details) => {
        if (!details) return;
        return prisma.movie.update({
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
          },
        });
      })
      .catch((err) => console.warn("[webhook] background fetch error:", err));
  }
}

export async function POST(request: NextRequest) {
  if (!validateSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
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
    const chatId = String(channelPost.chat.id);
    const messageId = channelPost.message_id;
    const text = channelPost.text ?? channelPost.caption;
    await processPost(chatId, messageId, channelPost.date, channelPost.text, channelPost.caption);
  }

  if (message) {
    const chatId = String(message.chat.id);
    const messageId = message.message_id;
    await processPost(chatId, messageId, message.date, message.text, message.caption);
  }

  return NextResponse.json(
    { ok: true },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
