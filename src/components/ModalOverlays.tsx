import { ArrowRight, Home, Play, RotateCcw } from 'lucide-react';
import { HudSnapshot } from '../game/types';

interface ModalOverlaysProps {
  hud: HudSnapshot;
  onResume: () => void;
  onNextStage: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export function ModalOverlays({
  hud,
  onResume,
  onNextStage,
  onRestart,
  onReturnTitle,
}: ModalOverlaysProps) {
  if (
    hud.gameState !== 'PAUSED' &&
    hud.gameState !== 'STAGE_CLEAR' &&
    hud.gameState !== 'GAME_OVER'
  ) {
    return null;
  }

  const accuracy =
    hud.shotsFired > 0
      ? Math.min(100, Math.round((hud.shotsHit / hud.shotsFired) * 100))
      : 0;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070D19]/80 p-5 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-xl border border-slate-700/80 bg-[#101B2E] p-6 shadow-2xl">
        {hud.gameState === 'PAUSED' && (
          <>
            <h2 className="font-display text-2xl font-bold text-white">일시정지</h2>
            <p className="mt-1.5 text-sm text-slate-300">
              전투가 잠시 중단되었습니다. 준비되면 계속 진행하세요.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>계속하기</span>
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#16243D] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span>처음부터 다시 하기</span>
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-slate-800 px-4 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-200 whitespace-nowrap"
              >
                <Home className="h-4 w-4" />
                <span>타이틀로 돌아가기</span>
              </button>
            </div>
          </>
        )}

        {hud.gameState === 'STAGE_CLEAR' && (
          <>
            <div className="text-xs font-semibold text-emerald-400">
              스테이지 {hud.stage} 클리어
            </div>
            <h2 className="font-display mt-1 text-2xl font-bold text-white">
              보스 격추 완료
            </h2>
            <p className="mt-1.5 text-sm text-slate-300">
              다음 구역 진입 시 기체 내구도가 +25 회복됩니다.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-y-3 border-y border-slate-800 py-4 text-sm">
              <div>
                <div className="text-xs text-slate-400">누적 점수</div>
                <div className="font-mono-num text-lg font-bold text-amber-400">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">누적 격추</div>
                <div className="font-mono-num text-lg font-bold text-white">
                  {hud.kills}기
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">최대 콤보</div>
                <div className="font-mono-num text-base font-semibold text-slate-200">
                  {hud.maxCombo} 연쇄
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">명중률</div>
                <div className="font-mono-num text-base font-semibold text-slate-200">
                  {accuracy}%
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={onNextStage}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
              >
                <span>다음 스테이지</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap"
              >
                <span>타이틀</span>
              </button>
            </div>
          </>
        )}

        {hud.gameState === 'GAME_OVER' && (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-red-400">작전 종료</span>
              {hud.isNewRecord && (
                <span className="text-xs font-bold text-amber-400">신기록 달성</span>
              )}
            </div>
            <h2 className="font-display mt-1 text-2xl font-bold text-white">
              기체 대파 · 게임 오버
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-y-3 border-y border-slate-800 py-4 text-sm">
              <div>
                <div className="text-xs text-slate-400">최종 점수</div>
                <div className="font-mono-num text-xl font-bold text-amber-400">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">최고 기록</div>
                <div className="font-mono-num text-xl font-bold text-slate-100">
                  {hud.bestScore.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">도달 웨이브</div>
                <div className="font-mono-num text-base font-semibold text-slate-200">
                  Stage {hud.stage} · Wave {hud.wave}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">격추 수 · 명중률</div>
                <div className="font-mono-num text-base font-semibold text-slate-200">
                  {hud.kills}기 · {accuracy}%
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={onRestart}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                <span>다시 하기</span>
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#16243D] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white whitespace-nowrap"
              >
                <Home className="h-4 w-4" />
                <span>타이틀로</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
