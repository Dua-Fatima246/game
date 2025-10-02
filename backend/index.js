import express from "express";
import cors from "cors";
import mongoose from "mongoose";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection (Corrected URI — single line)
mongoose
  .connect("mongodb+srv://sitara:Pakistan@cluster0.bunqn28.mongodb.net/playing?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Leaderboard Schema
const leaderboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  level: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Indexes for faster queries
leaderboardSchema.index({ score: -1, level: -1 });
leaderboardSchema.index({ name: 1 });

const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);

// ---------------------
// 📌 GET - Fetch leaderboard
// ---------------------
app.get("/api/leaderboard", async (req, res) => {
  try {
    const leaderboard = await Leaderboard.find().sort({ score: -1, level: -1 });
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 POST - Add new entry
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { name, score, level } = req.body;
    const newEntry = new Leaderboard({ name, score, level });
    await newEntry.save();
    res.json({ success: true, newEntry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 PUT - Update existing player’s score/level
app.put("/api/leaderboard/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const { score, level } = req.body;

    const updatedPlayer = await Leaderboard.findOneAndUpdate(
      { name },
      { $set: { score, level, date: new Date() } },
      { new: true, upsert: true } // upsert = create if not found
    );

    res.json({ success: true, updatedPlayer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 DELETE - Remove a specific player
app.delete("/api/leaderboard/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const deleted = await Leaderboard.findOneAndDelete({ name });

    if (!deleted) {
      return res.status(404).json({ error: "Player not found" });
    }

    res.json({ success: true, message: `${name} deleted`, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 DELETE - Clear entire leaderboard
app.delete("/api/leaderboard", async (req, res) => {
  try {
    await Leaderboard.deleteMany({});
    res.json({ success: true, message: "Leaderboard cleared" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------
// ✅ Start Server
// ---------------------
const PORT = 5001;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
