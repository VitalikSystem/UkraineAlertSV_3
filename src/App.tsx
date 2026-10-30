/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { UkraineMap } from './components/UkraineMap';
import { TtsBroadcaster } from './components/TtsBroadcaster';
import { SafetyGuide } from './components/SafetyGuide';
import { AlertHistory, HistoryEvent } from './components/AlertHistory';
import { INITIAL_REGIONS, RegionInfo } from './data/ukraineRegions';
import { audioEngine } from './utils/audioEngine';
import { ShieldCheck, Radio, MapPin, Sparkles, BookOpen, Clock, Activity, RefreshCw } from 'lucide-react';

export default function App() {
  const [regions, setRegions] = useState<RegionInfo[]>(INITIAL_REGIONS);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>('poltava');
  const [isLiveSyncEnabled, setIsLiveSyncEnabled] = useState<boolean>(true);
  const [isRefreshingLive, setIsRefreshingLive] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);

  const prevActiveRef = useRef<Record<string, boolean>>({});

  const [history, setHistory] = useState<HistoryEvent[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: 'clear',
      regionName: 'Система alerts.in.ua',
      text: 'Підключено офіційний токен доступу до API карти повітряних тривог України alerts.in.ua.',
      voice: 'Kore',
    },
  ]);

  const [externalTrigger, setExternalTrigger] = useState<{
    text: string;
    regionName: string;
  } | null>(null);

  // Live alerts fetching function
  const fetchLiveAlerts = useCallback(async (force = false) => {
    try {
      setIsRefreshingLive(true);
      setLiveError(null);
      const res = await fetch(`/api/alerts/live${force ? '?refresh=true' : ''}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.regionsStatus) {
        const timeStr = new Date().toLocaleTimeString('uk-UA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSyncTime(timeStr);

        setRegions((prev) =>
          prev.map((r) => {
            const live = data.regionsStatus[r.id];
            if (!live) return r;

            // Detect state transition from active to cleared
            const wasActive = prevActiveRef.current[r.id];
            if (wasActive === true && !live.active) {
              // Log all-clear event in history
              const clearEntry: HistoryEvent = {
                id: `clear-${r.id}-${Date.now()}`,
                timestamp: timeStr,
                type: 'clear',
                regionName: r.name,
                text: `Відбій тривоги: ${r.name}. Загроза минула за даними alerts.in.ua.`,
                voice: 'Kore',
              };
              setHistory((h) => [clearEntry, ...h.slice(0, 25)]);
            }

            return {
              ...r,
              activeAlert: live.active,
              alertLevel: live.level,
              alertType: live.alertType,
              alertStartedAt: live.startedAt || r.alertStartedAt,
              affectedAreas: live.affectedAreas || [],
              messages: live.messages || [],
            };
          })
        );

        // Update previous active snapshot
        const newSnapshot: Record<string, boolean> = {};
        for (const [id, st] of Object.entries(data.regionsStatus as Record<string, any>)) {
          newSnapshot[id] = st.active;
        }
        prevActiveRef.current = newSnapshot;
      }
    } catch (err: any) {
      console.warn('Live alerts sync failed:', err);
      setLiveError('Не вдалося оновити дані alerts.in.ua');
    } finally {
      setIsRefreshingLive(false);
    }
  }, []);

  // Fetch immediately on mount and set up 20s interval if live sync enabled
  useEffect(() => {
    fetchLiveAlerts(true);
  }, [fetchLiveAlerts]);

  useEffect(() => {
    if (!isLiveSyncEnabled) return;
    const interval = setInterval(() => {
      fetchLiveAlerts(false);
    }, 20000); // 20 seconds polling (safely within 8-10 req/min with caching)
    return () => clearInterval(interval);
  }, [isLiveSyncEnabled, fetchLiveAlerts]);

  const activeAlertCount = regions.filter((r) => r.activeAlert).length;
  const isAllClear = activeAlertCount === 0;

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) || null;

  // Toggle alert for single region
  const handleToggleRegionAlert = (regionId: string) => {
    setRegions((prev) =>
      prev.map((r) => {
        if (r.id === regionId) {
          const willBeActive = !r.activeAlert;
          return {
            ...r,
            activeAlert: willBeActive,
            alertType: willBeActive ? 'air' : 'none',
            alertStartedAt: willBeActive ? new Date().toISOString() : undefined,
            allClearAt: !willBeActive ? new Date().toISOString() : undefined,
          };
        }
        return r;
      })
    );
  };

  // Announce all-clear for specific region
  const handleAnnounceRegionClear = (region: RegionInfo) => {
    // If it has active alert, set it to clear
    if (region.activeAlert) {
      setRegions((prev) =>
        prev.map((r) =>
          r.id === region.id
            ? { ...r, activeAlert: false, alertType: 'none', allClearAt: new Date().toISOString() }
            : r
        )
      );
    }
    const announcementText = `Увага! Відбій повітряної тривоги ${region.nameGenitive}! Загроза ворожого удару минула. Ви можете безпечно залишати укриття. Слідкуйте за офіційними повідомленнями.`;
    setExternalTrigger({
      text: announcementText,
      regionName: region.name,
    });
  };

  // Set specific color level for a region (Green, Yellow, Red)
  const handleSetRegionLevel = (region: RegionInfo, level: 'green' | 'yellow' | 'red') => {
    setSelectedRegionId(region.id);
    setRegions((prev) =>
      prev.map((r) => {
        if (r.id === region.id) {
          const isActive = level !== 'green';
          return {
            ...r,
            activeAlert: isActive,
            alertLevel: level,
            alertType: level === 'yellow' ? 'drone' : level === 'red' ? 'air' : 'none',
            alertStartedAt: isActive ? new Date().toISOString() : undefined,
            allClearAt: !isActive ? new Date().toISOString() : undefined,
          };
        }
        return r;
      })
    );

    let levelText = '';
    if (level === 'yellow') {
      levelText = `Увага! ${region.name}. Жовтий рівень: загроза ударних БПЛА.`;
    } else if (level === 'red') {
      levelText = `Увага! ${region.name}. Червоний рівень: Ракетна небезпека!`;
    } else {
      levelText = `Увага! ${region.name}. Відбій повітряної тривоги! Загроза минула.`;
    }

    setExternalTrigger({
      text: levelText,
      regionName: region.name,
    });
  };

  // Full national all-clear (Скасувати всі тривоги)
  const handleClearAllAlerts = () => {
    setRegions((prev) =>
      prev.map((r) => ({
        ...r,
        activeAlert: false,
        alertLevel: 'green',
        alertType: 'none',
        allClearAt: new Date().toISOString(),
      }))
    );

    const nationalClearText =
      'Увага! Відбій повітряної тривоги по всій території України! Загроза повітряного нападу минула. Усім залишати укриття та повернутися до звичних справ. Зберігайте пильність та вірте в Збройні Сили України!';

    setExternalTrigger({
      text: nationalClearText,
      regionName: 'Вся Україна',
    });
  };

  // Simulate threat scenario (alert in East and Capital)
  const handleSimulateThreat = () => {
    setRegions((prev) =>
      prev.map((r) => {
        const isEastOrCenter = [
          'kyiv_city',
          'kyiv_obl',
          'kharkiv',
          'sumy',
          'dnipro',
          'zaporizhzhia',
          'donetsk',
          'luhansk',
          'crimea',
        ].includes(r.id);
        return {
          ...r,
          activeAlert: isEastOrCenter,
          alertType: isEastOrCenter ? (r.id === 'kharkiv' ? 'ballistic' : 'air') : 'none',
          alertStartedAt: isEastOrCenter ? new Date().toISOString() : undefined,
        };
      })
    );
    audioEngine.playAlertChime();
  };

  const handleAnnounceLogged = (event: {
    type: 'clear' | 'alert';
    regionName: string;
    text: string;
    voice: string;
    audioBase64?: string;
  }) => {
    const newEntry: HistoryEvent = {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
      ...event,
    };
    setHistory((prev) => [newEntry, ...prev.slice(0, 20)]);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation & Status Bar */}
      <Header
        activeAlertCount={activeAlertCount}
        totalRegions={regions.length}
        onClearAllAlerts={handleClearAllAlerts}
        onSimulateThreat={handleSimulateThreat}
        isAllClear={isAllClear}
        isLiveSync={isLiveSyncEnabled}
        onToggleLiveSync={() => setIsLiveSyncEnabled(!isLiveSyncEnabled)}
        onRefreshLive={() => fetchLiveAlerts(true)}
        isRefreshingLive={isRefreshingLive}
        lastSyncTime={lastSyncTime}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Banner Alert Indicator with alerts.in.ua Live Indicator */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${
            isAllClear
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isAllClear ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'
              }`}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {isAllClear ? 'Офіційне сповіщення' : 'Поточна загроза в Україні'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  API: alerts.in.ua
                  {lastSyncTime && <span className="opacity-70">({lastSyncTime})</span>}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                {isAllClear
                  ? 'ВІДБІЙ ПОВІТРЯНОЇ ТРИВОГИ: Усі області у безпеці'
                  : `УВАГА! В ${activeAlertCount} областях України триває тривога (alerts.in.ua)`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLiveAlerts(true)}
              disabled={isRefreshingLive}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Оновити зараз з офіційного API alerts.in.ua"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLive ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Оновити API</span>
            </button>
            {!isAllClear && (
              <button
                type="button"
                onClick={handleClearAllAlerts}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/40 flex items-center gap-1.5 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Оголосити повний відбій</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Row: TTS Broadcaster (Voice Synthesis) + Interactive Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* TTS Broadcaster (7 cols on desktop) */}
          <div className="lg:col-span-7">
            <TtsBroadcaster
              selectedRegion={selectedRegion}
              onAnnounceLogged={handleAnnounceLogged}
              externalTrigger={externalTrigger}
            />
          </div>

          {/* Interactive Map of Ukraine (5 cols on desktop) */}
          <div className="lg:col-span-5">
            <UkraineMap
              regions={regions}
              onToggleRegionAlert={handleToggleRegionAlert}
              onAnnounceRegionClear={handleAnnounceRegionClear}
              onSetRegionLevel={handleSetRegionLevel}
              selectedRegionId={selectedRegionId}
              onSelectRegion={setSelectedRegionId}
            />
          </div>
        </div>

        {/* Secondary Row: Civil Protection Safety Protocol & Broadcast History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <SafetyGuide />
          </div>
          <div className="lg:col-span-4">
            <AlertHistory history={history} onClearHistory={handleClearHistory} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Система сповіщення про відбій повітряної тривоги в Україні</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Модель TTS: <strong className="text-slate-400">gemini-3.8-flash-tts</strong></span>
            <span>ДСНС України 101</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
