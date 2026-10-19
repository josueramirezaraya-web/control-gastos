import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Fallback categorization rule dictionary
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentación': ['jumbo', 'lider', 'unimarc', 'santa isabel', 'tottus', 'uber eats', 'rappi', 'pedidosya', 'mercadona', 'carrefour', 'walmart', 'supermercado', 'restaurante', 'mcdonalds', 'starbucks', 'cafe', 'cafeteria', 'pizza', 'comida', 'panaderia', 'cena', 'almuerzo'],
  'Transporte': ['copec', 'merval', 'autopista', 'uber', 'cabify', 'didi', 'gasolina', 'combustible', 'shell', 'repsol', 'bp', 'metro', 'tren', 'bus', 'peaje', 'parking', 'estacionamiento', 'avion', 'vuelo'],
  'Vivienda': ['gastos comunes', 'dividendo', 'arriendo', 'alquiler', 'renta', 'hipoteca', 'comunidad', 'muebles', 'ikea', 'reparacion', 'ferreteria', 'pintura'],
  'Servicios': ['enel', 'esval', 'aguas andinas', 'entel', 'movistar', 'wom', 'vtr', 'claro', 'chilquinta', 'gasco', 'metrogas', 'luz', 'electricidad', 'agua', 'internet', 'fibra', 'telefono', 'movil', 'gas', 'netflix', 'spotify', 'disney', 'prime', 'apple', 'google storage', 'icloud', 'openai'],
  'Entretenimiento': ['cinemark', 'cinehoyts', 'cine', 'teatro', 'concierto', 'videojuego', 'steam', 'playstation', 'nintendo', 'bar', 'fiesta', 'discoteca', 'bolera'],
  'Salud y Bienestar': ['ahumada', 'cruz verde', 'salcobrand', 'isapre', 'clinica', 'farmacia', 'doctor', 'medico', 'dentista', 'hospital', 'gym', 'gimnasio', 'fitness', 'crossfit', 'optica', 'psicologo'],
  'Compras': ['falabella', 'ripley', 'mercado libre', 'sodimac', 'amazon', 'zara', 'h&m', 'ropa', 'zapatos', 'electronica', 'aliexpress', 'corte ingles', 'tienda', 'tecnologia'],
  'Educación': ['curso', 'universidad', 'colegio', 'matricula', 'udemy', 'coursera', 'libro', 'tutor'],
  'Finanzas e Inversiones': ['banco', 'comision', 'seguro', 'inversion', 'acciones', 'crypto', 'interes'],
};

function getLocalCategory(text: string): { category: string; subcategory: string; confidence: number; tags: string[] } {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return {
          category,
          subcategory: kw.charAt(0).toUpperCase() + kw.slice(1),
          confidence: 0.9,
          tags: [kw, category.toLowerCase()],
        };
      }
    }
  }
  return {
    category: 'Otros',
    subcategory: 'General',
    confidence: 0.5,
    tags: ['general'],
  };
}

