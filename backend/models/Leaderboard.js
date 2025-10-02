import mongoose from "mongoose";

// Define schema
const leaderboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  level: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

// Indexes for performance
leaderboardSchema.index({ score: -1, level: -1 });
leaderboardSchema.index({ name: 1 });

// Export model
const Leaderboard = mongoose.model("Leaderboard", leaderboardSchema);
export default Leaderboard;
