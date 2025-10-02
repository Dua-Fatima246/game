// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function App() {
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // --- Game states ---
  const [playerName, setPlayerName] = useState("");
  const [nameError, setNameError] = useState("");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasStarted, setHasStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [paused, setPaused] = useState(false);

  // Refs for objects
  const ballRef = useRef({ x: 100, y: 100, radius: 15, color: "#FFB84D" });
  const starsRef = useRef([]);
  const obstaclesRef = useRef([]);
  const keysRef = useRef({});
  const animRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const invulnerableRef = useRef(false);
  const levelUpTriggeredRef = useRef(false);
  const starSound = useRef(null);

  // ---------------- Validation ----------------
  const validateName = (name) => {
    if (!name || typeof name !== "string") return "Please enter a name";
    const trimmed = name.trim();
    if (trimmed.length < 3) return "Name must be at least 3 characters";
    if (trimmed.length > 16) return "Name must be at most 16 characters";
    if (!/^[-_A-Za-z0-9 ]+$/.test(trimmed)) return "Only letters, numbers, spaces, - and _ allowed";
    return "";
  };

  // ---------------- Level creation ----------------
  const createLevel = (lvl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    const starCount = Math.min(8, 3 + lvl + Math.floor(lvl / 2));
    const starColors = ["#FFE066", "#FF9CEE", "#79FFEF", "#A3FF7A", "#CBA6FF", "#FFD27A"];
    starsRef.current = Array.from({ length: starCount }, () => ({
      x: Math.random() * (W - 60) + 30,
      y: Math.random() * (H - 60) + 30,
      size: 16,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    const obsCount = Math.min(6, lvl);
    obstaclesRef.current = Array.from({ length: obsCount }, () => {
      const w = 40, h = 18;
      const x = Math.random() * (W - 2 * w) + w;
      const y = Math.random() * (H - 2 * h) + h;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 1.6 + lvl * 0.9 + Math.random() * 0.6;
      return { x, y, w, h, dx: dir * speed };
    });

    // reset ball
    ballRef.current.x = Math.round(W / 2);
    ballRef.current.y = Math.round(H - 40);
    setTimeLeft(30);
    invulnerableRef.current = true;
    levelUpTriggeredRef.current = false;
    setTimeout(() => (invulnerableRef.current = false), 700);
  };

  // ---------------- Responsive canvas ----------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setSize = () => {
      const w = Math.max(320, Math.min(window.innerWidth * 0.95, 900));
      const h = Math.floor(Math.max(240, w * 0.62));
      canvas.width = w; canvas.height = h;
      const b = ballRef.current;
      b.x = Math.max(b.radius, Math.min(canvas.width - b.radius, b.x));
      b.y = Math.max(b.radius, Math.min(canvas.height - b.radius, b.y));
    };
    setSize();
    window.addEventListener("resize", setSize);
    return () => window.removeEventListener("resize", setSize);
  }, []);

  // ---------------- Keyboard input ----------------
  useEffect(() => {
    const down = (e) => { keysRef.current[e.key] = true; };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ---------------- Timer ----------------
  useEffect(() => {
    if (!hasStarted || paused || gameOver) return;
    if (timerIntervalRef.current) return;
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          endGame("time");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [hasStarted, paused, gameOver]);

  // ---------------- Start / End ----------------
  const startGame = () => {
    const err = validateName(playerName);
    if (err) { setNameError(err); return; }
    setNameError("");
    setScore(0); setLevel(1); setGameOver(false); setPaused(false);
    setHasStarted(true);
    createLevel(1);
  };

  const endGame = async () => {
    setGameOver(true); setHasStarted(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }

    // submit score
    const name = playerName && !validateName(playerName) ? playerName.trim() : "Guest";
    try { await axios.post("/api/leaderboard", { name, score, level }); } catch (e) { console.warn(e); }

    // navigate to leaderboard page
    navigate("/leaderboard");
  };

  // ---------------- Main game loop ----------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let gradientShift = 0;

    const drawBackground = () => {
      gradientShift += 0.008;
      const g1 = `hsl(${(200 + gradientShift * 60) % 360},85%,95%)`;
      const g2 = `hsl(${(260 + gradientShift * 60) % 360},85%,88%)`;
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, g1); grad.addColorStop(1, g2);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawBall = () => {
      const b = ballRef.current;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill(); ctx.closePath();
    };

    const drawStars = () => {
      const b = ballRef.current, stars = starsRef.current;
      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        ctx.fillStyle = s.color;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const angle = (k * 4 * Math.PI) / 5 - Math.PI / 2;
          const x = s.x + s.size * Math.cos(angle);
          const y = s.y + s.size * Math.sin(angle);
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();

        const dx = b.x - s.x, dy = b.y - s.y;
        if (dx * dx + dy * dy < (b.radius + s.size / 2) ** 2) {
          setScore((p) => p + 10);
          stars.splice(i, 1);
          try { starSound.current.play(); } catch {}
        }
      }
      if (stars.length === 0 && !levelUpTriggeredRef.current) {
        levelUpTriggeredRef.current = true;
        setTimeout(() => {
          setLevel((l) => { createLevel(l + 1); return l + 1; });
        }, 600);
      }
    };

    const drawObstacles = () => {
      const b = ballRef.current, obs = obstaclesRef.current;
      for (let o of obs) {
        ctx.fillStyle = "#d9534f";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        o.x += o.dx;
        if (o.x <= 0 || o.x + o.w >= canvas.width) o.dx *= -1;
        const cx = Math.max(o.x, Math.min(b.x, o.x + o.w));
        const cy = Math.max(o.y, Math.min(b.y, o.y + o.h));
        const dx = b.x - cx, dy = b.y - cy;
        if (!invulnerableRef.current && dx * dx + dy * dy <= b.radius * b.radius) {
          endGame(); return;
        }
      }
    };

    const moveBall = () => {
      const b = ballRef.current;
      if (!hasStarted || paused || gameOver) return;
      const speed = 6 + level * 1.2;
      if (keysRef.current["ArrowUp"] || keysRef.current["w"]) b.y -= speed;
      if (keysRef.current["ArrowDown"] || keysRef.current["s"]) b.y += speed;
      if (keysRef.current["ArrowLeft"] || keysRef.current["a"]) b.x -= speed;
      if (keysRef.current["ArrowRight"] || keysRef.current["d"]) b.x += speed;
      b.x = Math.max(b.radius, Math.min(canvas.width - b.radius, b.x));
      b.y = Math.max(b.radius, Math.min(canvas.height - b.radius, b.y));
    };

    const loop = () => {
      animRef.current = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground(); drawStars(); drawObstacles(); moveBall(); drawBall();
    };

    if (!animRef.current) animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); animRef.current = null; };
  }, [hasStarted, paused, gameOver, level]);

  // ---------------- UI ----------------
  return (
    <div style={{ minHeight: "100vh", padding: 20, background: "linear-gradient(180deg,#f7fbff 0%, #f0f9ff 100%)" }}>
      <h1>🎈 Fun Ball Game</h1>

      {!hasStarted && !gameOver && (
        <div>
          <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Enter your name" />
          {nameError && <div style={{ color: "red" }}>{nameError}</div>}
          <button onClick={startGame}>Start Game</button>
        </div>
      )}

      <canvas ref={canvasRef} width={700} height={420} style={{ display: "block", margin: "20px auto" }} />

      {hasStarted && (
        <div>
          <p>Score: {score} | Level: {level} | Time: {timeLeft}s</p>
          <button onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
        </div>
      )}

      <audio ref={starSound} src="/star.mp3" preload="auto" />
    </div>
  );
}
