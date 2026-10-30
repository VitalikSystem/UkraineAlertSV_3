import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const ALERTS_IN_UA_TOKEN = process.env.ALERTS_IN_UA_TOKEN || '591cf947887c468fcf9e6ec0e4f7e74b02ddca04ab2203';
  let alertsCache: { data: any; timestamp: number } | null = null;
  const CACHE_TTL_MS = 15000; // 15 seconds cache to stay well within 8-10 req/min limit

  const REGION_MAPPING = [
    { id: 'volyn', name: 'Волинська область', center: 'Луцьк' },
    { id: 'rivne', name: 'Рівненська область', center: 'Рівне' },
    { id: 'zhytomyr', name: 'Житомирська область', center: 'Житомир' },
    { id: 'kyiv_obl', name: 'Київська область', center: 'Київ' },
    { id: 'kyiv_city', name: 'м. Київ', center: 'Київ' },
    { id: 'chernihiv', name: 'Чернігівська область', center: 'Чернігів' },
    { id: 'sumy', name: 'Сумська область', center: 'Суми' },
    { id: 'kharkiv', name: 'Харківська область', center: 'Харків' },
    { id: 'luhansk', name: 'Луганська область', center: 'Луганськ' },
    { id: 'donetsk', name: 'Донецька область', center: 'Донецьк' },
    { id: 'dnipro', name: 'Дніпропетровська область', center: 'Дніпро' },
    { id: 'poltava', name: 'Полтавська область', center: 'Полтава' },
    { id: 'cherkasy', name: 'Черкаська область', center: 'Черкаси' },
    { id: 'kirovohrad', name: 'Кіровоградська область', center: 'Кропивницький' },
    { id: 'zaporizhzhia', name: 'Запорізька область', center: 'Запоріжжя' },
    { id: 'kherson', name: 'Херсонська область', center: 'Херсон' },
    { id: 'mykolaiv', name: 'Миколаївська область', center: 'Миколаїв' },
    { id: 'odesa', name: 'Одеська область', center: 'Одеса' },
    { id: 'vinnytsia', name: 'Вінницька область', center: 'Вінниця' },
    { id: 'khmelnytskyi', name: 'Хмельницька область', center: 'Хмельницький' },
    { id: 'ternopil', name: 'Тернопільська область', center: 'Тернопіль' },
    { id: 'lviv', name: 'Львівська область', center: 'Львів' },
    { id: 'ivano_frankivsk', name: 'Івано-Франківська область', center: 'Івано-Франківськ' },
    { id: 'zakarpattia', name: 'Закарпатська область', center: 'Ужгород' },
    { id: 'chernivtsi', name: 'Чернівецька область', center: 'Чернівці' },
    { id: 'crimea', name: 'АР Крим та м. Севастополь', center: 'Сімферополь' },
  ];

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      hasAlertsToken: Boolean(ALERTS_IN_UA_TOKEN),
      model: 'gemini-3.8-flash-tts',
    });
  });

  // Real-time alerts API from alerts.in.ua
  app.get('/api/alerts/live', async (req, res) => {
    try {
      const now = Date.now();
      const forceRefresh = req.query.refresh === 'true';

      let rawData: any = null;
      if (!forceRefresh && alertsCache && now - alertsCache.timestamp < CACHE_TTL_MS) {
        rawData = alertsCache.data;
      } else {
        const token = (req.query.token as string) || ALERTS_IN_UA_TOKEN;
        const response = await fetch('https://api.alerts.in.ua/v1/alerts/active.json', {
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'aistudio-build-alerts',
          },
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          if (alertsCache) {
            // Serve cached if temporary 429
            rawData = alertsCache.data;
          } else {
            return res.status(response.status).json({
              error: `alerts.in.ua API error (${response.status}): ${errText || 'Не вдалося отримати дані'}`,
            });
          }
        } else {
          rawData = await response.json();
          alertsCache = { data: rawData, timestamp: now };
        }
      }

      const alertsList: any[] = Array.isArray(rawData?.alerts) ? rawData.alerts : [];

      // Parse status per Ukrainian region
      const regionsStatus: Record<string, {
        active: boolean;
        level: 'green' | 'yellow' | 'red';
        alertType: 'air' | 'ballistic' | 'artillery' | 'drone' | 'none';
        startedAt?: string;
        affectedAreas: string[];
        messages: string[];
      }> = {};

      for (const reg of REGION_MAPPING) {
        let matchingAlerts: any[] = [];

        if (reg.id === 'kyiv_city') {
          matchingAlerts = alertsList.filter((a) =>
            a.location_title === 'м. Київ' || a.location_title === 'Київ'
          );
        } else if (reg.id === 'kyiv_obl') {
          matchingAlerts = alertsList.filter((a) =>
            a.location_oblast === 'Київська область' && a.location_title !== 'м. Київ'
          );
        } else if (reg.id === 'crimea') {
          matchingAlerts = alertsList.filter((a) =>
            a.location_oblast === 'Автономна Республіка Крим' ||
            a.location_title === 'Автономна Республіка Крим' ||
            a.location_oblast === 'м. Севастополь' ||
            a.location_title === 'м. Севастополь'
          );
        } else {
          matchingAlerts = alertsList.filter((a) =>
            a.location_oblast === reg.name || a.location_title === reg.name
          );
        }

        const isActive = matchingAlerts.length > 0;
        let level: 'green' | 'yellow' | 'red' = 'green';
        let alertType: 'air' | 'ballistic' | 'artillery' | 'drone' | 'none' = 'none';
        let startedAt: string | undefined = undefined;
        const affectedAreas: string[] = [];
        const messages: string[] = [];

        if (isActive) {
          // Check for red vs yellow level
          let hasRed = false;
          let hasYellow = false;
          let hasDroneThreat = false;
          let hasBallisticThreat = false;
          let hasArtilleryThreat = false;

          for (const alert of matchingAlerts) {
            affectedAreas.push(alert.location_title);
            if (!startedAt || (alert.started_at && alert.started_at < startedAt)) {
              startedAt = alert.started_at;
            }

            if (alert.alert_level === 'red') hasRed = true;
            if (alert.alert_level === 'yellow') hasYellow = true;

            if (Array.isArray(alert.threats)) {
              for (const threat of alert.threats) {
                if (threat.level === 'red') hasRed = true;
                if (threat.level === 'yellow') hasYellow = true;

                if (threat.threat_type === 'drones') hasDroneThreat = true;
                if (threat.threat_type?.includes('ballistic')) hasBallisticThreat = true;
                if (threat.threat_type?.includes('artillery')) hasArtilleryThreat = true;

                if (threat.source_message) {
                  messages.push(threat.source_message);
                }
              }
            }
          }

          if (hasRed) {
            level = 'red';
          } else if (hasYellow || hasDroneThreat) {
            level = 'yellow';
          } else {
            level = 'red'; // default active alert level
          }

          if (hasBallisticThreat) alertType = 'ballistic';
          else if (hasArtilleryThreat) alertType = 'artillery';
          else if (level === 'yellow' || hasDroneThreat) alertType = 'drone';
          else alertType = 'air';
        }

        regionsStatus[reg.id] = {
          active: isActive,
          level,
          alertType,
          startedAt,
          affectedAreas: Array.from(new Set(affectedAreas)),
          messages: Array.from(new Set(messages)),
        };
      }

      const activeCount = Object.values(regionsStatus).filter((s) => s.active).length;

      return res.json({
        success: true,
        source: 'alerts.in.ua',
        cached: !forceRefresh && alertsCache && now - alertsCache.timestamp > 0,
        cacheAgeMs: alertsCache ? now - alertsCache.timestamp : 0,
        activeCount,
        totalRegions: REGION_MAPPING.length,
        meta: rawData?.meta,
        regionsStatus,
        lastUpdatedAt: rawData?.meta?.last_updated_at || new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching alerts.in.ua:', err);
      return res.status(500).json({
        error: err?.message || 'Помилка підключення до alerts.in.ua',
      });
    }
  });

  // Text-To-Speech endpoint using gemini-3.8-flash-tts
  app.post('/api/tts', async (req, res) => {
    try {
      const {
        text,
        voice = 'Kore',
        style = 'Clear, authoritative emergency broadcast alert announcer',
      } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Текст для озвучення обов’язковий' });
      }

      // Valid prebuilt voices: Puck, Charon, Kore, Fenrir, Zephyr
      const validVoices = ['Kore', 'Fenrir', 'Puck', 'Charon', 'Zephyr'];
      const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.trim(),
                speechMetadata: {
                  style: style || 'Clear, authoritative civil defense emergency announcer',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const audioBase64 = part?.inlineData?.data;

      if (!audioBase64) {
        return res.status(500).json({
          error: 'Модель не повернула аудіодані. Перевірте квоту або API ключ.',
        });
      }

      return res.json({
        audioBase64,
        mimeType: part?.inlineData?.mimeType || 'audio/wav',
        text: text.trim(),
        voice: chosenVoice,
      });
    } catch (err: any) {
      console.error('Помилка генерації TTS:', err);
      return res.status(500).json({
        error: err?.message || 'Помилка синтезу мовлення через Gemini TTS',
      });
    }
  });

  // AI Emergency Announcement Draft Generator endpoint using gemini-3.8-flash
  app.post('/api/generate-alert', async (req, res) => {
    const {
      alertType = 'clear', // 'clear' (відбій) or 'alert' (тривога)
      region = 'Київ та Київська область',
      threatType = 'ракетної небезпеки та ударних БПЛА',
      additionalNotes = '',
    } = req.body || {};

    try {
      const isClear = alertType === 'clear';
      const prompt = `Ви — офіційний диктор цивільного захисту Державної служби України з надзвичайних ситуацій (ДСНС).
Складіть офіційний, виразний текст голосового радіосповіщення для цивільного населення.
Подія: ${isClear ? 'ВІДБІЙ ПОВІТРЯНОЇ ТРИВОГИ (Скасування тривоги)' : 'ОГОЛОШЕННЯ ПОВІТРЯНОЇ ТРИВОГИ'}.
Регіон: ${region}.
Деталі загрози: ${threatType}.
${additionalNotes ? `Додаткові вказівки: ${additionalNotes}` : ''}

Вимоги:
1. Початок обов'язково зі слів: "${isClear ? 'Увага! Відбій повітряної тривоги' : 'Увага! Повітряна тривога'} в [регіоні]".
2. Чітка інструкція для громадян: ${
        isClear
          ? 'безпечно залишати укриття, оглянути приміщення, не торкатися підозрілих уламків, повернутися до звичних справ'
          : 'негайно пройти в найближче укриття або скористатися правилом двох стін, не ігнорувати сирену'
      }.
3. Мова: бездоганна українська, офіційно-діловий та впевнений тон диктора.
4. Довжина: від 2 до 4 лаконічних речень (ідеально для голосового оповіщення через динаміки).
5. Поверніть виключно сам текст сповіщення без лапок, приміток та форматування.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const text = response.text?.trim() || '';
      return res.json({ text });
    } catch (err: any) {
      console.warn('AI alert generation warning, using official fallback template:', err?.message);
      // Resilient fallback template so user always gets an authentic official announcement
      const isClear = alertType === 'clear';
      const fallbackText = isClear
        ? `Увага! Відбій повітряної тривоги ${region ? `в регіоні: ${region}` : 'по всій території України'}. Загроза ворожого повітряного нападу минула. Ви можете безпечно залишати укриття та повернутися до звичних справ. Слідкуйте за офіційними повідомленнями.`
        : `Увага! Повітряна тривога ${region ? `в регіоні: ${region}` : 'по всій території України'}! Зафіксовано загрозу застосування зброї. Усім терміново пройти в найближчі укриття та не ігнорувати сигнали небезпеки!`;
      return res.json({ text: fallbackText });
    }
  });

  // Serve standalone single-file HTML directly
  app.get('/standalone', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'standalone.html'));
  });
  app.get('/standalone.html', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'standalone.html'));
  });

  // Serve static files in production or Vite middleware in dev
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
