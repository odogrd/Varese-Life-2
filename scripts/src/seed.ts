import { db } from "@workspace/db";
import { usersTable, promptsTable, settingsTable, templatesTable, sourcesTable, sourceUrlsTable } from "@workspace/db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const DEFAULT_PROMPTS = [
  {
    key: "extraction_global",
    label: "Estrazione globale eventi",
    description: "Prompt di sistema per estrarre campi strutturati dall'output grezzo di BrowserAct.",
    content: `Sei un assistente specializzato nell'estrazione di informazioni su eventi locali dalla pagina web di Varese e provincia.

Analizza il testo fornito ed estrai SOLO gli eventi che si svolgono nella Provincia di Varese (comuni come Varese, Gallarate, Busto Arsizio, Saronno, Luino, Malnate, Sesto Calende, Tradate, ecc.). Ignora eventi che si svolgono chiaramente in altre province o regioni.

Per ogni evento valido, restituisci un oggetto JSON con questi campi:
- title: titolo dell'evento (stringa)
- date: data dell'evento nel formato ISO 8601 "YYYY-MM-DD HH:MM:SS" (stringa, null se non trovata)
- date_end: data di fine se multi-giorno (stringa ISO 8601, null se non presente)
- location: luogo/venue dell'evento (stringa, null se non presente)
- description: descrizione completa dell'evento (stringa)
- price: informazioni sul prezzo o "Ingresso libero" (stringa, null se non specificato)
- category: categoria dell'evento (Musica, Arte & Mostre, Teatro, Cinema, Sport, Bambini & Famiglie, Gastronomia, Cultura & Convegni, Mercati & Fiere, Natura & Escursioni, Altro)
- source_url: URL della pagina dell'evento (stringa, null se non disponibile)
- date_parse_confidence: "high", "medium" o "low"

Restituisci SOLO un array JSON valido di oggetti evento, senza markdown o spiegazioni.`,
  },
  {
    key: "extraction_screenshot",
    label: "Estrazione da screenshot",
    description: "Prompt inviato a Claude Vision per estrarre campi strutturati da immagini.",
    content: `Sei un assistente specializzato nell'estrazione di informazioni su eventi locali da immagini.

Analizza tutte le immagini fornite e combina le informazioni presenti per identificare l'evento. Restituisci un oggetto JSON con:
- title, date (ISO 8601), date_end, location, description, price, category, date_parse_confidence

Restituisci SOLO l'oggetto JSON, senza markdown o spiegazioni.`,
  },
  {
    key: "extraction_text",
    label: "Estrazione da testo libero",
    description: "Prompt per estrarre campi strutturati da testo libero incollato.",
    content: `Sei un assistente specializzato nell'estrazione di informazioni su eventi locali da testo libero.

Analizza il testo (potrebbe essere un messaggio WhatsApp, un post Facebook, un'email) ed estrai le informazioni. Restituisci un oggetto JSON con:
- title, date (ISO 8601), date_end, location, description, price, category, date_parse_confidence

Restituisci SOLO l'oggetto JSON, senza markdown o spiegazioni.`,
  },
  {
    key: "rewrite_description",
    label: "Riscrittura descrizione evento",
    description: "Riscrive description_raw in description_clean: italiano editoriale, coinvolgente, conciso.",
    content: `Sei il redattore della newsletter "Varese Life".

Riscrivi la descrizione grezza in italiano editoriale coinvolgente e conciso (3-5 frasi, 80-150 parole).
- Tono: caldo, locale, coinvolgente ma professionale
- Invita il lettore senza essere pubblicitario
- Usa il tu/voi per rivolgerti ai lettori
- Non aggiungere informazioni non presenti nel testo originale

Restituisci SOLO il testo rielaborato, senza titolo, senza markdown, senza spiegazioni.`,
  },
  {
    key: "newsletter_intro",
    label: "Introduzione newsletter",
    description: "Genera il testo di apertura per la newsletter dato l'elenco degli eventi.",
    content: `Sei il redattore della newsletter "Varese Life".

Scrivi un'introduzione calorosa (100-150 parole) per la newsletter di questa settimana.
- Saluta i lettori in modo personale
- Crea attesa e curiosità senza nominare singoli eventi
- Concludi con un invito a leggere e partecipare
- Tono: amichevole, locale, entusiasta ma non eccessivo

Restituisci SOLO il testo dell'introduzione, senza markdown o spiegazioni.`,
  },
  {
    key: "event_category",
    label: "Categorizzazione evento",
    description: "Assegna una categoria a un evento dato titolo e descrizione.",
    content: `Analizza il titolo e la descrizione dell'evento e assegna UNA delle seguenti categorie:
Musica, Arte & Mostre, Teatro, Cinema, Sport, Bambini & Famiglie, Gastronomia, Cultura & Convegni, Mercati & Fiere, Natura & Escursioni, Altro

Restituisci SOLO il nome della categoria, senza spiegazioni.`,
  },
];

