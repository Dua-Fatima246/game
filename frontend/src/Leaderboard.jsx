import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

export default function Leaderboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScore, setNewScore] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [editId, setEditId] = useState(null);
  const pollRef = useRef(null);

  // Fetch scores (GET)
  const fetchScores = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/leaderboard");
      setScores(Array.isArray(res.data) ? res.data : []);
    } catch {
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  // Submit new score (POST)
  const submitScore = async () => {
    if (!newName || !newScore) return;
    try {
      await axios.post("/api/leaderboard", {
        name: newName,
        score: parseInt(newScore, 10),
        level: parseInt(newLevel || 1, 10),
      });
      setNewName("");
      setNewScore("");
      setNewLevel("");
      fetchScores();
    } catch (err) {
      console.error("Failed to submit score", err);
    }
  };

  // Update score (PUT)
  const updateScore = async () => {
    if (!editId) return;
    try {
      await axios.put(`/api/leaderboard/${editId}`, {
        score: parseInt(newScore, 10),
        level: parseInt(newLevel || 1, 10),
      });
      setEditId(null);
      setNewScore("");
      setNewLevel("");
      fetchScores();
    } catch (err) {
      console.error("Failed to update score", err);
    }
  };

  useEffect(() => {
    fetchScores();
    pollRef.current = setInterval(fetchScores, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "Inter, system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>🏆 Leaderboard</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/"><button>🎮 Play Again</button></Link>
          <button onClick={fetchScores}>Refresh</button>
        </div>
      </header>

      {/* Add / Update Score Form */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <input
          placeholder="Name"
          value={newName}
          disabled={!!editId} // prevent changing name during edit
          onChange={(e) => setNewName(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Score"
          value={newScore}
          onChange={(e) => setNewScore(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          placeholder="Level"
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
          style={{ marginRight: 8 }}
        />
        {editId ? (
          <button onClick={updateScore}>Update Score</button>
        ) : (
          <button onClick={submitScore}>Add Score</button>
        )}
      </div>

      {/* Leaderboard Table */}
      <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f3f4f6" }}>
            <th>#</th><th>Name</th><th>Score</th><th>Level</th><th>When</th><th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan="6" style={{ textAlign: "center" }}>Loading…</td></tr>
          ) : scores.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: "center" }}>No scores yet</td></tr>
          ) : (
            scores
              .slice()
              .sort((a, b) => (b.score || 0) - (a.score || 0))
              .map((r, i) => (
                <tr key={r._id || i}>
                  <td>{i + 1}</td>
                  <td>{r.name || "Guest"}</td>
                  <td>{r.score}</td>
                  <td>{r.level}</td>
                  <td>{r.date ? new Date(r.date).toLocaleString() : "-"}</td>
                  <td>
                    <button
                      onClick={() => {
                        setEditId(r._id);
                        setNewName(r.name);
                        setNewScore(r.score);
                        setNewLevel(r.level);
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              ))
          )}
        </tbody>
      </table>
    </div>
  );
}
