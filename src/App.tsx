import { useCallback, useEffect, useRef, useState } from 'react';
import { ModalOverlays } from './components/ModalOverlays';
import {
  LeftStatusPanel,
  MobileTopHud,
  RightTacticalPanel,
} from './components/SidePanels';
import { TitleOverlay } from './components/TitleOverlay';
import { GameEngine } from './game/engine';
import { soundEngine } from './game/sound';
import {
  AircraftId,
  DifficultyId,
  HudSnapshot,
  SavedRecord,
} from './game/types';

const STORAGE_KEY = 'aero_strike_best_record_v1';

function loadSavedRecord(): SavedRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { bestScore: 0, bestWave: 1, bestKills: 0, aircraftId: 'falcon' };
    }
    const parsed = JSON.parse(raw) as Partial<SavedRecord>;
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      bestWave: typeof parsed.bestWave === 'number' ? parsed.bestWave : 1,
      bestKills: typeof parsed.bestKills === 'number' ? parsed.bestKills : 0,
      aircraftId: parsed.aircraftId === 'aegis' ? 'aegis' : 'falcon',
    };
  } catch {
    return { bestScore: 0, bestWave: 1, bestKills: 0, aircraftId: 'falcon' };
  }
}

function saveBestRecord(record: SavedRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota errors
  }
}

const INITIAL_HUD: HudSnapshot = {
  gameState: 'TITLE_MENU',
  score: 0,
  bestScore: 0,
  wave: 1,
  stage: 1,
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  combo: 0,
  maxCombo: 0,
  comboTimerRatio: 0,
  hp: 100,
  maxHp: 100,
  shield: 1,
  maxShield: 3,
  weaponLevel: 1,
  bombs: 3,
  maxBombs: 5,
  bossActive: false,
  bossName: '',
  bossHpRatio: 0,
  bossHp: 0,
  bossMaxHp: 0,
  warningText: '',
  isNewRecord: false,
  aircraftId: 'falcon',
  difficultyId: 'normal',
};