const DEFAULT_CATEGORIES = [
  "Musica", "Arte & Mostre", "Teatro", "Cinema", "Sport",
  "Bambini & Famiglie", "Gastronomia", "Cultura & Convegni",
  "Mercati & Fiere", "Natura & Escursioni", "Altro"
];

const DEFAULT_TEMPLATE_HTML = {
  intro: `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Georgia,'Times New Roman',serif;">
  <tr><td style="padding:24px;background-color:#2E7D32;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:1px;">VARESE LIFE</h1>
    <p style="color:#a5d6a7;margin:4px 0 0;font-size:13px;font-family:Arial,sans-serif;">{{newsletter_date}}</p>
  </td></tr>
  <tr><td style="padding:24px;color:#1A1A1A;line-height:1.7;font-size:16px;">
    {{intro_text}}
  </td></tr>
</table>`,
  events: `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-left:4px solid #2E7D32;padding-left:16px;font-family:Georgia,'Times New Roman',serif;">
  <tr><td><h3 style="margin:0 0 4px;color:#1A1A1A;font-size:18px;">{{event_title}}</h3></td></tr>
  <tr><td style="color:#2E7D32;font-size:13px;font-family:Arial,Helvetica,sans-serif;padding-bottom:8px;">{{event_date}}{{event_location}}</td></tr>
  {{event_price}}
  <tr><td style="color:#1A1A1A;font-size:15px;line-height:1.6;padding-bottom:8px;">{{event_description}}</td></tr>
  <tr><td><a href="{{event_url}}" style="color:#2E7D32;font-size:13px;font-family:Arial,Helvetica,sans-serif;text-decoration:none;">Scopri di più →</a></td></tr>
</table>`,
  footer: `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="padding:24px;border-top:1px solid #e0e0e0;color:#555;font-size:13px;text-align:center;">
    {{footer_text}}
    <p style="margin:8px 0 0;color:#999;font-size:11px;">© {{year}} Varese Life</p>
  </td></tr>
</table>`,
};

