import { useState } from 'react';
import { Crosshair, Play, Shield, Zap } from 'lucide-react';
import {
  AIRCRAFT_CONFIGS,
  AircraftId,
  DIFFICULTY_CONFIGS,
  DifficultyId,
  HERO_BACKDROP_PATH,
  SavedRecord,
} from '../game/types';

interface TitleOverlayProps {
  selectedAircraft: AircraftId;
  onSelectAircraft: (id: AircraftId) => void;
  selectedDifficulty: DifficultyId;
  onSelectDifficulty: (id: DifficultyId) => void;
  autoFire: boolean;
  onToggleAutoFire: () => void;
  savedRecord: SavedRecord;
  onStartGame: () => void;
}

const AIRCRAFT_LIST: AircraftId[] = ['falcon', 'aegis'];
const DIFFICULTY_LIST: DifficultyId[] = ['normal', 'hard', 'ace'];

export function TitleOverlay({
  selectedAircraft,
  onSelectAircraft,
  selectedDifficulty,
  onSelectDifficulty,
  autoFire,
  onToggleAutoFire,
  savedRecord,
  onStartGame,
}: TitleOverlayProps) {
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activeDiff = DIFFICULTY_CONFIGS[selectedDifficulty];

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between overflow-y-auto bg-[#09111F]">
      {/* Backdrop illustration with measured readability scrim */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!backdropFailed ? (
          <img
            src={HERO_BACKDROP_PATH}
            alt="황혼 고공 구름층 상공 전장 배경"
            referrerPolicy="no-referrer"
            onError={() => setBackdropFailed(true)}
            className="h-full w-full object-cover object-center opacity-45"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-[#0A162B] via-[#132544] to-[#1D2D44]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#09111F]/80 via-[#09111F]/70 to-[#09111F]/95" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-6 sm:px-8 sm:py-8">
        {/* Header & Best Record */}
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-amber-400">
              고공 전략 아케이드 슈팅
            </p>
            <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-5xl [text-wrap:balance]">
              에어로 스트라이크
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
              적 편대와 대형 보스의 탄막을 돌파하고 화력을 강화하세요. 키보드 또는 마우스·터치 드래그로 즉시 조종할 수 있습니다.
            </p>
          </div>

          {savedRecord.bestScore > 0 && (
            <div className="shrink-0 border-t border-slate-700/70 pt-3 text-left sm:border-t-0 sm:pt-0 sm:text-right">
              <div className="text-xs text-slate-400">최고 기록</div>
              <div className="font-mono-num text-2xl font-bold text-amber-400">
                {savedRecord.bestScore.toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-slate-400 tabular-nums">
                웨이브 {savedRecord.bestWave} · 격추 {savedRecord.bestKills}기
              </div>
            </div>
          )}
        </div>

        {/* Hangar: Aircraft Selection */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {AIRCRAFT_LIST.map((id) => {
            const spec = AIRCRAFT_CONFIGS[id];
            const isSelected = selectedAircraft === id;
            const imgFailed = failedImages[id];

            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectAircraft(id)}
                className={`group flex flex-col gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:flex-row sm:items-center sm:p-5 ${
                  isSelected
                    ? 'border-amber-400/90 bg-[#132036]/95'
                    : 'border-slate-700/70 bg-[#0E182A]/85 hover:border-slate-500/80 hover:bg-[#121F35]/90'
                }`}
              >
                {/* Aircraft Sprite Preview */}
                <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-700/60 bg-[#0B1628] sm:h-32 sm:w-32">
                  {!imgFailed ? (
                    <img
                      src={spec.imagePath}
                      alt={`${spec.name} 전투기 기체 이미지`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [id]: true }))
                      }
                      className={`h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-105 ${spec.imageRotateClass}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                      <Crosshair className="h-7 w-7 text-amber-400" />
                      <span className="text-xs font-medium">{spec.name}</span>
                    </div>
                  )}
                </div>

                {/* Aircraft Specs */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-white">
                      {spec.name}
                    </h2>
                    <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                      {isSelected ? '선택됨' : spec.role}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {spec.summary}
                  </p>
                  <div className="mt-2 text-xs text-slate-400">
                    무장: <span className="text-slate-200">{spec.weaponLabel}</span>
                  </div>

                  {/* Numeric Stat Bars */}
                  <div className="mt-3 space-y-1.5">
                    <StatRow label="화력" value={spec.stats.firepower} accent={spec.accentHex} />
                    <StatRow label="기동" value={spec.stats.speed} accent={spec.accentHex} />
                    <StatRow label="장갑" value={spec.stats.armor} accent={spec.accentHex} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Difficulty & Controls Bar */}
        <div className="mt-5 flex flex-col gap-4 border-t border-slate-700/60 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            {/* Difficulty Segmented Control */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                난이도
              </span>
              <div
                role="group"
                aria-label="난이도 선택"
                className="inline-flex rounded-lg border border-slate-700/80 bg-[#0D1627] p-1"
              >
                {DIFFICULTY_LIST.map((diffId) => {
                  const cfg = DIFFICULTY_CONFIGS[diffId];
                  const active = selectedDifficulty === diffId;
                  return (
                    <button
                      key={diffId}
                      type="button"
                      onClick={() => onSelectDifficulty(diffId)}
                      className={`min-h-[36px] rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                        active
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-fire Toggle */}
            <button
              type="button"
              onClick={onToggleAutoFire}
              className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                autoFire
                  ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-700 bg-[#0D1627] text-slate-300 hover:border-slate-500'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>자동 사격: {autoFire ? '켜짐' : '꺼짐'}</span>
            </button>
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={onStartGame}
            className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-lg bg-amber-500 px-8 py-3 text-base font-bold text-slate-950 transition-colors hover:bg-amber-400 active:bg-amber-600 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <Play className="h-5 w-5 fill-current" />
            <span>게임 시작</span>
          </button>
        </div>

        {/* Concise Operational Footnote */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>{activeDiff.description}</span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>이동: WASD / 방향키 / 마우스 드래그</span>
            <span aria-hidden="true">·</span>
            <span>사격: Space</span>
            <span aria-hidden="true">·</span>
            <span>EMP 폭탄: Shift / 우클릭</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Shield className="h-3 w-3 text-sky-400" />
              <span>파워업: P 화력 · + 수리 · S 방어막 · B 폭탄</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 text-[11px] text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-transform duration-200"
          style={{ width: `${value}%`, backgroundColor: accent }}
        />
      </div>
      <span className="font-mono-num w-7 text-right text-[11px] text-slate-300">
        {value}
      </span>
    </div>
  );
}
