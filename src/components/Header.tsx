import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Volume2,
  VolumeX,
  BellRing,
  Radio,
  Sparkles,
  Download,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

interface HeaderProps {
  activeAlertCount: number;
  totalRegions: number;
  onClearAllAlerts: () => void;
  onSimulateThreat: () => void;
  isAllClear: boolean;
  isLiveSync: boolean;
  onToggleLiveSync: () => void;
  onRefreshLive: () => void;
  isRefreshingLive: boolean;
  lastSyncTime: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeAlertCount,
  totalRegions,
  onClearAllAlerts,
  onSimulateThreat,
  isAllClear,
  isLiveSync,
  onToggleLiveSync,
  onRefreshLive,
  isRefreshingLive,
  lastSyncTime,
}) => {
  const [kyivTime, setKyivTime] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [isPlayingTestChime, setIsPlayingTestChime] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setKyivTime(
        now.toLocaleTimeString('uk-UA', {
          timeZone: 'Europe/Kyiv',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioEngine.setVolume(val);
    if (isMuted && val > 0) {
      setIsMuted(false);
      audioEngine.setMuted(false);
    }
  };

  const handleTestChime = async () => {
    setIsPlayingTestChime(true);
    await audioEngine.playAllClearChime();
    setIsPlayingTestChime(false);
  };

  const safePercentage = Math.round(((totalRegions - activeAlertCount) / totalRegions) * 100);

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & National System Identity */}
          <div className="flex items-center space-x-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-blue-600 to-blue-800 text-white shadow-lg shadow-blue-900/30 ring-2 ring-blue-500/30">
              <ShieldCheck className="w-7 h-7 text-white" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                  Система Цивільного Захисту
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Gemini 3.8 Flash TTS
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Онлайн
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Скасування повітряної тривоги
                <span className="text-xs font-normal text-slate-400 hidden sm:inline">
                  (Відбій тривог в Україні)
                </span>
              </h1>
            </div>
          </div>

          {/* Kyiv Time & Alert Status Banner */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Real-time Clock */}
            <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-lg border border-slate-800 text-right">
              <div className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                Київський час (EEST)
              </div>
              <div className="text-lg font-mono font-bold text-amber-400 tracking-wider">
                {kyivTime || '--:--:--'}
              </div>
            </div>

            {/* Status Pill */}
            <div
              className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 transition-all duration-300 ${
                isAllClear
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/60 border-red-500/50 text-red-200'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full animate-ping ${
                  isAllClear ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <div>
                <div className="text-xs font-medium uppercase tracking-wide">
                  {isAllClear ? 'ВІДБІЙ ПО ВСІЙ КРАЇНІ' : `ТРИВОГА: ${activeAlertCount} ОБЛ.`}
                </div>
                <div className="text-[11px] opacity-80 font-mono">
                  {safePercentage}% території в безпеці
                </div>
              </div>
            </div>

            {/* Live alerts.in.ua API Sync Control */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={onToggleLiveSync}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg border transition-all ${
                  isLiveSync
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Автоматичне оновлення даних кожні 20 секунд з офіційного API alerts.in.ua"
              >
                <Activity className={`w-3.5 h-3.5 ${isLiveSync ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">alerts.in.ua</span>
                <span className="text-[10px] opacity-80 font-mono">
                  {isLiveSync ? 'LIVE' : 'ПАУЗА'}
                </span>
              </button>

              <button
                type="button"
                onClick={onRefreshLive}
                disabled={isRefreshingLive}
                className="p-1.5 hover:text-white text-slate-400 rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                title={`Оновити зараз з alerts.in.ua ${lastSyncTime ? `(Оновлено: ${lastSyncTime})` : ''}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-2 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={handleToggleMute}
                title={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
                className={`p-2 rounded-lg transition-colors ${
                  isMuted
                    ? 'text-red-400 hover:bg-red-950/50'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                title={`Гучність: ${Math.round(volume * 100)}%`}
              />

              <button
                type="button"
                onClick={handleTestChime}
                disabled={isPlayingTestChime}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
                title="Тестовий сигнал відбою (дзвіночок)"
              >
                <BellRing className={`w-3.5 h-3.5 text-amber-400 ${isPlayingTestChime ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">Дзвіночок</span>
              </button>
            </div>

            {/* Global Emergency Fast-Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClearAllAlerts}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/40 flex items-center gap-1.5 transition-all transform active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Повний відбій</span>
              </button>
              <button
                type="button"
                onClick={onSimulateThreat}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Тест загроз</span>
              </button>

              <a
                href="/standalone.html"
                download="povitryana_tryvoga_standalone.html"
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400 flex items-center gap-1.5 transition-all shadow-sm"
                title="Завантажити у вигляді одного автономного HTML-файлу без збірки та без Node.js"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Один HTML-файл</span>
              </a>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