// 1. Smart Categorization endpoint
app.post('/api/ai/categorize', async (req, res) => {
  try {
    const { description, amount, merchant } = req.body;
    if (!description && !merchant) {
      return res.status(400).json({ error: 'Description or merchant is required' });
    }

    const query = `${merchant ? merchant + ' ' : ''}${description || ''}`.trim();

    if (!process.env.GEMINI_API_KEY) {
      const fallback = getLocalCategory(query);
      return res.json(fallback);
    }

    const prompt = `Analiza la siguiente transacción financiera y clasifícala en la categoría de gastos más adecuada:
Texto: "${query}"
Monto: ${amount ? amount : 'No especificado'}
Contexto: comercios de Chile y montos en pesos chilenos (CLP).

Categorías válidas:
- Alimentación (Supermercados, restaurantes, bares, delivery de comida, cafés)
- Transporte (Gasolina, Uber/taxi, transporte público, vuelos, peajes, parking)
- Vivienda (Alquiler, hipoteca, mantenimiento, muebles, reformas)
- Servicios (Electricidad, agua, gas, internet, telefonía, suscripciones digitales)
- Entretenimiento (Cine, videojuegos, salidas, eventos, ocio)
- Salud y Bienestar (Farmacias, clínicas, gimnasio, cuidado personal)
- Compras (Ropa, tecnología, compras generales, accesorios)
- Educación (Cursos, libros, escuelas, certificaciones)
- Finanzas e Inversiones (Seguros, comisiones, transferencias, ahorro)
- Otros (Cualquier gasto que no encaje en las anteriores)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: 'Categoría principal normalizada exacta de la lista' },
            subcategory: { type: Type.STRING, description: 'Subcategoría sugerida (ej. Restaurante, Farmacia, Combustible)' },
            confidence: { type: Type.NUMBER, description: 'Nivel de confianza entre 0 y 1' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Etiquetas clave asociadas',
            },
            suggestedNote: { type: Type.STRING, description: 'Descripción o nota limpia sugerida' },
          },
          required: ['category', 'subcategory', 'confidence', 'tags'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Categorize error:', err?.message || err);
    const fallback = getLocalCategory(req.body?.description || req.body?.merchant || '');
    return res.json(fallback);
  }
});

// 2. Receipt image extraction endpoint
app.post('/api/ai/analyze-receipt', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY no está configurada en las variables de entorno.',
      });
    }

    // Strip data url prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `Analiza esta imagen de ticket de compra o factura.
Extrae los datos financieros estructurados con precisión:
1. Nombre del comercio o establecimiento (merchant).
2. Monto total pagado (total en número decimal).
3. Fecha de la transacción en formato YYYY-MM-DD (si no es legible, usa la fecha de hoy).
4. Categoría asignada (Alimentación, Transporte, Vivienda, Servicios, Entretenimiento, Salud y Bienestar, Compras, Educación, Finanzas e Inversiones, u Otros).
5. Lista de artículos comprados con su precio y cantidad si son visibles.
6. Moneda detectada (ej: CLP, USD, EUR).
7. Impuestos detectados (tax) si figuran en el ticket.
8. Confianza general de la extracción (entre 0.0 y 1.0).`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, description: 'Nombre del comercio o emisor' },
            total: { type: Type.NUMBER, description: 'Monto total extraído' },
            date: { type: Type.STRING, description: 'Fecha YYYY-MM-DD' },
            category: { type: Type.STRING, description: 'Categoría principal' },
            currency: { type: Type.STRING, description: 'Código de moneda ISO o símbolo' },
            tax: { type: Type.NUMBER, description: 'Impuestos o IVA' },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  qty: { type: Type.NUMBER },
                },
                required: ['name', 'price'],
              },
            },
            notes: { type: Type.STRING, description: 'Resumen o notas detectadas' },
            confidence: { type: Type.NUMBER, description: 'Nivel de confianza de 0 a 1' },
          },
          required: ['merchant', 'total', 'category'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Receipt extraction error:', err?.message || err);
    return res.status(500).json({ error: 'No se pudo procesar la factura o recibo: ' + err.message });
  }
});

// 3. Multi-turn Financial Advisor Chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: 'Hola. Para activar las respuestas de IA en tiempo real, configura la variable GEMINI_API_KEY. Mientras tanto, puedes revisar tus reportes automáticos y presupuestos en el panel principal.',
      });
    }

    const systemInstruction = `Eres "JERA AI", el asistente y asesor de finanzas personales inteligente de la aplicación JERA.
Tu objetivo es ayudar al usuario a optimizar sus gastos, cumplir presupuestos, ahorrar e invertir sabiamente.

Contexto financiero actual del usuario:
- Moneda: ${context?.currency || 'CLP'}
- Ingresos del mes: ${context?.totalIncome || 0}
- Gastos del mes: ${context?.totalExpenses || 0}
- Ahorro neto mensual: ${context?.netSavings || 0} (${context?.savingsRate || 0}%)
- Estado de presupuestos: ${JSON.stringify(context?.budgets || [])}
- Categorías con mayor gasto: ${JSON.stringify(context?.topCategories || [])}
- Total transacciones registradas: ${context?.transactionCount || 0}

Instrucciones:
1. Responde de forma concisa, cálida, profesional y orientada a la acción.
2. Analiza los números reales del usuario para darle recomendaciones concretas y personalizadas.
3. Si un presupuesto está en riesgo o excedido, dale alertas constructivas y trucos de ahorro (ej. regla 50/30/20, recorte de suscripciones, microahorro).
4. Usa formato Markdown con viñetas, negritas y emojis sutiles cuando mejore la legibilidad.
5. Mantén respuestas centradas en el control financiero y educación financiera.`;

    // Format contents for Gemini SDK
    const formattedContents = messages.map((m: any) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || m.text || '' }],
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return res.json({ reply: response.text });
  } catch (err: any) {
    console.error('Chat error:', err?.message || err);
    return res.status(500).json({ error: 'Error al contactar con SaveMoney AI: ' + err.message });
  }
});

// 4. Smart Budget Insights & Tips endpoint
app.post('/api/ai/budget-advice', async (req, res) => {
  try {
    const { summary } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        insights: [
          {
            type: 'tip',
            title: 'Regla del 50/30/20',
            description: 'Destina el 50% de tus ingresos a necesidades, 30% a gustos y 20% a ahorro e inversión.',
            severity: 'info',
          },
          {
            type: 'budget',
            title: 'Revisión periódica',
            description: 'Registra tus gastos a diario para evitar desviaciones al final de la quincena.',
            severity: 'success',
          },
        ],
      });
    }

    const prompt = `Analiza este resumen financiero mensual y genera entre 3 y 4 consejos breves de alto impacto y alertas de anomalías:
${JSON.stringify(summary, null, 2)}

Devuelve una lista con recomendaciones directas y perspicaces.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: 'warning, tip, alert, o opportunity' },
              title: { type: Type.STRING, description: 'Título corto e impactante' },
              description: { type: Type.STRING, description: 'Explicación clara de 1 o 2 oraciones' },
              severity: { type: Type.STRING, description: 'info, warning, danger, o success' },
              category: { type: Type.STRING, description: 'Categoría relacionada opcional' },
            },
            required: ['type', 'title', 'description', 'severity'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return res.json({ insights: parsed });
  } catch (err: any) {
    console.error('Budget advice error:', err?.message || err);
    return res.json({
      insights: [
        {
          type: 'tip',
          title: 'Monitorea tus gastos fijos',
          description: 'Los pequeños gastos hormiga sumados a fin de mes representan hasta un 15% del presupuesto.',
          severity: 'info',
        },
      ],
    });
  }
});

// Mount Vite or serve static
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JERA server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