const DEFAULT_SOURCES = [
  { name: "ANCI Lombardia", url: "https://anci.lombardia.it/dettaglio-news/2023511551-eventi-segnalati-dai-comuni/" },
  { name: "Art and Charity", url: "https://www.artandcharity.it/eventi" },
  { name: "Biblioteca di Varese", url: "https://bibliotecavarese.it/feed/" },
  { name: "BustoEventi", url: "https://www.bustoeventi.it/" },
  { name: "Campo dei Fiori", url: "https://www.parcocampodeifiori.it/campofiori/po/elenco_news.php?&area=H" },
  { name: "Casa Museo Pogliaghi", url: "http://www.casamuseopogliaghi.it/feed/" },
  { name: "Comune di Albizzate", url: "https://www.comune.albizzate.va.it/EG0/EGSCHTST38.HBL" },
  { name: "Comune di Angera", url: "https://www.angera.it/it/esperienze/eventi" },
  { name: "Comune di Azzate", url: "https://comune.azzate.va.it/eventi" },
  { name: "Comune di Barasso", url: "https://www.comune.barasso.va.it/it/eventi" },
  { name: "Comune di Besano", url: "https://comune.besano.va.it/eventi" },
  { name: "Comune di Cardano al Campo", url: "https://comune.cardanoalcampo.va.it/vivere-il-comune/eventi/" },
  { name: "Comune di Cassano Magnago", url: "https://www.comune.cassanomagnago.va.it/feed/" },
  { name: "Comune di Castellanza", url: "https://www.comune.castellanza.va.it/vivere-il-comune/eventi/" },
  { name: "Comune di Gallarate", url: "https://www.comune.gallarate.va.it/prova/" },
  { name: "Comune di Luino", url: "https://www.comune.luino.va.it/eventi" },
  { name: "Comune di Malnate", url: "https://comune.malnate.va.it/vivere-il-comune/eventi/" },
  { name: "Comune di Saronno", url: "https://comune.saronno.va.it/eventi" },
  { name: "Comune di Ternate", url: "https://www.comune.ternate.va.it/EG0/EGSCHTST38.HBL?en=eg160&MESSA=PUBBLICA" },
  { name: "Comune di Tradate", url: "https://comune.tradate.va.it/eventi/" },
  { name: "Comune di Varese", url: "https://www.comune.varese.it/c012133/zf/index.php/servizi-aggiuntivi/index/index/idtesto/358" },
  { name: "Comune di Venegono Inferiore", url: "https://www.comune.venegonoinferiore.va.it/it/eventi" },
  { name: "Comune di Vergiate", url: "https://www.comune.vergiate.va.it/it/eventi" },
  { name: "Controvento Trekking", url: "https://www.controventotrekking.it/" },
  { name: "Crazy Comics and Games", url: "https://www.crazycomicsandgames.it/eventi/" },
  { name: "Eventbrite Varese", url: "https://www.eventbrite.com/d/italy--varese/events/" },
  { name: "Famiglia Bosina", url: "https://www.famigliabosina.it/feed/" },
  { name: "Fondazione Morandini", url: "https://www.fondazionemarcellomorandini.com/feed/" },
  { name: "Google Events", url: "https://www.google.com/search?q=evento+varese&sca_esv=5f09d3ac69940124&tbm=nws&sxsrf=ANbL-n5jz4dX15c1iCqHqy4YQB5q_tDEEA:1772116392396&source=lnt&tbs=qdr:d&sa=X&ved=2ahUKEwiI28aAsPeSAxVhTaQEHZLcBWMQpwV6BAgDEAs&biw=1920&bih=911&dpr=1" },
  { name: "Grotta Remeron", url: "https://www.grottaremeron.com/" },
  { name: "InLombardia - Eventi Varese", url: "https://www.in-lombardia.it/it/eventi?location=Varese+%28Provincia%29" },
  { name: "Italia Nostra - Varese", url: "https://italianostravarese.org/" },
  { name: "La Prealpina", url: "https://www.prealpina.it/pages/category/eventi-47/" },
  { name: "La Provincia di Varese - News", url: "https://www.laprovinciadivarese.it/feed/" },
  { name: "La Vecchia Varese", url: "https://www.lavecchiavarese.it/concerti-e-news/" },
  { name: "Libreria degli Asinelli", url: "https://libreriadegliasinelli.com/category/agenda-culturale/" },
  { name: "Libreria Potere ai Bambini", url: "https://www.potereaibambini.it/feed/" },
  { name: "Libreria Ubik", url: "https://www.ubiklibri.it/librerie/ubik-varese" },
  { name: "Lombardia Segreta", url: "https://lombardiasegreta.com/eventi/" },
  { name: "Malpensa24", url: "https://www.malpensa24.it/feed/" },
  { name: "Musei Varese", url: "https://www.museivarese.it/feed/" },
  { name: "Museo Baroffio", url: "http://www.museobaroffio.it/" },
  { name: "Museo Bodini", url: "https://www.museobodini.it/feed/" },
  { name: "Museo dei Fossili di Besano", url: "https://museodibesano.it/feed/" },
  { name: "Museo MA*GA", url: "https://www.museomaga.it/it/agenda" },
  { name: "Osservatorio Schiaparelli", url: "https://www.astrogeo.va.it/astronomia/eventi.php" },
  { name: "Pro Loco Azzate", url: "https://www.proazzate.org/news.php" },
  { name: "Pro Loco Brinzio", url: "https://www.prolocobrinzio.it/it/informazioni/eventi-e-manifestazioni" },
  { name: "Pro Loco Castiglione Olona", url: "https://www.prolococastiglioneolona.it/eventi-pro-loco/" },
  { name: "Pro Loco Gavirate", url: "https://www.progavirate.com/eventi/" },
  { name: "Pro Loco Luino", url: "https://nuovaprolocoluino.com/feed/" },
  { name: "Pro Loco Sesto Calende", url: "https://prosestocalende.it/feed/" },
  { name: "Pro Loco Somma Lombardo", url: "https://www.prolocosommalombardo.com/feed/" },
  { name: "Provincia di Varese", url: "https://www.provincia.va.it/eventi" },
  { name: "Sacro Monte", url: "http://www.sacromontedivarese.it/appuntamenti.html" },
  { name: "Speleoprealpino", url: "https://speleoprealpino.it/feed/" },
  { name: "Terre Borromeo", url: "https://terreborromeo.it/press-kit" },
  { name: "Varese #DoYouLake", url: "https://www.varesedoyoulake.it/it/eventi" },
  { name: "Varese 7 Press", url: "https://www.varese7press.it/category/spettacoli/tempo-libero/" },
  { name: "Varese in Luce", url: "https://www.vareseinluce.it/" },
  { name: "Varese Informa", url: "https://www.vareseinforma.it/" },
  { name: "Varese per Bambini", url: "https://www.vareseperibambini.it/agenda-varese/calendario.html?layout=monthly" },
  { name: "Varese Sport Commission", url: "https://varesesportcommission.it/index.php/eventi" },
  { name: "Varese Turismo", url: "https://www.vareseturismo.it/" },
  { name: "VareseNews", url: "https://www.varesenews.it/homepage/feed/" },
  { name: "VareseNoi - Eventi", url: "https://www.varesenoi.it/links/rss/argomenti/varesenoiit/rss.xml" },
  { name: "Verbano News", url: "https://www.verbanonews.it/" },
  { name: "Villa Panza", url: "https://fondoambiente.it/villa-e-collezione-panza/" },
  { name: "Virgilio Eventi Varese", url: "https://www.virgilio.it/italia/varese/eventi/" },
];

