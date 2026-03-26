import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { promptsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export async function getPrompt(key: string): Promise<string> {
  const [prompt] = await db.select().from(promptsTable).where(eq(promptsTable.key, key)).limit(1);
  if (!prompt) throw new Error(`Prompt not found: ${key}`);
  return prompt.content;
}

export async function claudeRewrite(descriptionRaw: string, title: string, location: string | null, date: string | null): Promise<string> {
  const systemPrompt = await getPrompt("rewrite_description");
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Testo grezzo: ${descriptionRaw}\nTitolo: ${title}\nLuogo: ${location || "non specificato"}\nData: ${date || "non specificata"}`,
      },
    ],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response");
  return block.text;
}

export async function claudeExtractFromText(text: string, promptKey = "extraction_global"): Promise<Record<string, unknown>> {
  const systemPrompt = await getPrompt(promptKey);
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Estrai le informazioni dell'evento dal seguente testo e restituisci JSON:\n\n${text}`,
      },
    ],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response");
  try {
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(block.text);
  } catch {
    return { descriptionRaw: text };
  }
}

export async function claudeExtractFromImages(base64Images: string[]): Promise<Record<string, unknown>> {
  const systemPrompt = await getPrompt("extraction_screenshot");
  const anthropic = getClient();
  const imageContent = base64Images.map((img) => ({
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: "image/jpeg" as const,
      data: img.replace(/^data:image\/\w+;base64,/, ""),
    },
  }));
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [
          ...imageContent,
          { type: "text", content: "Estrai le informazioni dell'evento da queste immagini e restituisci JSON." } as unknown as Anthropic.TextBlockParam,
        ] as Anthropic.MessageParam["content"],
      },
    ],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response");
  try {
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(block.text);
  } catch {
    return {};
  }
}

export async function claudeGenerateNewsletterIntro(events: Array<{ title: string; dateDisplay?: string | null; location?: string | null }>): Promise<string> {
  const systemPrompt = await getPrompt("newsletter_intro");
  const anthropic = getClient();
  const eventList = events.map((e) => `- ${e.title}${e.dateDisplay ? ` | ${e.dateDisplay}` : ""}${e.location ? ` | ${e.location}` : ""}`).join("\n");
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Lista eventi:\n${eventList}`,
      },
    ],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response");
  return block.text;
}

export async function claudeFetchAndExtract(url: string): Promise<{ events: Record<string, unknown>[]; rawHtml: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; VareseLifeBot/1.0)",
    },
  });
  const html = await response.text();
  const systemPrompt = await getPrompt("extraction_global");
  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Analizza questo HTML e:\n1. Identifica tutti gli URL di eventi individuali\n2. Estrai tutti gli eventi che riesci a trovare\n\nRestituisci JSON con: { "event_urls": ["url1",...], "events": [{...},...] }\n\nHTML:\n${html.slice(0, 50000)}`,
      },
    ],
  });
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response");
  try {
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { events: parsed.events || [], rawHtml: html };
    }
  } catch {
    /* ignore */
  }
  return { events: [], rawHtml: html };
}
