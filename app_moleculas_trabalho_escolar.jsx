export default function App() {
  const { useEffect, useMemo, useRef, useState } = React;

  const WORLD_WIDTH = 2200;
  const GROUND_Y = 420;
  const PLAYER_W = 42;
  const PLAYER_H = 58;
  const GRAVITY = 0.95;
  const MOVE_SPEED = 4.5;
  const JUMP_POWER = 15;

  const platforms = [
    { x: 0, y: 470, w: 2200, h: 50, type: "ground" },
    { x: 180, y: 380, w: 170, h: 18, type: "platform" },
    { x: 420, y: 320, w: 170, h: 18, type: "platform" },
    { x: 690, y: 360, w: 160, h: 18, type: "platform" },
    { x: 930, y: 300, w: 190, h: 18, type: "platform" },
    { x: 1210, y: 355, w: 170, h: 18, type: "platform" },
    { x: 1490, y: 315, w: 200, h: 18, type: "platform" },
    { x: 1760, y: 360, w: 150, h: 18, type: "platform" },
  ];

  const atpInitial = [
    { id: "a1", x: 240, y: 335 },
    { id: "a2", x: 490, y: 275 },
    { id: "a3", x: 760, y: 315 },
    { id: "a4", x: 1010, y: 255 },
    { id: "a5", x: 1300, y: 310 },
  ];

  const sodiumInitial = [
    { id: "na1", x: 560, y: 428 },
    { id: "na2", x: 1090, y: 428 },
    { id: "na3", x: 1580, y: 428 },
  ];

  const potassiumInitial = [
    { id: "k1", x: 825, y: 428 },
    { id: "k2", x: 1875, y: 428 },
  ];

  const hazards = [
    { id: "h1", x: 640, y: 448, w: 110, h: 22, label: "Vazamento tóxico" },
    { id: "h2", x: 1390, y: 448, w: 120, h: 22, label: "Descarga iônica" },
  ];

  const checkpoints = [
    { x: 0, label: "Entrada do laboratório" },
    { x: 520, label: "Zona de ATP" },
    { x: 1040, label: "Canal de expulsão" },
    { x: 1640, label: "Câmara de reposição" },
    { x: 2040, label: "Bomba Na⁺/K⁺" },
  ];

  const [player, setPlayer] = useState({ x: 50, y: 340, vx: 0, vy: 0, onGround: false, facing: 1 });
  const [keys, setKeys] = useState({ left: false, right: false, up: false });
  const [atp, setAtp] = useState(atpInitial);
  const [sodium, setSodium] = useState(sodiumInitial);
  const [potassium, setPotassium] = useState(potassiumInitial);
  const [usedATP, setUsedATP] = useState(false);
  const [story, setStory] = useState("Bem-vindo ao laboratório celular. Colete ATP, remova 3 íons Na⁺ e recoloque 2 íons K⁺ para ativar a bomba.");
  const [gameState, setGameState] = useState("playing");
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const frameRef = useRef(null);
  const worldRef = useRef(null);

  const quiz = [
    {
      q: "A bomba de sódio e potássio realiza qual tipo de transporte?",
      options: ["Difusão simples", "Transporte ativo", "Osmose", "Difusão facilitada"],
      correct: "Transporte ativo",
    },
    {
      q: "Quantos íons de sódio saem da célula por ciclo?",
      options: ["1", "2", "3", "4"],
      correct: "3",
    },
    {
      q: "Quantos íons de potássio entram na célula por ciclo?",
      options: ["1", "2", "3", "4"],
      correct: "2",
    },
  ];

  const mission = useMemo(() => ({
    atpCollected: atpInitial.length - atp.length,
    sodiumRemoved: sodiumInitial.length - sodium.length,
    potassiumInserted: potassiumInitial.length - potassium.length,
  }), [atp, sodium, potassium]);

  useEffect(() => {
    function onKeyDown(e) {
      if (["ArrowLeft", "a", "A"].includes(e.key)) setKeys((k) => ({ ...k, left: true }));
      if (["ArrowRight", "d", "D"].includes(e.key)) setKeys((k) => ({ ...k, right: true }));
      if (["ArrowUp", "w", "W", " "].includes(e.key)) setKeys((k) => ({ ...k, up: true }));
      if (e.key.toLowerCase() === "e") interact();
      if (e.key.toLowerCase() === "r") resetGame();
    }
    function onKeyUp(e) {
      if (["ArrowLeft", "a", "A"].includes(e.key)) setKeys((k) => ({ ...k, left: false }));
      if (["ArrowRight", "d", "D"].includes(e.key)) setKeys((k) => ({ ...k, right: false }));
      if (["ArrowUp", "w", "W", " "].includes(e.key)) setKeys((k) => ({ ...k, up: false }));
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [player, mission, usedATP, gameState, quizVisible]);

  useEffect(() => {
    if (gameState !== "playing" || quizVisible) return;

    function tick() {
      setPlayer((prev) => {
        let vx = 0;
        if (keys.left) vx = -MOVE_SPEED;
        if (keys.right) vx = MOVE_SPEED;
        let vy = prev.vy + GRAVITY;
        let nextX = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_W, prev.x + vx));
        let nextY = prev.y + vy;
        let onGround = false;

        for (const p of platforms) {
          const horizontalHit = nextX + PLAYER_W > p.x && nextX < p.x + p.w;
          const wasAbove = prev.y + PLAYER_H <= p.y;
          const willBelowTop = nextY + PLAYER_H >= p.y;
          if (horizontalHit && wasAbove && willBelowTop && vy >= 0) {
            nextY = p.y - PLAYER_H;
            vy = 0;
            onGround = true;
          }
        }

        if (keys.up && prev.onGround) {
          vy = -JUMP_POWER;
          onGround = false;
        }

        for (const h of hazards) {
          if (
            nextX + PLAYER_W > h.x &&
            nextX < h.x + h.w &&
            nextY + PLAYER_H > h.y &&
            nextY < h.y + h.h
          ) {
            setStory(`Contato com ${h.label}. Reiniciando a fase do laboratório.`);
            return { x: 50, y: 340, vx: 0, vy: 0, onGround: false, facing: 1 };
          }
        }

        const facing = vx === 0 ? prev.facing : vx > 0 ? 1 : -1;
        return { x: nextX, y: nextY, vx, vy, onGround, facing };
      });
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [keys, gameState, quizVisible]);

  useEffect(() => {
    if (!worldRef.current) return;
    const viewport = worldRef.current;
    const target = Math.max(0, Math.min(player.x - 320, WORLD_WIDTH - 760));
    viewport.scrollTo({ left: target, behavior: "smooth" });
  }, [player.x]);

  useEffect(() => {
    setAtp((list) => list.filter((item) => !collides(player.x, player.y, PLAYER_W, PLAYER_H, item.x, item.y, 24, 24)));
    setSodium((list) => list.filter((item) => !nearSodiumExit(player, item, mission, usedATP)));
    setPotassium((list) => list.filter((item) => !nearPotassiumGate(player, item, mission, usedATP)));
  }, [player.x, player.y]);

  useEffect(() => {
    if (mission.atpCollected >= 1 && !usedATP) {
      setStory("ATP coletado. Vá até a bomba no final do laboratório e pressione E para energizar o mecanismo.");
    }
  }, [mission.atpCollected, usedATP]);

  useEffect(() => {
    if (mission.sodiumRemoved === 3 && mission.potassiumInserted === 2 && usedATP && gameState === "playing") {
      setStory("Equilíbrio restaurado. Agora responda ao quiz final para concluir o experimento.");
      setQuizVisible(true);
    }
  }, [mission, usedATP, gameState]);

  function collides(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax + aw > bx && ax < bx + bw && ay + ah > by && ay < by + bh;
  }

  function nearSodiumExit(currentPlayer, ion, currentMission, currentATP) {
    if (!currentATP) return false;
    const exitZone = { x: 2035, y: 250, w: 120, h: 210 };
    const ionTouch = collides(currentPlayer.x, currentPlayer.y, PLAYER_W, PLAYER_H, ion.x - 8, ion.y - 8, 40, 40);
    const atExit = ion.x > exitZone.x && ion.y > exitZone.y;
    if (ionTouch && currentPlayer.x > 1960 && currentMission.sodiumRemoved < 3) {
      setStory(`Na⁺ removido com sucesso. Restam ${3 - (currentMission.sodiumRemoved + 1)} íons de sódio.`);
      return true;
    }
    return atExit;
  }

  function nearPotassiumGate(currentPlayer, ion, currentMission, currentATP) {
    if (!currentATP || currentMission.sodiumRemoved < 3) return false;
    const gateZone = currentPlayer.x > 1960;
    const ionTouch = collides(currentPlayer.x, currentPlayer.y, PLAYER_W, PLAYER_H, ion.x - 8, ion.y - 8, 40, 40);
    if (ionTouch && gateZone && currentMission.potassiumInserted < 2) {
      setStory(`K⁺ reinserido na célula. Restam ${2 - (currentMission.potassiumInserted + 1)} íons de potássio.`);
      return true;
    }
    return false;
  }

  function interact() {
    if (quizVisible || gameState !== "playing") return;
    const nearPump = player.x > 1970;
    if (nearPump && mission.atpCollected >= 1 && !usedATP) {
      setUsedATP(true);
      setStory("ATP consumido. A bomba Na⁺/K⁺ foi ativada. Agora remova 3 Na⁺ e reintroduza 2 K⁺.");
      return;
    }
    if (nearPump && mission.atpCollected < 1) {
      setStory("A bomba está sem energia. Colete ATP antes de ativar o sistema.");
      return;
    }
    const label = checkpoints.find((point) => Math.abs(player.x - point.x) < 80)?.label;
    if (label) {
      setStory(`Checkpoint: ${label}. Continue o protocolo experimental.`);
    }
  }

  function answerQuiz(option) {
    if (quizAnswered) return;
    setSelectedAnswer(option);
    setQuizAnswered(true);
    if (option === quiz[quizIndex].correct) setQuizScore((s) => s + 1);
  }

  function nextQuiz() {
    if (quizIndex < quiz.length - 1) {
      setQuizIndex((i) => i + 1);
      setQuizAnswered(false);
      setSelectedAnswer("");
    } else {
      setQuizVisible(false);
      setGameState("won");
      setStory("Experimento concluído com sucesso. A membrana foi estabilizada e o transporte ativo foi restaurado.");
    }
  }

  function resetGame() {
    setPlayer({ x: 50, y: 340, vx: 0, vy: 0, onGround: false, facing: 1 });
    setAtp(atpInitial);
    setSodium(sodiumInitial);
    setPotassium(potassiumInitial);
    setUsedATP(false);
    setStory("Bem-vindo ao laboratório celular. Colete ATP, remova 3 íons Na⁺ e recoloque 2 íons K⁺ para ativar a bomba.");
    setGameState("playing");
    setQuizVisible(false);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizAnswered(false);
    setSelectedAnswer("");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <header className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-slate-900 via-blue-950 to-cyan-950 p-6 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Laboratório de biologia celular</p>
          <h1 className="text-3xl md:text-5xl font-black mt-2">Missão Membrana</h1>
          <p className="text-base md:text-xl text-cyan-100 mt-2">Plataforma científica sobre a bomba de sódio e potássio</p>
          <p className="text-sm md:text-base text-slate-300 mt-3 max-w-4xl">
            Controle o pesquisador, colete ATP, evite vazamentos tóxicos e conclua o transporte ativo. Use as setas ou A/D para mover, espaço para pular e E para interagir com a bomba.
          </p>
        </header>

        <section className="grid lg:grid-cols-[1.35fr,0.65fr] gap-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
              <div>
                <h2 className="font-bold text-lg">Simulador de plataforma</h2>
                <p className="text-xs text-slate-400">Ambiente: laboratório de transporte transmembrana</p>
              </div>
              <button onClick={resetGame} className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold">
                Reiniciar experimento
              </button>
            </div>

            <div ref={worldRef} className="overflow-x-auto overflow-y-hidden bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(180deg,#06101f,#08172a_55%,#07111f)]">
              <div className="relative" style={{ width: WORLD_WIDTH, height: 520 }}>
                <div className="absolute inset-x-0 top-6 flex justify-around text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">
                  <span>Coleta de ATP</span>
                  <span>Controle iônico</span>
                  <span>Bomba Na⁺/K⁺</span>
                </div>

                {platforms.map((p, index) => (
                  <div
                    key={index}
                    className={p.type === "ground" ? "absolute rounded-none bg-slate-800 border-t border-cyan-900" : "absolute rounded-2xl bg-slate-700/90 border border-cyan-700/40 shadow-lg shadow-cyan-950/40"}
                    style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
                  />
                ))}

                <div className="absolute left-[1980px] top-[180px] w-[150px] h-[250px] rounded-3xl border-2 border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_40px_rgba(34,211,238,0.15)] p-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-cyan-300">Bomba</div>
                  <div className="text-lg font-bold mt-1">Na⁺/K⁺ ATPase</div>
                  <div className="mt-4 text-xs text-slate-300 leading-5">Pressione E aqui para ativar a bomba com ATP e concluir o protocolo.</div>
                  <div className={`mt-5 rounded-xl px-3 py-2 text-xs font-semibold ${usedATP ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-amber-500/10 text-amber-300 border border-amber-500/30"}`}>
                    {usedATP ? "Sistema energizado" : "Aguardando ATP"}
                  </div>
                </div>

                {atp.map((item) => (
                  <div key={item.id} className="absolute rounded-full border border-yellow-300 bg-yellow-400 text-slate-950 text-[10px] font-black flex items-center justify-center shadow-lg" style={{ left: item.x, top: item.y, width: 24, height: 24 }}>
                    ATP
                  </div>
                ))}

                {sodium.map((item) => (
                  <div key={item.id} className="absolute rounded-full border border-rose-300 bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-lg" style={{ left: item.x, top: item.y, width: 28, height: 28 }}>
                    Na⁺
                  </div>
                ))}

                {potassium.map((item) => (
                  <div key={item.id} className="absolute rounded-full border border-emerald-300 bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center shadow-lg" style={{ left: item.x, top: item.y, width: 28, height: 28 }}>
                    K⁺
                  </div>
                ))}

                {hazards.map((hazard) => (
                  <div key={hazard.id} className="absolute rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-600/40 to-violet-500/40 text-[10px] uppercase tracking-[0.25em] text-fuchsia-100 flex items-center justify-center" style={{ left: hazard.x, top: hazard.y, width: hazard.w, height: hazard.h }}>
                    {hazard.label}
                  </div>
                ))}

                {checkpoints.map((point, index) => (
                  <div key={index} className="absolute top-[110px] text-[10px] text-cyan-300/50 uppercase tracking-[0.2em]" style={{ left: point.x + 30 }}>
                    {point.label}
                  </div>
                ))}

                <div
                  className="absolute rounded-2xl border border-cyan-300 bg-gradient-to-b from-cyan-200 to-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
                  style={{ left: player.x, top: player.y, width: PLAYER_W, height: PLAYER_H, transform: `scaleX(${player.facing})` }}
                >
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-slate-950/80" />
                  <div className="absolute bottom-2 left-2 right-2 h-5 rounded-xl bg-slate-950/70" />
                </div>

                {quizVisible && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl">
                      <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Verificação do experimento</p>
                      <h3 className="text-2xl font-bold mt-2">{quiz[quizIndex].q}</h3>
                      <div className="mt-5 grid gap-3">
                        {quiz[quizIndex].options.map((option) => {
                          const correct = option === quiz[quizIndex].correct;
                          const selected = option === selectedAnswer;
                          let style = "border-slate-700 bg-slate-800 hover:border-cyan-500";
                          if (quizAnswered && correct) style = "border-emerald-500 bg-emerald-500/10";
                          if (quizAnswered && selected && !correct) style = "border-rose-500 bg-rose-500/10";
                          return (
                            <button key={option} onClick={() => answerQuiz(option)} className={`rounded-2xl border px-4 py-3 text-left font-medium transition ${style}`}>
                              {option}
                            </button>
                          );
                        })}
                      </div>
                      {quizAnswered && (
                        <div className="mt-5">
                          <p className="text-sm text-slate-300">Resposta correta: <span className="font-bold text-cyan-300">{quiz[quizIndex].correct}</span></p>
                          <button onClick={nextQuiz} className="mt-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 px-4 py-3 font-semibold">
                            {quizIndex < quiz.length - 1 ? "Próxima pergunta" : "Finalizar experimento"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
              <h2 className="text-xl font-bold">Missão científica</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-2xl bg-slate-800 p-4 border border-slate-700">
                  <div className="text-slate-400">ATP coletado</div>
                  <div className="text-2xl font-black text-yellow-300">{mission.atpCollected}/{atpInitial.length}</div>
                </div>
                <div className="rounded-2xl bg-slate-800 p-4 border border-slate-700">
                  <div className="text-slate-400">Na⁺ removidos</div>
                  <div className="text-2xl font-black text-rose-300">{mission.sodiumRemoved}/3</div>
                </div>
                <div className="rounded-2xl bg-slate-800 p-4 border border-slate-700">
                  <div className="text-slate-400">K⁺ reinseridos</div>
                  <div className="text-2xl font-black text-emerald-300">{mission.potassiumInserted}/2</div>
                </div>
                <div className={`rounded-2xl p-4 border ${usedATP ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                  <div className="text-slate-300">Estado da bomba</div>
                  <div className="text-lg font-bold">{usedATP ? "Ativada com ATP" : "Aguardando energia"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
              <h2 className="text-xl font-bold">Status do laboratório</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{story}</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
              <h2 className="text-xl font-bold">Base teórica</h2>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300 list-disc list-inside">
                <li>A bomba de sódio e potássio é uma proteína transmembrana.</li>
                <li>Ela realiza transporte ativo e consome ATP.</li>
                <li>Em cada ciclo, 3 Na⁺ saem e 2 K⁺ entram na célula.</li>
                <li>Esse mecanismo ajuda no potencial de membrana e na homeostase.</li>
              </ul>
            </div>

            {gameState === "won" && (
              <div className="rounded-3xl border border-cyan-400/40 bg-cyan-500/10 p-5 shadow-xl">
                <h2 className="text-xl font-bold text-cyan-200">Experimento concluído</h2>
                <p className="mt-2 text-sm text-slate-200">Pontuação do quiz: {quizScore}/{quiz.length}. O protocolo foi executado com sucesso.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
