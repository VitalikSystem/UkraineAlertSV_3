import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Download,
  Sparkles,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  FileText,
  Volume1,
  Mic,
  ShieldCheck,
} from 'lucide-react';
import { PRESET_ANNOUNCEMENTS, PresetAnnouncement, RegionInfo } from '../data/ukraineRegions';
import { audioEngine } from '../utils/audioEngine';

interface TtsBroadcasterProps {
  selectedRegion: RegionInfo | null;
  onAnnounceLogged: (event: {
    type: 'clear' | 'alert';
    regionName: string;
    text: string;
    voice: string;
    audioBase64?: string;
  }) => void;
  externalTrigger?: { text: string; regionName: string } | null;
}

export const TtsBroadcaster: React.FC<TtsBroadcasterProps> = ({
  selectedRegion,
  onAnnounceLogged,
  externalTrigger,
}) => {
  const [text, setText] = useState<string>(
    'Увага! Відбій повітряної тривоги! Загроза минула. Усім залишати укриття та повернутися до звичних справ. Зберігайте спокій та вірте в Збройні Сили України!'
  );
  const [selectedVoice, setSelectedVoice] = useState<'Kore' | 'Fenrir' | 'Puck' | 'Zephyr' | 'Charon'>('Kore');
  const [selectedStyle, setSelectedStyle] = useState<string>('Clear, authoritative civil defense emergency announcer');
  const [withChime, setWithChime] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState<{ current: number; duration: number }>({
    current: 0,
    duration: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When external trigger changes (e.g. user clicked "Озвучити відбій" for an oblast on the map)
  useEffect(() => {
    if (externalTrigger) {
      setText(externalTrigger.text);
      handleSynthesizeAndPlay(externalTrigger.text, externalTrigger.regionName);
    }
  }, [externalTrigger]);

  // Voice descriptions
  const voiceProfiles = [
    {
      id: 'Kore',
      name: 'Kore (Офіційний ДСНС)',
      gender: 'Жіночий',
      desc: 'Зважений, чіткий, офіційний рятувальний голос',
    },
    {
      id: 'Fenrir',
      name: 'Fenrir (Командир цивільного захисту)',
      gender: 'Чоловічий',
      desc: 'Впевнений, глибокий, спокійний бас',
    },
    {
      id: 'Puck',
      name: 'Puck (Радіо-диктор)',
      gender: 'Чоловічий',
      desc: 'Динамічний, чітка дикція, радіомовлення',
    },
    {
      id: 'Zephyr',
      name: 'Zephyr (Оперативний черговий)',
      gender: 'Жіночий',
      desc: 'Спокійний, лаконічний, інформуючий тон',
    },
    {
      id: 'Charon',
      name: 'Charon (Ситуаційний центр)',
      gender: 'Чоловічий',
      desc: 'Строгий, офіційний, безпристрасний',
    },
  ];

  // Quick preset selection
  const handleSelectPreset = (preset: PresetAnnouncement) => {
    setText(preset.text);
    setSelectedVoice(preset.recommendedVoice);
    setSelectedStyle(preset.voiceStyle);
  };

  // Main synthesis via Gemini 3.8 Flash TTS
  const handleSynthesizeAndPlay = async (
    customText?: string,
    regionLabel?: string,
    toneType?: 'clear' | 'yellow' | 'red' | boolean
  ) => {
    const textToSpeak = customText || text;
    if (!textToSpeak.trim()) {
      setErrorMessage('Будь ласка, введіть текст для озвучення.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setIsPlaying(false);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voice: selectedVoice,
          style: selectedStyle,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Помилка сервера: ${response.status}`);
      }

      const data = await response.json();
      if (!data.audioBase64) {
        throw new Error('Отримано порожні аудіодані від моделі.');
      }

      setAudioBase64(data.audioBase64);
      setIsLoading(false);
      setIsPlaying(true);

      // Determine intro sound
      let resolvedTone: 'clear' | 'yellow' | 'red' | boolean = withChime;
      if (toneType !== undefined) {
        resolvedTone = toneType;
      } else if (textToSpeak.includes('Жовтий рівень') || textToSpeak.includes('БПЛА')) {
        resolvedTone = 'yellow';
      } else if (textToSpeak.includes('Червоний рівень') || textToSpeak.includes('Ракетна')) {
        resolvedTone = 'red';
      } else if (textToSpeak.includes('Відбій') || textToSpeak.includes('минула')) {
        resolvedTone = 'clear';
      }

      // Log announcement in history
      const isClearAnnouncement =
        textToSpeak.toLowerCase().includes('відбій') || textToSpeak.toLowerCase().includes('минула');
      onAnnounceLogged({
        type: isClearAnnouncement ? 'clear' : 'alert',
        regionName: regionLabel || selectedRegion?.name || 'Україна',
        text: textToSpeak,
        voice: selectedVoice,
        audioBase64: data.audioBase64,
      });

      // Play audio using audioEngine
      await audioEngine.playGeminiWav(
        data.audioBase64,
        withChime ? resolvedTone : false,
        (current, duration) => {
          setPlaybackProgress({ current, duration });
        },
        () => {
          setIsPlaying(false);
          setPlaybackProgress({ current: 0, duration: 0 });
        }
      );
    } catch (err: any) {
      console.error('TTS error:', err);
      setIsLoading(false);
      setIsPlaying(false);
      setErrorMessage(err.message || 'Не вдалося озвучити текст. Перевірте з’єднання.');
    }
  };

  // Stop currently playing audio
  const handleStopAudio = () => {
    audioEngine.stopAll();
    setIsPlaying(false);
  };

  // AI Assistant text generator with gemini-3.8-flash
  const handleGenerateAiText = async (alertType: 'clear' | 'alert') => {
    setIsAiGenerating(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/generate-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType,
          region: selectedRegion ? selectedRegion.name : 'по всій території України',
          threatType: alertType === 'clear' ? 'загрози ракетних ударів та дронів-камікадзе' : 'ракетної небезпеки',
        }),
      });

      if (!res.ok) {
        throw new Error('Не вдалося згенерувати текст');
      }

      const data = await res.json();
      if (data.text) {
        setText(data.text);
      }
    } catch (err: any) {
      console.error('AI Generator error:', err);
      setErrorMessage(err.message || 'Помилка генерації тексту AI');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleDownload = () => {
    if (audioBase64) {
      const filename = `Vidbiy_Tryvogy_${selectedVoice}_${Date.now()}.wav`;
      audioEngine.downloadAudio(audioBase64, filename);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="text-lg font-bold text-white">
              Голосове сповіщення цивільного захисту
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              gemini-3.8-flash-tts
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Онлайн (Cloud Run)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Синтез офіційних сигналів тривог та відбою українською мовою в режимі онлайн
          </p>
        </div>

        {/* Big Emergency Trigger Button */}
        <button
          type="button"
          onClick={() => handleSynthesizeAndPlay()}
          disabled={isLoading || isAiGenerating}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Генерація голосу...</span>
            </>
          ) : isPlaying ? (
            <>
              <Volume2 className="w-4 h-4 animate-bounce text-white" />
              <span>В ефірі (Озвучується)</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5 text-white" />
              <span>ОГОЛОСИТИ ВІДБІЙ</span>
            </>
          )}
        </button>
      </div>

      {/* SPECIAL COLOR-CODED LEVELS BAR (POLTAVA & CURRENT REGION) */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-700/80 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Швидке сповіщення за рівнями небезпеки:
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400">
              Регіон: <strong className="text-white">{selectedRegion?.name || 'Полтавська область'}</strong>
            </span>
            {selectedRegion?.activeAlert ? (
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 ${
                selectedRegion.alertLevel === 'yellow'
                  ? 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                  : 'bg-red-950 text-red-300 border border-red-700'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                Live: {selectedRegion.alertLevel === 'yellow' ? 'Жовтий рівень (БПЛА)' : 'Червоний рівень (Загроза)'}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live: Відбій
              </span>
            )}
          </div>
        </div>
        {selectedRegion?.affectedAreas && selectedRegion.affectedAreas.length > 0 && (
          <div className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 flex items-center gap-2">
            <span className="text-amber-400 font-semibold">📍 Зони небезпеки в регіоні:</span>
            <span className="text-slate-300 line-clamp-1">
              {selectedRegion.affectedAreas.join(', ')}
            </span>
          </div>
        )}

        {/* Dedicated 3 Level Voice Buttons for Current / Poltava Oblast */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Yellow Level */}
          <button
            type="button"
            onClick={() => {
              const regName = selectedRegion?.name || 'Полтавська область';
              const voiceText = `Увага! ${regName}. Жовтий рівень: загроза ударних БПЛА.`;
              setText(voiceText);
              handleSynthesizeAndPlay(voiceText, regName, 'yellow');
            }}
            disabled={isLoading}
            className="p-3 rounded-xl bg-gradient-to-br from-yellow-950/90 to-yellow-900/60 hover:from-yellow-900 hover:to-yellow-850 border border-yellow-600/80 text-yellow-100 shadow-md transition-all text-left group active:scale-98"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                Жовтий рівень (БПЛА)
              </span>
              <Volume2 className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-yellow-200/90 font-medium mt-1.5 font-sans leading-snug">
              «Увага! {selectedRegion?.shortName || 'Полтавська область'}. Жовтий рівень: загроза ударних БПЛА.»
            </div>
            <div className="mt-2 text-[10px] text-yellow-400/80 font-mono flex items-center gap-1">
              <span>▶ Натисніть для миттєвого озвучення</span>
            </div>
          </button>

          {/* Red Level */}
          <button
            type="button"
            onClick={() => {
              const regName = selectedRegion?.name || 'Полтавська область';
              const voiceText = `Увага! ${regName}. Червоний рівень: Ракетна небезпека!`;
              setText(voiceText);
              handleSynthesizeAndPlay(voiceText, regName, 'red');
            }}
            disabled={isLoading}
            className="p-3 rounded-xl bg-gradient-to-br from-red-950/90 to-red-900/60 hover:from-red-900 hover:to-red-850 border border-red-600/80 text-red-100 shadow-md transition-all text-left group active:scale-98"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
                Червоний рівень (Ракети)
              </span>
              <Volume2 className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-red-200/90 font-medium mt-1.5 font-sans leading-snug">
              «Увага! {selectedRegion?.shortName || 'Полтавська область'}. Червоний рівень: Ракетна небезпека!»
            </div>
            <div className="mt-2 text-[10px] text-red-400/80 font-mono flex items-center gap-1">
              <span>▶ Натисніть для миттєвого озвучення</span>
            </div>
          </button>

          {/* Green Level */}
          <button
            type="button"
            onClick={() => {
              const regName = selectedRegion?.name || 'Полтавська область';
              const voiceText = `Увага! ${regName}. Відбій повітряної тривоги! Загроза минула.`;
              setText(voiceText);
              handleSynthesizeAndPlay(voiceText, regName, 'clear');
            }}
            disabled={isLoading}
            className="p-3 rounded-xl bg-gradient-to-br from-emerald-950/90 to-emerald-900/60 hover:from-emerald-900 hover:to-emerald-850 border border-emerald-600/80 text-emerald-100 shadow-md transition-all text-left group active:scale-98"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Зелений рівень (Відбій)
              </span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-[11px] text-emerald-200/90 font-medium mt-1.5 font-sans leading-snug">
              «Увага! {selectedRegion?.shortName || 'Полтавська область'}. Відбій повітряної тривоги! Загроза минула.»
            </div>
            <div className="mt-2 text-[10px] text-emerald-400/80 font-mono flex items-center gap-1">
              <span>▶ Натисніть для миттєвого озвучення</span>
            </div>
          </button>
        </div>

        {/* Poltava dedicated quick-fire button if another region is selected */}
        {selectedRegion?.id !== 'poltava' && (
          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>Швидкий виклик для <strong>Полтавської області</strong>:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const t = 'Увага! Полтавська область. Жовтий рівень: загроза ударних БПЛА.';
                  setText(t);
                  handleSynthesizeAndPlay(t, 'Полтавська область', 'yellow');
                }}
                className="px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-800 hover:bg-yellow-900 font-medium"
              >
                🟡 Полтава: Жовтий
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = 'Увага! Полтавська область. Червоний рівень: Ракетна небезпека!';
                  setText(t);
                  handleSynthesizeAndPlay(t, 'Полтавська область', 'red');
                }}
                className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 hover:bg-red-900 font-medium"
              >
                🔴 Полтава: Червоний
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = 'Увага! Полтавська область. Відбій повітряної тривоги! Загроза минула.';
                  setText(t);
                  handleSynthesizeAndPlay(t, 'Полтавська область', 'clear');
                }}
                className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 font-medium"
              >
                🟢 Полтава: Відбій
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preset Announcements Grid */}
      <div>
        <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Шаблони офіційних повідомлень:</span>
          <span className="text-slate-500 text-[11px]">Швидкий вибір тексту</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESET_ANNOUNCEMENTS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition-all group"
            >
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                {preset.title}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                {preset.text}
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                <span>Голос: {preset.recommendedVoice}</span>
                <span className="text-emerald-400 group-hover:underline">Вибрати →</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Selection & Settings Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
        {/* Voice Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-blue-400" />
            <span>Диктор (Модель TTS):</span>
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {voiceProfiles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.gender})
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            {voiceProfiles.find((v) => v.id === selectedVoice)?.desc}
          </p>
        </div>

        {/* Announcer Style Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Стиль подачі:</span>
          </label>
          <select
            value={selectedStyle}
            onChange={(e) => setSelectedStyle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="Clear, authoritative civil defense emergency announcer">
              Офіційний диктор ДСНС (Впевнений та чіткий)
            </option>
            <option value="Calm, reassuring emergency dispatcher announcement">
              Заспокійливий тон (Зняття напруги)
            </option>
            <option value="Concise, rapid emergency broadcast radio dispatcher">
              Лаконічний радіодиспетчер (Швидкий)
            </option>
            <option value="Uplifting, patriotic civil protection broadcast">
              Урочистий та підбадьорливий
            </option>
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            Передає інструкцію інтонації в Gemini 3.8 TTS
          </p>
        </div>

        {/* Chime toggle & AI Draft Helper */}
        <div className="flex flex-col justify-between">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Звукові ефекти:
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={withChime}
                onChange={(e) => setWithChime(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-800 border-slate-700"
              />
              <span>Включати фірмовий дзвіночок відбою перед голосом</span>
            </label>
          </div>

          {/* AI Draft buttons */}
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleGenerateAiText('clear')}
              disabled={isAiGenerating}
              className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium border border-slate-700 flex items-center justify-center gap-1 transition-all"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>AI Текст відбою</span>
            </button>
            <button
              type="button"
              onClick={() => handleGenerateAiText('alert')}
              disabled={isAiGenerating}
              className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium border border-slate-700 flex items-center justify-center gap-1 transition-all"
            >
              <span>AI Текст тривоги</span>
            </button>
          </div>
        </div>
      </div>

      {/* Textarea Editor with quick variable inject */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Текст сповіщення для озвучення:</span>
          </label>

          {/* Quick tags */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500">Вставити:</span>
            <button
              type="button"
              onClick={() => setText((prev) => `${prev} У місті Київ та області.`)}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px]"
            >
              +Київ
            </button>
            <button
              type="button"
              onClick={() => setText((prev) => `${prev} Загроза минула, можна залишати укриття.`)}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px]"
            >
              +Загроза минула
            </button>
            <button
              type="button"
              onClick={() => setText((prev) => `${prev} Дякуємо силам ППО за захист! Слава Україні!`)}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-[10px]"
            >
              +Дякуємо ППО
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введіть текст офіційного сповіщення для громадян..."
          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all font-sans leading-relaxed"
        />

        {/* Error notification if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Playback Controls & Waveform Display */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Playback Button Group */}
        <div className="flex items-center gap-3">
          {isPlaying ? (
            <button
              type="button"
              onClick={handleStopAudio}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/50 transition-all"
              title="Зупинити відтворення"
            >
              <Pause className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSynthesizeAndPlay()}
              disabled={isLoading}
              className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/50 transition-all disabled:opacity-50"
              title="Озвучити текст"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          )}

          <div>
            <div className="text-xs font-semibold text-white flex items-center gap-1.5">
              <span>{isPlaying ? 'Відтворюється сповіщення' : 'Готово до трансляції'}</span>
              {audioBase64 && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                  WAV 24kHz
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {playbackProgress.duration > 0
                ? `${playbackProgress.current.toFixed(1)}с / ${playbackProgress.duration.toFixed(1)}с`
                : 'Готово'}
            </div>
          </div>
        </div>

        {/* Animated Waveform Visualizer */}
        <div className="flex items-center gap-1 h-8 px-4 py-1 bg-slate-900/80 rounded-lg border border-slate-800">
          {[40, 75, 25, 90, 60, 30, 85, 45, 95, 70, 35, 60, 80, 50, 90, 30].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isPlaying
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-700'
              }`}
              style={{
                height: isPlaying ? `${Math.max(15, (h * Math.sin((i + Date.now() / 150) * 0.8) + 100) / 2)}%` : '20%',
              }}
            />
          ))}
        </div>

        {/* Download WAV File */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!audioBase64}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
            title="Завантажити згенероване аудіо WAV для трансляції через гучномовці"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Завантажити WAV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
