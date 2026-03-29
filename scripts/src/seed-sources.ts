import { db } from "@workspace/db";
import { sourcesTable, sourceUrlsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const SOURCES = [
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

async function seedSources() {
  console.log("🌱 Seeding sources...");
  let created = 0;
  let skipped = 0;

  for (const s of SOURCES) {
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
      console.log(`✅ Created: ${s.name}`);
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Done. Created: ${created}, Skipped (already exist): ${skipped}`);
  process.exit(0);
}

seedSources().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
