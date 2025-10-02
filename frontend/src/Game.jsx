import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Game() {
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
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerEntry, setPlayerEntry] = useState(null);

  // --- Refs ---
  const ballRef = useRef({ x: 100, y: 100, radius: 16, color: "#dfb126ff", speed: 3 });
  const starsRef = useRef([]);
  const obstaclesRef = useRef([]);
  const keysRef = useRef({});
  const animRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const invulnerableRef = useRef(false);

  // --- Audio ---
  const starSound = useRef(null);
  const levelUpSound = useRef(null);
  const gameOverSound = useRef(null);

  useEffect(() => {
    starSound.current = new Audio("/star.mp3");
    levelUpSound.current = new Audio("/levelup.mp3");
    gameOverSound.current = new Audio("/gameover.mp3");
  }, []);

  // --- Validation ---
  const validateName = (name) => {
    if (!name || typeof name !== "string") return "Please enter a name";
    const trimmed = name.trim();
    if (trimmed.length < 3) return "Name must be at least 3 characters";
    if (trimmed.length > 16) return "Name must be at most 16 characters";
    if (!/^[-_A-Za-z0-9 ]+$/.test(trimmed))
      return "Only letters, numbers, spaces, - and _ allowed";
    return "";
  };

  // --- Initialize level ---
  const createLevel = (lvl) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;

    const starCount = Math.min(8, 3 + lvl + Math.floor(lvl / 2));
    const starColors = [
      "#ecbf09ff",
      "#f411ceff",
      "#79FFEF",
      "#A3FF7A",
      "#CBA6FF",
      "#FFD27A",
    ];
    starsRef.current = Array.from({ length: starCount }, () => ({
      x: Math.random() * (W - 40) + 20,
      y: Math.random() * (H - 40) + 20,
      size: 14,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    const obsCount = Math.min(6, lvl);
    obstaclesRef.current = Array.from({ length: obsCount }, () => {
      const w = 50,
        h = 20;
      const x = Math.random() * (W - 2 * w) + w;
      const y = Math.random() * (H - 2 * h) + h;
      const dir = Math.random() > 0.5 ? 1 : -1;
      const speed = 1.5 + lvl * 0.7 + Math.random() * 0.5;
      return { x, y, w, h, dx: dir * speed };
    });

    ballRef.current.x = W / 2;
    ballRef.current.y = H - 40;
    ballRef.current.speed = 3 + lvl * 0.5;

    setTimeLeft(30);
    invulnerableRef.current = true;
    setTimeout(() => (invulnerableRef.current = false), 700);
  };

  // --- Key handlers ---
  const handleKeyPress = (e) => {
    keysRef.current[e.key] = e.type === "keydown";
  };
  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("keyup", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("keyup", handleKeyPress);
    };
  }, []);

  // --- Movement ---
  const moveBall = () => {
    const ball = ballRef.current;
    if (keysRef.current["ArrowUp"] || keysRef.current["w"]) ball.y -= ball.speed;
    if (keysRef.current["ArrowDown"] || keysRef.current["s"]) ball.y += ball.speed;
    if (keysRef.current["ArrowLeft"] || keysRef.current["a"]) ball.x -= ball.speed;
    if (keysRef.current["ArrowRight"] || keysRef.current["d"]) ball.x += ball.speed;

    const canvas = canvasRef.current;
    if (!canvas) return;
    if (ball.x - ball.radius < 0) ball.x = ball.radius;
    if (ball.x + ball.radius > canvas.width) ball.x = canvas.width - ball.radius;
    if (ball.y - ball.radius < 0) ball.y = ball.radius;
    if (ball.y + ball.radius > canvas.height) ball.y = canvas.height - ball.radius;
  };

  // --- Collisions ---
  const checkCollisions = () => {
    const ball = ballRef.current;
    starsRef.current = starsRef.current.filter((star) => {
      const dist = Math.hypot(ball.x - star.x, ball.y - star.y);
      if (dist < ball.radius + star.size) {
        setScore((s) => s + 1);
        starSound.current?.play();
        return false;
      }
      return true;
    });

    obstaclesRef.current.forEach((obs) => {
      if (!invulnerableRef.current) {
        if (
          ball.x + ball.radius > obs.x &&
          ball.x - ball.radius < obs.x + obs.w &&
          ball.y + ball.radius > obs.y &&
          ball.y - ball.radius < obs.y + obs.h
        ) {
          gameOverSound.current?.play();
          endGame();
        }
      }
      obs.x += obs.dx;
      if (
        obs.x <= 0 ||
        obs.x + obs.w >= canvasRef.current.width
      )
        obs.dx *= -1;
    });

    if (starsRef.current.length === 0) {
      levelUpSound.current?.play();
      setLevel((l) => l + 1);
      createLevel(level + 1);
    }
  };

  // --- Timer ---
  useEffect(() => {
    if (!hasStarted || paused || gameOver) return;
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerIntervalRef.current);
          gameOverSound.current?.play();
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerIntervalRef.current);
  }, [hasStarted, paused, gameOver]);

  // --- Drawing ---
  const drawStar = (ctx, x, y, radius, color) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        x + radius * Math.cos((18 + i * 72) * (Math.PI / 180)),
        y - radius * Math.sin((18 + i * 72) * (Math.PI / 180))
      );
      ctx.lineTo(
        x + (radius / 2) * Math.cos((54 + i * 72) * (Math.PI / 180)),
        y - (radius / 2) * Math.sin((54 + i * 72) * (Math.PI / 180))
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const draw = (ctx) => {
    if (!ctx) return;
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    starsRef.current.forEach((star) => {
      drawStar(ctx, star.x, star.y, star.size, star.color);
    });

    obstaclesRef.current.forEach((obs) => {
      ctx.fillStyle = "#ff4d4d";
      ctx.shadowColor = "#ff4d4d";
      ctx.shadowBlur = 10;
      ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    });

    const ball = ballRef.current;
    ctx.fillStyle = ball.color;
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  };

  // --- Animation ---
  const animate = () => {
    if (!hasStarted || paused || gameOver) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    moveBall();
    checkCollisions();
    draw(ctx);
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (hasStarted && !paused) animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [hasStarted, paused, score, level]);

  // --- Live leaderboard sync ---
  useEffect(() => {
    if (!hasStarted || gameOver) return;
    const interval = setInterval(async () => {
      const name = playerName.trim() || "Guest";
      try {
        await axios.post("/api/leaderboard", { name, score, level });
        const res = await axios.get("/api/leaderboard");
        const sorted = (res.data || []).sort((a, b) => b.score - a.score);
        setLeaderboard(sorted);
        const entry = sorted.find(
          (item) =>
            item.name === name &&
            item.score === score &&
            item.level === level
        );
        if (entry) setPlayerEntry(entry);
      } catch (err) {
        console.warn("Live leaderboard error", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [hasStarted, gameOver, playerName, score, level]);

  // --- Start / End ---
  const startGame = () => {
    const err = validateName(playerName);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError("");
    setScore(0);
    setLevel(1);
    setTimeLeft(30);
    setHasStarted(true);
    setGameOver(false);
    createLevel(1);
  };

  const endGame = async () => {
    setGameOver(true);
    setHasStarted(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    const name = playerName.trim() || "Guest";
    try {
      await axios.post("/api/leaderboard", { name, score, level });
      const res = await axios.get("/api/leaderboard");
      const sorted = (res.data || []).sort((a, b) => b.score - a.score);
      setLeaderboard(sorted);
      const entry = sorted.find(
        (item) =>
          item.name === name &&
          item.score === score &&
          item.level === level
      );
      if (entry) setPlayerEntry(entry);
    } catch (err) {
      console.warn("Leaderboard error", err);
    }
  };

  // --- Touch controls ---
  const setVirtualKey = (key, val) => {
    keysRef.current[key] = val;
  };
  const touchBtnProps = (key) => ({
    onPointerDown: () => setVirtualKey(key, true),
    onPointerUp: () => setVirtualKey(key, false),
    onPointerLeave: () => setVirtualKey(key, false),
    onTouchStart: () => setVirtualKey(key, true),
    onTouchEnd: () => setVirtualKey(key, false),
  });

  // --- Styles & button style ---
  const btnStyle = {
    padding: "10px 18px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg,#6a11cb,#2575fc)",
    color: "#c2e8f3ff",
    fontWeight: 700,
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  return (
    <>
      {/* Inject animated-gradient keyframes */}
      <style>
        {`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animated-bg {
          background: linear-gradient(135deg, #daf28c, #9ffcc9, #a1c4fd, #c2e9fb);
          background-size: 300% 300%;
          animation: gradientShift 15s ease infinite;
        }
      `}
      </style>

      <div
        className="animated-bg"
        style={{
          minHeight: "100vh",
          padding: 20,
          fontFamily: "Inter, system-ui, Arial",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "flex-start",
          color: "#333",
          gap: 20,
        }}
      >
        {/* Left side (game area) */}
        <div
          style={{
            flex: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <h1
            style={{
              marginBottom: 12,
              textShadow: "2px 2px 10px rgba(0,0,0,0.3)",
              color: "#222",
            }}
          >
            🌟 Star Catcher
          </h1>

          {/* Game start screen */}
          {!hasStarted && !gameOver && (
            <div
              style={{
                marginBottom: 14,
                background: "rgba(255,255,255,0.8)",
                padding: 20,
                borderRadius: 16,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                style={{
                  padding: 10,
                  marginRight: 8,
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
              <button onClick={startGame} style={btnStyle}>
                Start Game
              </button>
              {nameError && (
                <div style={{ color: "red", marginTop: 6 }}>{nameError}</div>
              )}
            </div>
          )}

          {/* HUD */}
          {hasStarted && !gameOver && (
            <div
              style={{
                display: "flex",
                gap: 20,
                marginBottom: 12,
                fontWeight: "600",
                background: "rgba(255,255,255,0.7)",
                padding: "8px 16px",
                borderRadius: 12,
              }}
            >
              <div>👤 {playerName || "Guest"}</div>
              <div>⭐ {score}</div>
              <div>⬆️ Level {level}</div>
              <div>⏱ {timeLeft}s</div>
              <button
                onClick={() => setPaused(!paused)}
                style={btnStyle}
              >
                {paused ? "▶️ Resume" : "⏸ Pause"}
              </button>
            </div>
          )}

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={720}
            height={420}
            style={{
              border: "3px solid rgba(255,255,255,0.6)",
              borderRadius: 16,
              background: "rgba(255,255,255,0.3)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              marginBottom: 12,
            }}
          />

          {/* Mobile touch controls */}
          {hasStarted && !gameOver && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "56px 56px 56px",
                gap: 6,
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <div
                {...touchBtnProps("ArrowUp")}
                style={{
                  background: "#eee",
                  textAlign: "center",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                ↑
              </div>
              <div></div>
              <div></div>
              <div
                {...touchBtnProps("ArrowLeft")}
                style={{
                  background: "#eee",
                  textAlign: "center",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                ←
              </div>
              <div
                {...touchBtnProps("ArrowDown")}
                style={{
                  background: "#eee",
                  textAlign: "center",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                ↓
              </div>
              <div
                {...touchBtnProps("ArrowRight")}
                style={{
                  background: "#eee",
                  textAlign: "center",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                →
              </div>
            </div>
          )}

          {/* Game Over */}
          {gameOver && (
            <div
              style={{
                textAlign: "center",
                background: "rgba(255,255,255,0.85)",
                padding: 24,
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                marginTop: 20,
              }}
            >
              <h2>💥 Game Over</h2>
              <p>
                Score: {score} | Level: {level}
              </p>
              <button
                onClick={() => window.location.reload()}
                style={btnStyle}
              >
                🔄 Play Again
              </button>
            </div>
          )}
        </div>

        {/* Right side (leaderboard) */}
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.8)",
            padding: 24,
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            height: "fit-content",
          }}
        >
          <h3
            style={{
              textAlign: "center",
              marginBottom: 12,
              color: "#222",
            }}
          >
            🏆 Leaderboard
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <thead
              style={{
                background: "linear-gradient(135deg,#6a11cb,#2575fc)",
                color: "#fff",
              }}
            >
              <tr>
                <th style={{ padding: 8 }}>Rank</th>
                <th style={{ padding: 8 }}>Name</th>
                <th style={{ padding: 8 }}>Score</th>
                <th style={{ padding: 8 }}>Level</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    style={{ textAlign: "center", padding: 12 }}
                  >
                    No scores yet
                  </td>
                </tr>
              )}
              {leaderboard.map((item, idx) => {
                const isCurrentPlayer =
                  playerEntry &&
                  item.name === playerEntry.name &&
                  item.score === playerEntry.score &&
                  item.level === playerEntry.level;
                return (
                  <tr
                    key={idx}
                    style={{
                      textAlign: "center",
                      background: isCurrentPlayer
                        ? "rgba(255, 223, 0, 0.6)"
                        : idx % 2
                        ? "rgba(0,0,0,0.05)"
                        : "transparent",
                      fontWeight: isCurrentPlayer ? "bold" : "normal",
                      boxShadow: isCurrentPlayer
                        ? "0 0 12px 4px rgba(255, 215, 0, 0.9)"
                        : "none",
                      transition: "all 0.3s ease-in-out",
                    }}
                  >
                    <td style={{ padding: 8 }}>{idx + 1}</td>
                    <td style={{ padding: 8 }}>{item.name}</td>
                    <td style={{ padding: 8 }}>{item.score}</td>
                    <td style={{ padding: 8 }}>{item.level}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
