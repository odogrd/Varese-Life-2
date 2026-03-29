import { db } from "@workspace/db";
import { eventsTable, errorLogsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { claudeRewrite, claudeFetchAndExtract } from "./claude";
import { logger } from "./logger";

export { claudeFetchAndExtract };

const PROVINCE_OF_VARESE_COMUNI = new Set([
  "agra", "albizzate", "angera", "arcisate", "arsago seprio", "azzate", "azzio",
  "barasso", "bardello con malgesso e bregano", "bedero valcuvia", "besano", "besnate",
  "besozzo", "biandronno", "bisuschio", "bodio lomnago", "brebbia", "bregano", "brenta",
  "brezzo di bedero", "brinzio", "brissago-valtravaglia", "brunello", "brusimpiano",
  "buguggiate", "busto arsizio", "cadegliano-viconago", "cadrezzate con osmate", "cairate",
  "cantello", "caravate", "cardano al campo", "carnago", "caronno pertusella",
  "caronno varesino", "casale litta", "casalzuigno", "casciago", "casorate sempione",
  "cassano magnago", "cassano valcuvia", "castellanza", "castello cabiaglio",
  "castelseprio", "castelveccana", "castiglione olona", "castronno", "cavaria con premezzo",
  "cazzago brabbia", "cislago", "cittiglio", "clivio", "cocquio-trevisago", "comabbio",
  "comerio", "cremenaga", "crosio della valle", "cuasso al monte", "cugliate-fabiasco",
  "cunardo", "curiglia con monteviasco", "cuveglio", "cuvio", "daverio", "dumenza",
  "duno", "fagnano olona", "ferno", "ferrera di varese", "gallarate", "galliate lombardo",
  "gavirate", "gazzada schianno", "gemonio", "gerenzano", "germignaga", "golasecca",
  "gorla maggiore", "gorla minore", "gornate-olona", "grantola", "inarzo", "induno olona",
  "ispra", "jerago con orago", "lavena ponte tresa", "laveno-mombello", "leggiuno",
  "lonate ceppino", "lonate pozzolo", "lozza", "luino", "luvinate", "maccagno",
  "malgesso", "malnate", "marchirolo", "marnate", "marzio", "masciago primo", "mercallo",
  "mesenzana", "montegrino valtravaglia", "monvalle", "morazzone", "mornago",
  "oggiona con santo stefano", "olgiate olona", "origgio", "orino",
  "pino sulla sponda del lago maggiore", "porto ceresio", "porto valtravaglia",
  "rancio valcuvia", "ranco", "saltrio", "samarate", "sangiano", "saronno",
  "sesto calende", "solbiate arno", "solbiate olona", "somma lombardo", "sumirago",
  "taino", "ternate", "tradate", "travedona-monate", "tronzano lago maggiore",
  "uboldo", "valganna", "varano borghi", "varese", "vedano olona", "veddasca",
  "venegono inferiore", "venegono superiore", "vergiate", "viggiù", "vizzola ticino",
]);

/**
 * Returns true if the location is likely within the Province of Varese.
 * If location is null/empty, returns true (assume province-scoped since sources are targeted).
 * If location is specified but doesn't match any known comune, returns false.
 */
export function isLocationInProvinceOfVarese(location: string | null | undefined): boolean {
  if (!location) return true;
  const loc = location.toLowerCase();
  // Generic province references
  if (loc.includes("varese") || loc.includes("provincia di va")) return true;
  // Check each comune name
  for (const comune of PROVINCE_OF_VARESE_COMUNI) {
    if (loc.includes(comune)) return true;
  }
  return false;
}

export interface RawEvent {
  title?: string;
  date?: string;
  date_start?: string;
  date_end?: string;
  location?: string;
  description?: string;
  description_raw?: string;
  price?: string;
  category?: string;
  source_url?: string;
  image_url?: string;
}

function parseItalianDate(dateStr: string): { dateStart: Date | null; dateEnd: Date | null; confidence: "high" | "medium" | "low" } {
  if (!dateStr) return { dateStart: null, dateEnd: null, confidence: "low" };

  const italianMonths: Record<string, number> = {
    gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
    luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
    gen: 0, feb: 1, mar: 2, apr: 3, mag: 4, giu: 5, lug: 6, ago: 7, set: 8, ott: 9, nov: 10, dic: 11,
  };

  const now = new Date();
  const currentYear = now.getFullYear();

  const str = dateStr.toLowerCase().trim();

  // ISO 8601
  const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]),
      isoMatch[4] ? parseInt(isoMatch[4]) : 0, isoMatch[5] ? parseInt(isoMatch[5]) : 0);
    return { dateStart: d, dateEnd: null, confidence: "high" };
  }

  // Try already parsed ISO from Claude
  if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      return { dateStart: new Date(dateStr), dateEnd: null, confidence: "high" };
    } catch { /* ignore */ }
  }

  // DD/MM/YYYY or DD.MM.YYYY
  const numericMatch = str.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{2,4})(?:\s+(?:ore|alle?|h\.?)?\s*(\d{2})[:\.](\d{2}))?/);
  if (numericMatch) {
    const year = numericMatch[3].length === 2 ? 2000 + parseInt(numericMatch[3]) : parseInt(numericMatch[3]);
    const d = new Date(year, parseInt(numericMatch[2]) - 1, parseInt(numericMatch[1]),
      numericMatch[4] ? parseInt(numericMatch[4]) : 0, numericMatch[5] ? parseInt(numericMatch[5]) : 0);
    return { dateStart: d, dateEnd: null, confidence: "high" };
  }

  // Italian text date: "4 gennaio 2027" or "lunedì 4 gennaio 2027"
  const italianDateMatch = str.match(/(?:\w+\s+)?(\d{1,2})\s+(gen(?:naio)?|feb(?:braio)?|mar(?:zo)?|apr(?:ile)?|mag(?:gio)?|giu(?:gno)?|lug(?:lio)?|ago(?:sto)?|set(?:tembre)?|ott(?:obre)?|nov(?:embre)?|dic(?:embre)?)[.\s]+(?:'?(\d{2,4}))?(?:.*?(?:ore|alle?|h\.?)\s*(\d{2})[:\.](\d{2}))?/);
  if (italianDateMatch) {
    const monthName = italianDateMatch[2].replace(".", "");
    const month = italianMonths[monthName];
    if (month !== undefined) {
      let year = italianDateMatch[3] ? (italianDateMatch[3].length === 2 ? 2000 + parseInt(italianDateMatch[3]) : parseInt(italianDateMatch[3])) : currentYear;
      const day = parseInt(italianDateMatch[1]);
      const d = new Date(year, month, day,
        italianDateMatch[4] ? parseInt(italianDateMatch[4]) : 0,
        italianDateMatch[5] ? parseInt(italianDateMatch[5]) : 0);
      if (d < now && !italianDateMatch[3]) {
        d.setFullYear(currentYear + 1);
      }
      const confidence = italianDateMatch[3] ? "high" : "medium";
      return { dateStart: d, dateEnd: null, confidence };
    }
  }

  // Range: "dal 4 al 6 gennaio 2027" or "4-6 gennaio 2027"
  const rangeMatch = str.match(/(?:dal\s+)?(\d{1,2})(?:\s+(\w+))?\s*[-–]\s*(?:al\s+)?(\d{1,2})\s+(\w+)(?:\s+'?(\d{2,4}))?/);
  if (rangeMatch) {
    const monthEnd = italianMonths[rangeMatch[4]] ?? italianMonths[rangeMatch[2] || rangeMatch[4]];
    const monthStart = rangeMatch[2] ? (italianMonths[rangeMatch[2]] ?? monthEnd) : monthEnd;
    if (monthEnd !== undefined) {
      const year = rangeMatch[5] ? (rangeMatch[5].length === 2 ? 2000 + parseInt(rangeMatch[5]) : parseInt(rangeMatch[5])) : currentYear;
      const dateStart = new Date(year, monthStart, parseInt(rangeMatch[1]), 0, 0, 0);
      const dateEnd = new Date(year, monthEnd, parseInt(rangeMatch[3]), 23, 59, 59);
      return { dateStart, dateEnd, confidence: rangeMatch[5] ? "high" : "medium" };
    }
  }

  // Relative dates
  if (str.includes("oggi")) return { dateStart: new Date(), dateEnd: null, confidence: "high" };
  if (str.includes("domani")) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return { dateStart: d, dateEnd: null, confidence: "high" };
  }
  if (str.includes("sabato prossimo") || str.includes("questo sabato")) {
    const d = new Date();
    const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSat);
    return { dateStart: d, dateEnd: null, confidence: "medium" };
  }
  if (str.includes("questo weekend") || str.includes("weekend")) {
    const d = new Date();
    const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7;
    const sat = new Date(d); sat.setDate(d.getDate() + daysUntilSat);
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    return { dateStart: sat, dateEnd: sun, confidence: "medium" };
  }

  return { dateStart: null, dateEnd: null, confidence: "low" };
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function trimDateEndIfMultiWeek(dateStart: Date | null, dateEnd: Date | null): Date | null {
  if (!dateStart || !dateEnd) return dateEnd;
  if (dateEnd.getTime() - dateStart.getTime() > ONE_WEEK_MS) return null;
  return dateEnd;
}

export function generateDateDisplay(dateStart: Date | null, dateEnd: Date | null): string {
  if (!dateStart) return "";

  const italianMonths = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

  const day1 = dateStart.getDate();
  const month1 = italianMonths[dateStart.getMonth()];
  const year1 = dateStart.getFullYear();

  if (!dateEnd) {
    const time = dateStart.getHours() > 0 ? ` alle ${dateStart.getHours().toString().padStart(2, "0")}:${dateStart.getMinutes().toString().padStart(2, "0")}` : "";
    return `${day1} ${month1} ${year1}${time}`;
  }

  const day2 = dateEnd.getDate();
  const month2 = italianMonths[dateEnd.getMonth()];
  const year2 = dateEnd.getFullYear();

  if (dateStart.getMonth() === dateEnd.getMonth() && dateStart.getFullYear() === dateEnd.getFullYear()) {
    return `${day1}–${day2} ${month1} ${year1}`;
  }
  return `${day1} ${month1} – ${day2} ${month2} ${year1}`;
}

export async function processRawEvents(
  rawEvents: RawEvent[],
  sourceId: number,
  scraper: "browseract" | "claude_fallback"
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;

  for (const raw of rawEvents) {
    try {
      const title = raw.title?.trim();
      if (!title) continue;

      const dateStr = raw.date || raw.date_start || "";
      let dateStart: Date | null = null;
      let dateEnd: Date | null = null;
      let dateParseConfidence: "high" | "medium" | "low" = "low";

      if (dateStr) {
        const parsed = parseItalianDate(dateStr);
        dateStart = parsed.dateStart;
        dateEnd = parsed.dateEnd;
        dateParseConfidence = parsed.confidence;
      }

      if (raw.date_end) {
        const parsedEnd = parseItalianDate(raw.date_end);
        if (parsedEnd.dateStart) dateEnd = parsedEnd.dateStart;
      }

      dateEnd = trimDateEndIfMultiWeek(dateStart, dateEnd);

      if (!isLocationInProvinceOfVarese(raw.location)) {
        await db.insert(errorLogsTable).values({
          errorType: "outside_province",
          sourceId,
          message: `Evento escluso: luogo fuori dalla Provincia di Varese: "${raw.location}" (${title})`,
          context: { raw },
          resolved: false,
        });
        errors++;
        continue;
      }

      if (!dateStart) {
        await db.insert(errorLogsTable).values({
          errorType: "no_date",
          sourceId,
          message: `Data non trovata per evento: ${title}`,
          context: { raw },
          resolved: false,
        });
        errors++;
        continue;
      }

      // Skip events that have already started (include only future events)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dateStart < today) continue;

      const descriptionRaw = raw.description || raw.description_raw || "";
      const dateDisplay = generateDateDisplay(dateStart, dateEnd);

      // Deduplication check
      const existingByUrl = raw.source_url
        ? await db.select().from(eventsTable).where(eq(eventsTable.sourceUrl, raw.source_url)).limit(1)
        : [];

      if (existingByUrl.length > 0) {
        const existing = existingByUrl[0];
        await db.update(eventsTable).set({
          title,
          dateStart,
          dateEnd,
          dateDisplay,
          dateParseConfidence,
          descriptionRaw: descriptionRaw || existing.descriptionRaw,
          location: raw.location || existing.location,
          price: raw.price || existing.price,
          category: raw.category || existing.category,
          imageUrl: raw.image_url || existing.imageUrl,
          updatedAt: new Date(),
        }).where(eq(eventsTable.id, existing.id));
        saved++;
        continue;
      }

      const descriptionClean = descriptionRaw
        ? await claudeRewrite(descriptionRaw, title, raw.location || null, dateDisplay).catch(() => descriptionRaw)
        : "";

      await db.insert(eventsTable).values({
        sourceId,
        title,
        dateStart,
        dateEnd,
        dateDisplay,
        dateParseConfidence,
        recurring: false,
        location: raw.location || null,
        descriptionRaw: descriptionRaw || null,
        descriptionClean: descriptionClean || null,
        imageUrl: raw.image_url || null,
        sourceUrl: raw.source_url || null,
        category: raw.category || null,
        price: raw.price || null,
        status: "pending",
        sourceType: "scraped",
        scraper,
      });

      saved++;
    } catch (err) {
      errors++;
      logger.error({ err, raw }, "Error processing raw event");
      await db.insert(errorLogsTable).values({
        errorType: "processing_error",
        sourceId,
        message: `Errore elaborazione evento: ${String(err)}`,
        context: { raw: JSON.stringify(raw) },
        resolved: false,
      }).catch(() => {});
    }
  }

  return { saved, errors };
}
