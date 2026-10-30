import React from 'react';
import { History, Play, Trash2, Clock, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { audioEngine } from '../utils/audioEngine';

export interface HistoryEvent {
  id: string;
  timestamp: string;
  type: 'clear' | 'alert';
  regionName: string;
  text: string;
  voice: string;
  audioBase64?: string;
}

interface AlertHistoryProps {
  history: HistoryEvent[];
  onClearHistory: () => void;
}

export const AlertHistory: React.FC<AlertHistoryProps> = ({ history, onClearHistory }) => {
  const handleReplay = (item: HistoryEvent) => {
    if (item.audioBase64) {
      audioEngine.playGeminiWav(item.audioBase64, item.type === 'clear');
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-base font-bold text-white">Журнал оголошених сповіщень</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {history.length}
          </span>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистити</span>
          </button>
        )}
      </div>

      <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Ще немає записів у журналі. Озвучте відбій тривоги або виберіть область на мапі.
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`p-1.5 rounded-lg mt-0.5 ${
                    item.type === 'clear'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                      : 'bg-red-950 text-red-400 border border-red-800/80'
                  }`}
                >
                  {item.type === 'clear' ? (
                    <ShieldCheck className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{item.regionName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                        item.type === 'clear'
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-red-900/60 text-red-300'
                      }`}
                    >
                      {item.type === 'clear' ? 'ВІДБІЙ' : 'ТРИВОГА'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Голос: {item.voice}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{item.text}</p>

                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              </div>

              {item.audioBase64 && (
                <button
                  type="button"
                  onClick={() => handleReplay(item)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all shrink-0 hover:text-emerald-400"
                  title="Повторити озвучення"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
