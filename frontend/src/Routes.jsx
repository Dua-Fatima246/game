import React from "react";
import { Routes, Route } from "react-router-dom";
import Game from "./Game";
import Leaderboard from "./Leaderboard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Game />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
    </Routes>
  );
}