export default function App() {
  const [savedRecord, setSavedRecord] = useState<SavedRecord>(() => loadSavedRecord());
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftId>('falcon');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>('normal');
  const [autoFire, setAutoFire] = useState(true);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(() => ({
    ...INITIAL_HUD,
    bestScore: loadSavedRecord().bestScore,
  }));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const pointerDownRef = useRef(false);

  const handleSaveRecord = useCallback(
    (score: number, wave: number, kills: number, aircraftId: AircraftId) => {
      setSavedRecord((prev) => {
        if (score <= prev.bestScore) return prev;
        const next: SavedRecord = {
          bestScore: score,
          bestWave: Math.max(prev.bestWave, wave),
          bestKills: Math.max(prev.bestKills, kills),
          aircraftId,
        };
        saveBestRecord(next);
        return next;
      });
    },
    []
  );

  // Initialize GameEngine once and bind ResizeObserver + keyboard
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = arenaContainerRef.current;
    if (!canvas || !container) return;

    const engine = new GameEngine(
      canvas,
      savedRecord.bestScore,
      (snapshot) => setHud(snapshot),
      handleSaveRecord
    );
    engine.setAutoFire(autoFire);
    engineRef.current = engine;
    engine.startLoop();

    const syncSize = () => {
      if (!arenaContainerRef.current || !engineRef.current) return;
      const rect = arenaContainerRef.current.getBoundingClientRect();
      engineRef.current.resize(rect.width, rect.height);
    };
    syncSize();

    const observer = new ResizeObserver(syncSize);
    observer.observe(container);

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
      ) {
        if (engineRef.current?.getGameState() === 'PLAYING') {
          e.preventDefault();
        }
      }
      engineRef.current?.handleKeyDown(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.handleKeyUp(e.code);
    };

    const onBlur = () => {
      if (engineRef.current?.getGameState() === 'PLAYING') {
        engineRef.current.togglePause();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep engine synced with autoFire & mute preferences
  useEffect(() => {
    engineRef.current?.setAutoFire(autoFire);
  }, [autoFire]);

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    engineRef.current?.setBestScore(savedRecord.bestScore);
  }, [savedRecord.bestScore]);

  const handleStartGame = useCallback(() => {
    engineRef.current?.startNewGame(selectedAircraft, selectedDifficulty);
  }, [selectedAircraft, selectedDifficulty]);

  const handleRestart = useCallback(() => {
    engineRef.current?.startNewGame(selectedAircraft, selectedDifficulty);
  }, [selectedAircraft, selectedDifficulty]);

  const handleReturnTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleNextStage = useCallback(() => {
    engineRef.current?.continueNextStage();
  }, []);

  const handleTriggerBomb = useCallback(() => {
    engineRef.current?.triggerEmpBomb();
  }, []);

  // Canvas pointer controls (mouse drag & touch drag)
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#09111F] text-slate-100 select-none">
      {/* Compact Mobile Top HUD (only visible while active or paused on mobile/tablet) */}
      {hud.gameState !== 'TITLE_MENU' && (
        <MobileTopHud
          hud={hud}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          onTogglePause={handleTogglePause}
          onTriggerBomb={handleTriggerBomb}
        />
      )}

      {/* Main Full-Height Desktop Workspace */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left HUD Panel (Desktop) */}
        <LeftStatusPanel hud={hud} onTriggerBomb={handleTriggerBomb} />

        {/* Center Active Battle Arena */}
        <main className="relative flex min-h-0 flex-1 items-center justify-center bg-[#060C17]">
          <div
            ref={arenaContainerRef}
            className="relative h-full w-full max-w-[680px] overflow-hidden border-x border-slate-800/80 bg-[#081224] shadow-2xl"
          >
            {/* Unobtrusive Boss HP Bar docked strictly at top edge during Boss fights */}
            {hud.bossActive && hud.gameState === 'PLAYING' && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[#070E1C]/90 to-transparent px-4 pt-3 pb-5">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-display font-bold text-red-300">
                    {hud.bossName}
                  </span>
                  <span className="font-mono-num text-slate-200">
                    {hud.bossHp.toLocaleString()} / {hud.bossMaxHp.toLocaleString()} ·{' '}
                    {hud.bossHpRatio < 0.5 ? '2단계 격노' : '1단계'}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-900/90">
                  <div
                    className={`h-full transition-all duration-100 ${
                      hud.bossHpRatio < 0.5 ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.round(hud.bossHpRatio * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                pointerDownRef.current = true;
                const { x, y } = getCanvasCoords(e.clientX, e.clientY);
                engineRef.current?.handlePointerDown(x, y, e.button);
              }}
              onPointerMove={(e) => {
                if (!pointerDownRef.current) return;
                const { x, y } = getCanvasCoords(e.clientX, e.clientY);
                engineRef.current?.handlePointerMove(x, y, true);
              }}
              onPointerUp={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }
                pointerDownRef.current = false;
                engineRef.current?.handlePointerUp();
              }}
              onPointerCancel={() => {
                pointerDownRef.current = false;
                engineRef.current?.handlePointerUp();
              }}
              className="block h-full w-full touch-none cursor-crosshair"
            />

            {/* Pause / Stage Clear / Game Over Modals */}
            <ModalOverlays
              hud={hud}
              onResume={handleTogglePause}
              onNextStage={handleNextStage}
              onRestart={handleRestart}
              onReturnTitle={handleReturnTitle}
            />
          </div>
        </main>

        {/* Right Tactical Panel (Desktop) */}
        <RightTacticalPanel
          hud={hud}
          muted={muted}
          autoFire={autoFire}
          onToggleMute={() => setMuted((m) => !m)}
          onToggleAutoFire={() => setAutoFire((a) => !a)}
          onTogglePause={handleTogglePause}
        />

        {/* Full-Viewport Title & Hangar Overlay */}
        {hud.gameState === 'TITLE_MENU' && (
          <TitleOverlay
            selectedAircraft={selectedAircraft}
            onSelectAircraft={setSelectedAircraft}
            selectedDifficulty={selectedDifficulty}
            onSelectDifficulty={setSelectedDifficulty}
            autoFire={autoFire}
            onToggleAutoFire={() => setAutoFire((a) => !a)}
            savedRecord={savedRecord}
            onStartGame={handleStartGame}
          />
        )}
      </div>
    </div>
  );
}
