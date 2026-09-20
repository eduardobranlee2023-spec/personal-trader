const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Busca el .env tanto si el script se corre desde frontend/ como desde la raíz
const envPath = fs.existsSync(path.resolve(__dirname, '../frontend/.env'))
  ? path.resolve(__dirname, '../frontend/.env')
  : path.resolve(__dirname, '.env');

const envFile = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_URL'))?.split('=')[1].trim();
const supabaseKey = envFile.split('\n').find(line => line.startsWith('VITE_SUPABASE_ANON_KEY'))?.split('=')[1].trim();

if (!supabaseUrl || !supabaseKey) {
  console.error("No se encontraron las credenciales de Supabase en frontend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Temas verificados (no incluimos los que devuelven array vacío o no existen)
const TOPICS = [96, 45, 6, 93, 92, 78, 65, 68];

async function populate() {
  console.log("Obteniendo libros en español de RV1960...");
  let spanishBooksMap = {};
  try {
    const booksRes = await fetch('https://bolls.life/get-books/RV1960/');
    const booksData = await booksRes.json();
    for (const b of booksData) {
      spanishBooksMap[b.bookid] = b.name;
    }
  } catch (err) {
    console.error("Error obteniendo libros:", err);
    return;
  }

  const versesToInsert = [];

  for (const topicId of TOPICS) {
    console.log(`\nProcesando Topic ID: ${topicId}`);
    try {
      const topicRes = await fetch(`https://biblebytopic.com/api/getversesfortopic/${topicId}`);
      const topicData = await topicRes.json();
      const topicName = topicData.topic;
      const verses = topicData.verses || [];
      
      console.log(`Encontrados ${verses.length} versículos para el tema "${topicName}"`);

      // Tomamos solo unos pocos para no exceder, o todos
      for (const v of verses) {
        const bookId = v.book;
        const chapter = v.chapter;
        const startVerse = v.startingverse;
        const endVerse = v.endingverse;
        
        // Obtener capítulo completo de Bolls API
        const textRes = await fetch(`https://bolls.life/get-text/RV1960/${bookId}/${chapter}/`);
        if (!textRes.ok) {
          console.log(`  - Falló la consulta a Bolls API para el libro ${bookId} cap ${chapter}`);
          continue;
        }
        const textData = await textRes.json();
        
        // Buscar el versículo específico
        // Si hay un endingverse distinto al starting, concatenamos
        let textEs = "";
        const end = endVerse ? endVerse : startVerse;
        for (let i = startVerse; i <= end; i++) {
          const verseObj = textData.find(t => t.verse === i);
          if (verseObj) {
            // Removemos tags HTML simples que pueda traer
            const cleanText = verseObj.text.replace(/<[^>]+>/g, '');
            textEs += (i > startVerse ? " " : "") + cleanText;
          }
        }
        
        if (textEs) {
          const bookNameEs = spanishBooksMap[bookId] || v.bookname;
          const ref = `${bookNameEs} ${chapter}:${startVerse}${end > startVerse ? '-' + end : ''}`;
          
          versesToInsert.push({
            topic: topicName,
            reference: ref,
            text_es: textEs
          });
          console.log(`  + Guardado: ${ref}`);
        } else {
          console.log(`  - No se encontró el texto en español para el libro ${bookId} cap ${chapter} v${startVerse}`);
        }
        
        // Pequeño delay para no saturar la API
        await new Promise(r => setTimeout(r, 100));
      }

    } catch (err) {
      console.error(`Error procesando Topic ID ${topicId}:`, err);
    }
  }

  console.log(`\nTotal de versículos procesados: ${versesToInsert.length}`);
  if (versesToInsert.length > 0) {
    console.log("Insertando en Supabase...");
    const { data, error } = await supabase.from('bible_verses').insert(versesToInsert);
    if (error) {
      console.error("Error insertando en la DB:", error);
    } else {
      console.log("¡Insertados correctamente!");
    }
  }
}

populate();
