import { useState, useEffect, useRef } from "react";

const z = n => String(Math.floor(Math.abs(n))).padStart(2, "0");
function split(ms) {
  const t = Math.max(0, ms);
  return {
    h: Math.floor(t / 3600000),
    m: Math.floor((t % 3600000) / 60000),
    s: Math.floor((t % 60000) / 1000),
    cs: Math.floor((t % 1000) / 10),
  };
}

const PRESETS = [
  { label: "1 min", ms: 60000 },
  { label: "5 min", ms: 300000 },
  { label: "10 min", ms: 600000 },
  { label: "25 min", ms: 1500000 },
];

function DialRing({ size, progress, done, inactive, mode }) {
  const cx = size / 2, cy = size / 2;
  const tickR = size / 2 - 12;
  const arcR = size / 2 - 22;
  const circ = 2 * Math.PI * arcR;
  const pct = Math.min(1, Math.max(0, progress));
  const offset = circ * (1 - pct);
  const dotAngle = (1 - pct) * 2 * Math.PI - Math.PI / 2;
  const dotX = cx + arcR * Math.cos(dotAngle);
  const dotY = cy + arcR * Math.sin(dotAngle);
  const arcColor = done ? "#ef4444" : "#fb923c";

  return (
    <svg
      width={size} height={size}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden="true"
    >
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const major = i % 5 === 0;
        const outer = tickR;
        const inner = tickR - (major ? 10 : 5);
        return (
          <line key={i}
            x1={cx + outer * Math.cos(a)} y1={cy + outer * Math.sin(a)}
            x2={cx + inner * Math.cos(a)} y2={cy + inner * Math.sin(a)}
            stroke={major ? "#262638" : "#111120"}
            strokeWidth={major ? 1.5 : 0.8}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={arcR} fill="none"
        stroke={done ? "rgba(239,68,68,0.08)" : "rgba(251,146,60,0.06)"}
        strokeWidth={4.5}
      />
      {!inactive && (
        <circle cx={cx} cy={cy} r={arcR} fill="none"
          stroke={arcColor} strokeWidth={4.5}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90,${cx},${cy})`}
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s ease" }}
        />
      )}
      {!inactive && pct > 0.01 && pct < 0.999 && (
        <circle cx={dotX} cy={dotY} r={6} fill={arcColor}
          style={{ transition: "cx 0.1s linear, cy 0.1s linear" }}
        />
      )}
      {mode === "sw" && (
        <text x={cx} y={cy - arcR - 28} textAnchor="middle"
          fill="#1a1a2a" fontSize="9" fontFamily="'Rajdhani', sans-serif"
          fontWeight="700" letterSpacing="3">
          MIN
        </text>
      )}
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("sw");

  // ── Stopwatch ──────────────────────────────────
  const [swMs, setSwMs] = useState(0);
  const [swRun, setSwRun] = useState(false);
  const [laps, setLaps] = useState([]);
  const swSave = useRef(0), swT0 = useRef(0), swRaf = useRef(null);

  // ── Timer ──────────────────────────────────────
  const [tmMs, setTmMs] = useState(300000);
  const [tmTotal, setTmTotal] = useState(300000);
  const [tmRun, setTmRun] = useState(false);
  const [tmDone, setTmDone] = useState(false);
  const [editH, setEditH] = useState("00");
  const [editM, setEditM] = useState("05");
  const [editS, setEditS] = useState("00");
  const [editMode, setEditMode] = useState(false);
  const tmSave = useRef(300000), tmT0 = useRef(0), tmRaf = useRef(null);

  // Stopwatch RAF loop
  useEffect(() => {
    if (!swRun) return;
    swT0.current = Date.now();
    const tick = () => {
      setSwMs(swSave.current + Date.now() - swT0.current);
      swRaf.current = requestAnimationFrame(tick);
    };
    swRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(swRaf.current);
  }, [swRun]);

  // Timer RAF loop
  useEffect(() => {
    if (!tmRun) return;
    tmT0.current = Date.now();
    const tick = () => {
      const rem = tmSave.current - (Date.now() - tmT0.current);
      if (rem <= 0) {
        setTmMs(0); setTmRun(false); setTmDone(true);
      } else {
        setTmMs(rem);
        tmRaf.current = requestAnimationFrame(tick);
      }
    };
    tmRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(tmRaf.current);
  }, [tmRun]);

  const swStart = () => { swSave.current = swMs; setSwRun(true); };
  const swPause = () => { swSave.current = swMs; setSwRun(false); };
  const swReset = () => { setSwRun(false); setSwMs(0); swSave.current = 0; setLaps([]); };
  const swLap = () => {
    if (swMs > 0) setLaps(p => [{ ms: swMs, id: Date.now() }, ...p].slice(0, 12));
  };

  const tmToggle = () => {
    if (tmDone) return;
    if (tmRun) { tmSave.current = tmMs; setTmRun(false); }
    else if (tmMs > 0) { tmSave.current = tmMs; setTmRun(true); }
  };
  const tmReset = () => {
    cancelAnimationFrame(tmRaf.current);
    setTmRun(false); setTmDone(false);
    setTmMs(tmTotal); tmSave.current = tmTotal;
  };
  const applyTime = (ms) => {
    cancelAnimationFrame(tmRaf.current);
    setTmRun(false); setTmDone(false);
    setTmTotal(ms); setTmMs(ms); tmSave.current = ms;
  };
  const onSet = () => {
    const t = ((parseInt(editH) || 0) * 3600 + (parseInt(editM) || 0) * 60 + (parseInt(editS) || 0)) * 1000;
    if (t > 0) applyTime(t);
    setEditMode(false);
  };

  const sf = split(swMs);
  const tf = split(tmMs);
  const swIdle = !swRun && swMs === 0;
  const tmIdle = !tmRun && !tmDone && tmMs === tmTotal;

  const bestLap = laps.length > 1 ? Math.min(...laps.map(l => l.ms)) : null;
  const worstLap = laps.length > 1 ? Math.max(...laps.map(l => l.ms)) : null;

  const swState = swIdle ? "i" : "a";
  const tmState = tmDone ? "d" : tmIdle ? "i" : "a";

  const swMinProgress = swMs % 60000 / 60000;
  const tmProgress = tmTotal > 0 ? tmMs / tmTotal : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .app {
          min-height: 100vh;
          background: #06060e;
          display: flex; flex-direction: column; align-items: center;
          padding: 2.5rem 1rem 4rem;
          font-family: 'Rajdhani', 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
          user-select: none;
        }

        /* ── Brand ─────────────────────────────── */
        .brand-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 2rem; }
        .brand { font-size: 11px; font-weight: 700; letter-spacing: .55em; color: rgba(251,146,60,.28); text-transform: uppercase; }
        .brand-line { width: 40px; height: 1px; background: rgba(251,146,60,.12); }

        /* ── Tabs ──────────────────────────────── */
        .tabs { display: flex; background: #0a0a18; border-radius: 50px; border: .5px solid #141430; padding: 3px; margin-bottom: 2.5rem; }
        .tab {
          padding: 8px 30px; border-radius: 50px; border: 1px solid transparent;
          background: transparent; cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 700;
          letter-spacing: .2em; text-transform: uppercase; color: #20203a;
          transition: all .25s ease;
        }
        .tab.on { background: #0e0e22; color: #fb923c; border-color: #222240; }
        .tab:hover:not(.on) { color: #36365a; }

        /* ── Dial ──────────────────────────────── */
        .dial {
          position: relative; width: 270px; height: 270px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 2.5rem;
        }
        .dial-glow {
          position: absolute; width: 150px; height: 150px; border-radius: 50%;
          background: radial-gradient(circle, rgba(251,146,60,.06) 0%, transparent 70%);
          pointer-events: none;
          transition: opacity .4s;
        }
        .dial-glow.dim { opacity: 0; }
        .dial-glow.done-glow { background: radial-gradient(circle, rgba(239,68,68,.08) 0%, transparent 70%); }
        .dnum { text-align: center; z-index: 1; }

        /* ── Time digits ───────────────────────── */
        .t-main {
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          font-size: 58px; line-height: 1; letter-spacing: .04em;
          transition: color .4s;
          font-variant-numeric: tabular-nums;
        }
        .t-main.a { color: #fb923c; }
        .t-main.i { color: #1c1008; }
        .t-main.d { color: #ef4444; animation: blink .85s step-start infinite; }
        .t-sub {
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          font-size: 20px; margin-top: 5px; letter-spacing: .06em;
          transition: color .4s;
        }
        .t-sub.a { color: #c2410c; }
        .t-sub.i { color: #120c05; }
        .t-sub.d { color: #ef4444; animation: blink .85s step-start infinite; }
        .t-lbl {
          font-size: 8px; font-weight: 700; letter-spacing: .4em;
          color: #1c1c2c; margin-top: 10px; text-transform: uppercase;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.1} }

        /* ── Done Banner ───────────────────────── */
        .done-banner {
          font-size: 11px; font-weight: 700; letter-spacing: .4em;
          color: #ef4444; margin-bottom: 1.5rem;
          animation: blink .85s step-start infinite;
          text-transform: uppercase;
        }

        /* ── Presets ───────────────────────────── */
        .presets { display: flex; gap: 8px; margin-bottom: 1.8rem; flex-wrap: wrap; justify-content: center; }
        .pbt {
          padding: 6px 14px; background: #0a0a18; border: .5px solid #141430;
          border-radius: 20px; cursor: pointer;
          font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: .14em; color: #22223a; text-transform: uppercase;
          transition: all .2s;
        }
        .pbt:hover { border-color: #202040; color: #404080; }
        .pbt.sel { background: #120d04; border-color: #362008; color: #fb923c; }
        .pbt.custom { border-style: dashed; }

        /* ── Edit Inputs ───────────────────────── */
        .ie { display: flex; align-items: center; gap: 4px; margin-bottom: 1.8rem; }
        .ii {
          width: 52px; background: #0a0a18; border: .5px solid #141430;
          border-radius: 8px; text-align: center;
          font-family: 'Share Tech Mono', monospace; font-size: 22px;
          color: #fb923c; padding: 8px 0; outline: none;
          transition: border-color .2s;
        }
        .ii:focus { border-color: rgba(251,146,60,.5); }
        .ii::placeholder { color: #1c1208; }
        .ic { font-family: 'Share Tech Mono', monospace; font-size: 22px; color: #1a1a2c; }
        .ib {
          padding: 8px 16px; background: #120d04; border: .5px solid #321c08;
          border-radius: 8px; color: #fb923c;
          font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 700;
          letter-spacing: .18em; text-transform: uppercase;
          cursor: pointer; margin-left: 8px; transition: all .2s;
        }
        .ib:hover { border-color: #6a3a10; }

        /* ── Controls ──────────────────────────── */
        .ctrls { display: flex; gap: 16px; align-items: center; margin-bottom: 2rem; }
        .cb {
          width: 56px; height: 56px; border-radius: 50%;
          background: #0a0a18; border: .5px solid #141430;
          cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
          color: #20203a; font-family: 'Rajdhani', sans-serif;
          font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          transition: all .2s;
        }
        .cb:hover:not(:disabled) { border-color: #202042; color: #40408a; background: #0d0d22; }
        .cb:disabled { opacity: .1; cursor: default; }
        .cp {
          width: 76px; height: 76px; border-radius: 50%;
          background: #110d04; border: 1.5px solid #221806;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #fb923c; transition: all .2s;
        }
        .cp:hover:not(:disabled) { background: #181204; border-color: #5a2c08; }
        .cp.on { border-color: #fb923c; box-shadow: 0 0 0 6px rgba(251,146,60,.06); }
        .cp:disabled { opacity: .15; cursor: default; }

        /* ── Lap List ──────────────────────────── */
        .laps { width: 100%; max-width: 270px; }
        .lhd {
          display: flex; justify-content: space-between;
          font-size: 8px; font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
          color: #16162a; padding: 0 2px 8px;
          border-bottom: .5px solid #0c0c1a; margin-bottom: 2px;
        }
        .lr {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 2px; border-bottom: .5px solid #08080e;
          animation: fu .22s ease;
        }
        @keyframes fu { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .ln { font-size: 10px; color: #18182c; letter-spacing: .1em; }
        .lt { font-family: 'Share Tech Mono', monospace; font-size: 14px; color: #383860; }
        .lt.best { color: #4ade80; }
        .lt.worst { color: #f87171; }
        .lap-badge {
          font-size: 8px; font-weight: 700; letter-spacing: .1em;
          padding: 2px 5px; border-radius: 3px;
          text-transform: uppercase;
        }
        .lap-badge.b { background: rgba(74,222,128,.08); color: #4ade80; }
        .lap-badge.w { background: rgba(248,113,113,.08); color: #f87171; }
      `}</style>

      <div className="app">
        {/* Brand */}
        <div className="brand-wrap">
          <div className="brand-line" />
          <div className="brand">Kronos</div>
          <div className="brand-line" />
        </div>

        {/* Mode Tabs */}
        <div className="tabs">
          <button className={`tab${tab === "sw" ? " on" : ""}`} onClick={() => setTab("sw")}>
            Stopwatch
          </button>
          <button className={`tab${tab === "tm" ? " on" : ""}`} onClick={() => setTab("tm")}>
            Timer
          </button>
        </div>

        {/* Dial */}
        <div className="dial">
          <DialRing
            size={270}
            progress={tab === "sw" ? swMinProgress : tmProgress}
            done={tab === "tm" && tmDone}
            inactive={tab === "sw" ? swIdle : tmIdle}
            mode={tab}
          />
          <div className={`dial-glow${swIdle && tab === "sw" ? " dim" : ""}${tmDone ? " done-glow" : ""}`} />
          <div className="dnum">
            {tab === "sw" ? (
              <>
                <div className={`t-main ${swState}`}>
                  {sf.h > 0 ? `${z(sf.h)}:${z(sf.m)}:${z(sf.s)}` : `${z(sf.m)}:${z(sf.s)}`}
                </div>
                <div className={`t-sub ${swState}`}>.{z(sf.cs)}</div>
                <div className="t-lbl">Stopwatch</div>
              </>
            ) : (
              <>
                <div className={`t-main ${tmState}`}>
                  {tf.h > 0 ? `${z(tf.h)}:${z(tf.m)}:${z(tf.s)}` : `${z(tf.m)}:${z(tf.s)}`}
                </div>
                <div className={`t-sub ${tmState}`}>.{z(tf.cs)}</div>
                <div className="t-lbl">Countdown</div>
              </>
            )}
          </div>
        </div>

        {/* Timer Done */}
        {tab === "tm" && tmDone && (
          <div className="done-banner">⏰ Time's Up</div>
        )}

        {/* Timer Config */}
        {tab === "tm" && (
          editMode ? (
            <div className="ie">
              <input className="ii" value={editH} onChange={e => setEditH(e.target.value)}
                maxLength={2} placeholder="HH" onKeyDown={e => e.key === "Enter" && onSet()} />
              <span className="ic">:</span>
              <input className="ii" value={editM} onChange={e => setEditM(e.target.value)}
                maxLength={2} placeholder="MM" onKeyDown={e => e.key === "Enter" && onSet()} />
              <span className="ic">:</span>
              <input className="ii" value={editS} onChange={e => setEditS(e.target.value)}
                maxLength={2} placeholder="SS" onKeyDown={e => e.key === "Enter" && onSet()} />
              <button className="ib" onClick={onSet}>Set</button>
            </div>
          ) : (
            <div className="presets">
              {PRESETS.map(p => (
                <button key={p.ms}
                  className={`pbt${tmTotal === p.ms && !tmDone ? " sel" : ""}`}
                  onClick={() => applyTime(p.ms)}>
                  {p.label}
                </button>
              ))}
              <button className="pbt custom" onClick={() => setEditMode(true)}>Custom</button>
            </div>
          )
        )}

        {/* Controls */}
        <div className="ctrls">
          {/* Reset */}
          <button className="cb" onClick={tab === "sw" ? swReset : tmReset}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Reset
          </button>

          {/* Start/Pause */}
          <button
            className={`cp${(swRun || tmRun) ? " on" : ""}`}
            onClick={tab === "sw" ? (swRun ? swPause : swStart) : tmToggle}
            disabled={tab === "tm" && tmDone}
          >
            {(tab === "sw" ? swRun : tmRun) ? (
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
              </svg>
            ) : (
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653z" />
              </svg>
            )}
          </button>

          {/* Lap (stopwatch) / spacer (timer) */}
          {tab === "sw" ? (
            <button className="cb" onClick={swLap} disabled={swMs === 0}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              Lap
            </button>
          ) : (
            <div style={{ width: 56 }} />
          )}
        </div>

        {/* Lap List */}
        {tab === "sw" && laps.length > 0 && (
          <div className="laps">
            <div className="lhd">
              <span>Lap</span>
              <span>Time</span>
            </div>
            {laps.map((l, i) => {
              const f = split(l.ms);
              const t = f.h > 0
                ? `${z(f.h)}:${z(f.m)}:${z(f.s)}.${z(f.cs)}`
                : `${z(f.m)}:${z(f.s)}.${z(f.cs)}`;
              const isBest = l.ms === bestLap;
              const isWorst = l.ms === worstLap;
              return (
                <div key={l.id} className="lr">
                  <span className="ln">#{z(laps.length - i)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isBest && <span className="lap-badge b">Best</span>}
                    {isWorst && <span className="lap-badge w">Slow</span>}
                    <span className={`lt${isBest ? " best" : isWorst ? " worst" : ""}`}>{t}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}