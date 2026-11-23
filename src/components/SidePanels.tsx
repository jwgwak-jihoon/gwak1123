import {
  Pause,
  Play,
  Radio,
  Shield,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  AIRCRAFT_CONFIGS,
  DIFFICULTY_CONFIGS,
  HudSnapshot,
} from '../game/types';

interface HudPanelProps {
  hud: HudSnapshot;
  muted: boolean;
  autoFire: boolean;
  onToggleMute: () => void;
  onToggleAutoFire: () => void;
  onTogglePause: () => void;
  onTriggerBomb: () => void;
}

function getHpStateLabel(hp: number, maxHp: number): { label: string; colorClass: string } {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio > 0.55) return { label: '정상', colorClass: 'text-emerald-400' };
  if (ratio > 0.28) return { label: '주의', colorClass: 'text-amber-400' };
  return { label: '위험', colorClass: 'text-red-400' };
}

export function LeftStatusPanel({
  hud,
  onTriggerBomb,
}: Pick<HudPanelProps, 'hud' | 'onTriggerBomb'>) {
  const aircraft = AIRCRAFT_CONFIGS[hud.aircraftId];
  const difficulty = DIFFICULTY_CONFIGS[hud.difficultyId];
  const hpRatio = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0;
  const hpStatus = getHpStateLabel(hud.hp, hud.maxHp);

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col justify-between border-r border-slate-800/90 bg-[#0D1626] p-5 lg:flex xl:w-72">
      <div className="space-y-6">
        {/* Game Wordmark */}
        <div>
          <div className="font-display text-lg font-bold tracking-tight text-white">
            에어로 스트라이크
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {aircraft.name} · {difficulty.label}
          </div>
        </div>

        {/* Score Readout */}
        <div className="border-t border-slate-800 pt-5">
          <div className="text-xs text-slate-400">현재 점수</div>
          <div className="font-mono-num mt-1 text-3xl font-bold tracking-tight text-white">
            {hud.score.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
            <span>최고 기록</span>
            <span className="font-mono-num font-semibold text-amber-400">
              {hud.bestScore.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stage & Wave */}
        <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-5">
          <div>
            <div className="text-xs text-slate-400">스테이지</div>
            <div className="font-mono-num mt-0.5 text-xl font-bold text-slate-100">
              {hud.stage}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">웨이브</div>
            <div className="font-mono-num mt-0.5 text-xl font-bold text-amber-400">
              {hud.wave}
            </div>
          </div>
        </div>

        {/* Hull Integrity & Shield */}
        <div className="space-y-4 border-t border-slate-800 pt-5">
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-400">기체 내구도</span>
              <span className={`font-mono-num font-semibold ${hpStatus.colorClass}`}>
                {hud.hp}/{hud.maxHp} · {hpStatus.label}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  hpRatio > 55
                    ? 'bg-emerald-500'
                    : hpRatio > 28
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${hpRatio}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <Shield className="h-3.5 w-3.5 text-sky-400" />
              <span>방어막</span>
            </span>
            <span className="font-mono-num font-semibold text-sky-300">
              {hud.shield} / {hud.maxShield}
            </span>
          </div>

          {/* Weapon Level */}
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">화력 단계</span>
              <span className="font-mono-num font-semibold text-amber-300">
                LV.{hud.weaponLevel} {hud.weaponLevel >= 4 ? '(최대)' : ''}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((lvl) => (
                <div
                  key={lvl}
                  className={`h-1.5 rounded-sm ${
                    lvl <= hud.weaponLevel ? 'bg-amber-400' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive EMP Bomb Trigger */}
      <div className="border-t border-slate-800 pt-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">EMP 충격파 폭탄</span>
          <span className="font-mono-num font-semibold text-sky-300">
            {hud.bombs} / {hud.maxBombs}
          </span>
        </div>
        <button
          type="button"
          onClick={onTriggerBomb}
          disabled={hud.gameState !== 'PLAYING' || hud.bombs <= 0}
          className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-sky-500/50 bg-sky-500/15 px-4 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-500 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <Radio className="h-4 w-4" />
          <span>EMP 폭탄 발동 (Shift)</span>
        </button>
      </div>
    </aside>
  );
}

export function RightTacticalPanel({
  hud,
  muted,
  autoFire,
  onToggleMute,
  onToggleAutoFire,
  onTogglePause,
}: Omit<HudPanelProps, 'onTriggerBomb'>) {
  const accuracy =
    hud.shotsFired > 0 ? Math.min(100, Math.round((hud.shotsHit / hud.shotsFired) * 100)) : 0;
  const comboMult = Math.min(5, 1 + Math.floor(hud.combo / 4) * 0.25);
  const wavesUntilBoss = 3 - (hud.wave % 3 === 0 ? 3 : hud.wave % 3);

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col justify-between border-l border-slate-800/90 bg-[#0D1626] p-5 lg:flex xl:w-72">
      <div className="space-y-6">
        {/* Quick Utility Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePause}
            disabled={hud.gameState !== 'PLAYING' && hud.gameState !== 'PAUSED'}
            className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#131F34] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-40 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {hud.gameState === 'PAUSED' ? (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>계속하기</span>
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>일시정지</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? '소리 켜기' : '음소거'}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-700 bg-[#131F34] text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Auto-fire Toggle */}
        <button
          type="button"
          onClick={onToggleAutoFire}
          className={`flex min-h-[40px] w-full items-center justify-between rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-amber-400 ${
            autoFire
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-700 bg-[#131F34] text-slate-300 hover:border-slate-500'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Zap className="h-3.5 w-3.5" />
            <span>자동 사격</span>
          </span>
          <span className="font-mono-num whitespace-nowrap">{autoFire ? 'ON' : 'OFF'}</span>
        </button>

        {/* Live Combo Panel */}
        <div className="border-t border-slate-800 pt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-400">연속 격추 콤보</span>
            <span className="font-mono-num text-xs font-semibold text-amber-400">
              x{comboMult.toFixed(2)}
            </span>
          </div>
          <div className="font-mono-num mt-1 text-2xl font-bold text-white">
            {hud.combo} <span className="text-xs font-normal text-slate-400">연쇄</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-75"
              style={{ width: `${Math.round(hud.comboTimerRatio * 100)}%` }}
            />
          </div>
        </div>

        {/* Battle Telemetry */}
        <div className="space-y-2.5 border-t border-slate-800 pt-5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">누적 격추</span>
            <span className="font-mono-num font-semibold text-slate-100">{hud.kills}기</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">최대 콤보</span>
            <span className="font-mono-num font-semibold text-slate-100">{hud.maxCombo}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">명중률</span>
            <span className="font-mono-num font-semibold text-slate-100">{accuracy}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">보스 조우</span>
            <span className="font-mono-num font-semibold text-amber-300">
              {hud.bossActive
                ? '교전 중'
                : wavesUntilBoss === 0
                ? '현재 웨이브'
                : `${wavesUntilBoss}웨이브 후`}
            </span>
          </div>
        </div>
      </div>

      {/* Concise Key Guide */}
      <div className="space-y-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
        <div className="font-semibold text-slate-300">조작 안내</div>
        <div className="flex justify-between">
          <span>기체 이동</span>
          <span className="font-mono-num text-slate-300">WASD / 방향키 / 드래그</span>
        </div>
        <div className="flex justify-between">
          <span>주무기 사격</span>
          <span className="font-mono-num text-slate-300">Space / Z</span>
        </div>
        <div className="flex justify-between">
          <span>EMP 폭탄</span>
          <span className="font-mono-num text-slate-300">Shift / 우클릭</span>
        </div>
        <div className="flex justify-between">
          <span>일시정지</span>
          <span className="font-mono-num text-slate-300">P / Esc</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileTopHud({
  hud,
  muted,
  onToggleMute,
  onTogglePause,
  onTriggerBomb,
}: Pick<HudPanelProps, 'hud' | 'muted' | 'onToggleMute' | 'onTogglePause' | 'onTriggerBomb'>) {
  const hpRatio = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0;

  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#0D1626] px-3 lg:hidden">
      <div className="min-w-0">
        <div className="font-mono-num text-base font-bold leading-tight text-white">
          {hud.score.toLocaleString()}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 tabular-nums">
          <span>W{hud.wave}</span>
          <span aria-hidden="true">·</span>
          <span>LV.{hud.weaponLevel}</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-400">HP {hud.hp}</span>
          {hud.shield > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-sky-400">S {hud.shield}</span>
            </>
          )}
        </div>
        <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full ${hpRatio > 35 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${hpRatio}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onTriggerBomb}
          disabled={hud.gameState !== 'PLAYING' || hud.bombs <= 0}
          className="flex min-h-[40px] items-center gap-1 rounded-lg border border-sky-500/50 bg-sky-500/15 px-2.5 text-xs font-semibold text-sky-200 disabled:opacity-35 whitespace-nowrap shrink-0"
        >
          <Radio className="h-3.5 w-3.5" />
          <span className="font-mono-num">{hud.bombs}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? '소리 켜기' : '음소거'}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-700 bg-[#131F34] text-slate-200"
        >
          {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={onTogglePause}
          aria-label={hud.gameState === 'PAUSED' ? '계속하기' : '일시정지'}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-700 bg-[#131F34] text-slate-200"
        >
          {hud.gameState === 'PAUSED' ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
}
