import React, { useState } from 'react';
import { RegionInfo } from '../data/ukraineRegions';
import { ShieldCheck, AlertCircle, Volume2, Info, Eye } from 'lucide-react';

interface UkraineMapProps {
  regions: RegionInfo[];
  onToggleRegionAlert: (regionId: string) => void;
  onAnnounceRegionClear: (region: RegionInfo) => void;
  onSetRegionLevel: (region: RegionInfo, level: 'green' | 'yellow' | 'red') => void;
  selectedRegionId: string | null;
  onSelectRegion: (regionId: string) => void;
}

export const UkraineMap: React.FC<UkraineMapProps> = ({
  regions,
  onToggleRegionAlert,
  onAnnounceRegionClear,
  onSetRegionLevel,
  selectedRegionId,
  onSelectRegion,
}) => {
  const [hoveredRegion, setHoveredRegion] = useState<RegionInfo | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'alerts_only'>('all');

  const activeAlerts = regions.filter((r) => r.activeAlert || r.alertLevel !== 'green');
  const yellowAlerts = regions.filter((r) => r.alertLevel === 'yellow');
  const redAlerts = regions.filter((r) => r.alertLevel === 'red' || (r.activeAlert && r.alertLevel !== 'yellow'));

  const getRegionFill = (region: RegionInfo) => {
    if (selectedRegionId === region.id) {
      if (region.alertLevel === 'yellow') return '#eab308'; // bright yellow
      if (region.alertLevel === 'red') return '#dc2626'; // bright red
      return '#059669'; // bright green
    }
    if (region.alertLevel === 'yellow') {
      return '#854d0e'; // yellow-amber for drone threat
    }
    if (region.alertLevel === 'red' || region.activeAlert) {
      return '#991b1b'; // red for missile danger
    }
    return '#1e293b'; // safe slate for green/clear
  };

  const getRegionStroke = (region: RegionInfo) => {
    if (selectedRegionId === region.id) {
      return '#38bdf8'; // bright cyan highlight
    }
    if (region.alertLevel === 'yellow') {
      return '#fde047';
    }
    if (region.alertLevel === 'red' || region.activeAlert) {
      return '#fca5a5';
    }
    return '#334155';
  };

  const getThreatLabel = (region: RegionInfo) => {
    if (region.alertLevel === 'yellow') {
      return '🟡 Жовтий рівень: загроза ударних БПЛА';
    }
    if (region.alertLevel === 'red') {
      return '🔴 Червоний рівень: Ракетна небезпека!';
    }
    switch (region.alertType) {
      case 'ballistic':
        return '🚀 Загроза балістики (Червоний)';
      case 'drone':
        return '🟡 Загроза БПЛА (Жовтий)';
      case 'artillery':
        return '💥 Артилерійський обстріл';
      case 'air':
        return '🔴 Ракетна небезпека (Червоний)';
      default:
        return '🟢 Зелений рівень: Відбій / Безпечно';
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-2xl relative overflow-hidden">
      {/* Top Bar above Map */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Карта повітряних тривог України</span>
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              25 Регіонів
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Натисніть на область для зміни статусу або вибору для озвучення відбою
          </p>
        </div>

        {/* Legend & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-emerald-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Зелений (Відбій)
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-yellow-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Жовтий (БПЛА: {yellowAlerts.length})
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/80 text-red-400 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Червоний (Ракети: {redAlerts.length})
            </span>
          </div>

          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'all' ? 'alerts_only' : 'all')}
            className={`px-2 py-0.5 text-xs rounded-lg border transition-all flex items-center gap-1 ${
              filterMode === 'alerts_only'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{filterMode === 'alerts_only' ? 'Всі' : 'Тільки тривоги'}</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Map */}
      <div className="relative my-4 aspect-[16/10] w-full max-h-[500px] flex items-center justify-center bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
        <svg
          viewBox="0 0 920 640"
          className="w-full h-full select-none"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
        >
          {/* Subtle Ukraine outline glow */}
          <g className="transition-all duration-300">
            {regions.map((region) => {
              const isSelected = selectedRegionId === region.id;
              const isHovered = hoveredRegion?.id === region.id;
              const isDimmed = filterMode === 'alerts_only' && !region.activeAlert && region.alertLevel === 'green';

              return (
                <g key={region.id} className="cursor-pointer group">
                  <path
                    d={region.svgPath}
                    fill={getRegionFill(region)}
                    stroke={getRegionStroke(region)}
                    strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.5}
                    opacity={isDimmed ? 0.35 : 1}
                    className="transition-all duration-200 hover:brightness-125"
                    onClick={() => {
                      onSelectRegion(region.id);
                    }}
                    onMouseEnter={() => setHoveredRegion(region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  />

                  {/* Region center point / pin */}
                  <circle
                    cx={region.labelPos.x}
                    cy={region.labelPos.y}
                    r={isSelected ? 5 : 3.5}
                    fill={
                      region.alertLevel === 'yellow'
                        ? '#fef08a'
                        : region.alertLevel === 'red' || region.activeAlert
                        ? '#fee2e2'
                        : '#a7f3d0'
                    }
                    stroke={
                      region.alertLevel === 'yellow'
                        ? '#ca8a04'
                        : region.alertLevel === 'red' || region.activeAlert
                        ? '#ef4444'
                        : '#10b981'
                    }
                    strokeWidth={1.5}
                    className={region.activeAlert || region.alertLevel !== 'green' ? 'animate-ping' : ''}
                    opacity={isDimmed ? 0.2 : 0.9}
                    pointerEvents="none"
                  />

                  {/* Region text label on SVG */}
                  <text
                    x={region.labelPos.x}
                    y={region.labelPos.y + 13}
                    textAnchor="middle"
                    fill={
                      region.alertLevel === 'yellow'
                        ? '#fef08a'
                        : region.alertLevel === 'red' || region.activeAlert
                        ? '#fecaca'
                        : '#94a3b8'
                    }
                    fontSize="9.5"
                    fontWeight={region.activeAlert || region.alertLevel !== 'green' ? '700' : '500'}
                    className="pointer-events-none select-none tracking-tight font-sans drop-shadow-sm"
                    opacity={isDimmed ? 0.2 : 1}
                  >
                    {region.shortName}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover / Selection Floating Card */}
        {hoveredRegion && (
          <div
            className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-88 bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md z-20 pointer-events-auto transition-all"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    hoveredRegion.alertLevel === 'yellow'
                      ? 'bg-yellow-400 animate-pulse'
                      : hoveredRegion.alertLevel === 'red' || hoveredRegion.activeAlert
                      ? 'bg-red-500 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
                {hoveredRegion.name}
              </h4>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  hoveredRegion.alertLevel === 'yellow'
                    ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                    : hoveredRegion.alertLevel === 'red' || hoveredRegion.activeAlert
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {hoveredRegion.alertLevel === 'yellow'
                  ? 'Жовтий рівень'
                  : hoveredRegion.alertLevel === 'red' || hoveredRegion.activeAlert
                  ? 'Червоний рівень'
                  : 'Зелений рівень'}
              </span>
            </div>

            <div className="mt-2 text-xs space-y-1 text-slate-300">
              <div className="flex items-center justify-between text-slate-400">
                <span>Адмінцентр:</span>
                <span className="text-white font-medium">{hoveredRegion.center}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Статус небезпеки:</span>
                <span
                  className={`font-semibold ${
                    hoveredRegion.alertLevel === 'yellow'
                      ? 'text-yellow-400'
                      : hoveredRegion.alertLevel === 'red' || hoveredRegion.activeAlert
                      ? 'text-red-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {getThreatLabel(hoveredRegion)}
                </span>
              </div>
              {hoveredRegion.affectedAreas && hoveredRegion.affectedAreas.length > 0 && (
                <div className="pt-1 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">Зони небезпеки: </span>
                  <span className="text-amber-300 font-medium">
                    {hoveredRegion.affectedAreas.slice(0, 4).join(', ')}
                    {hoveredRegion.affectedAreas.length > 4 ? ` (+${hoveredRegion.affectedAreas.length - 4})` : ''}
                  </span>
                </div>
              )}
              {hoveredRegion.messages && hoveredRegion.messages.length > 0 && (
                <div className="text-[10px] text-red-300/90 italic">
                  ℹ️ {hoveredRegion.messages[0]}
                </div>
              )}
            </div>

            {/* Quick 3-Level Voice Trigger Buttons for this Oblast */}
            <div className="mt-3 pt-2 border-t border-slate-800 flex flex-col gap-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Оголосити для цієї області:
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetRegionLevel(hoveredRegion, 'green')}
                  className="py-1 px-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                  title="Озвучити Відбій"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>🟢 Відбій</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetRegionLevel(hoveredRegion, 'yellow')}
                  className="py-1 px-1.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                  title="Озвучити Жовтий: загроза БПЛА"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>🟡 БПЛА</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSetRegionLevel(hoveredRegion, 'red')}
                  className="py-1 px-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                  title="Озвучити Червоний: Ракетна небезпека"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>🔴 Ракети</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Region Selector Pills */}
      <div className="mt-3">
        <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Швидкий вибір області:</span>
          <span className="text-slate-500 font-normal">
            Активні: <span className="text-red-400 font-bold">{activeAlerts.length}</span> / {regions.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-thin">
          {regions.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => {
                onSelectRegion(reg.id);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-md border font-medium transition-all flex items-center gap-1.5 ${
                reg.alertLevel === 'yellow'
                  ? 'bg-yellow-950/80 border-yellow-700/80 text-yellow-200 hover:bg-yellow-900'
                  : reg.alertLevel === 'red' || reg.activeAlert
                  ? 'bg-red-950/80 border-red-700/80 text-red-200 hover:bg-red-900'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              } ${selectedRegionId === reg.id ? 'ring-2 ring-blue-500' : ''}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  reg.alertLevel === 'yellow'
                    ? 'bg-yellow-400 animate-pulse'
                    : reg.alertLevel === 'red' || reg.activeAlert
                    ? 'bg-red-400 animate-pulse'
                    : 'bg-emerald-400'
                }`}
              />
              {reg.shortName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