async function seed() {
  console.log("🌱 Seeding database...");

  // Create session table if not exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    )
  ` as any);
  await db.execute(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")` as any);

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set");
    process.exit(1);
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
  if (!existing.length) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await db.insert(usersTable).values({
      email: adminEmail, passwordHash: hash,
      role: "superadmin", isSuperadmin: true, active: true,
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
  }

  // Prompts
  for (const p of DEFAULT_PROMPTS) {
    const exists = await db.select().from(promptsTable).where(eq(promptsTable.key, p.key)).limit(1);
    if (!exists.length) {
      await db.insert(promptsTable).values({ ...p, defaultContent: p.content });
      console.log(`✅ Prompt created: ${p.key}`);
    }
  }

  // Default settings
  const settingsToSeed = [
    { key: "publication_day", value: "4" },
    { key: "categories", value: JSON.stringify(DEFAULT_CATEGORIES) },
    { key: "cron_expression", value: "0 8 * * *" },
    { key: "cron_enabled", value: "false" },
    { key: "browseract_single_page_workflow_id", value: "" },
    { key: "app_base_url", value: "" },
  ];
  for (const s of settingsToSeed) {
    const exists = await db.select().from(settingsTable).where(eq(settingsTable.key, s.key)).limit(1);
    if (!exists.length) {
      await db.insert(settingsTable).values(s);
      console.log(`✅ Setting created: ${s.key}`);
    }
  }

  // Default template
  const tmplExists = await db.select().from(templatesTable).limit(1);
  if (!tmplExists.length) {
    await db.insert(templatesTable).values({
      name: "Varese Life Default",
      description: "Template predefinito con brand green e layout email-safe",
      introHtml: DEFAULT_TEMPLATE_HTML.intro,
      eventsHtml: DEFAULT_TEMPLATE_HTML.events,
      footerHtml: DEFAULT_TEMPLATE_HTML.footer,
      isDefault: true,
    });
    console.log("✅ Default template created");
  }

  // Sources
  for (const s of DEFAULT_SOURCES) {
    const exists = await db.select().from(sourcesTable).where(eq(sourcesTable.name, s.name)).limit(1);
    if (!exists.length) {
      const [inserted] = await db.insert(sourcesTable).values({
        name: s.name,
        preferredScraper: "claude_fallback",
        active: true,
      }).returning();
      await db.insert(sourceUrlsTable).values({
        sourceId: inserted.id,
        url: s.url,
        active: true,
      });
      console.log(`✅ Source created: ${s.name}`);
    }
  }

  console.log("✅ Seed completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
