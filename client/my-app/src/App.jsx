import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import DailyChatReview from "./pages/DailyChatReview";
import Coupons from "./pages/Coupons";
import Workstreams from "./pages/Workstreams";
import Scanner from "./pages/Scanner";
import PreflightScanner from "./pages/PreflightScanner";

export default function App() {
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedMonth, setSelectedMonth] = useState("September 2026");

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          }
        />
        <Route
          path="/chat-review"
          element={
            <DailyChatReview
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          }
        />
        <Route
          path="/coupons"
          element={
            <Coupons
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          }
        />
        <Route
          path="/workstreams"
          element={
            <Workstreams
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          }
        />
        <Route
          path="/scanner"
          element={
            <Scanner
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          }
        />
        <Route
          path="/preflight"
          element={
            <PreflightScanner
              selectedRegion={selectedRegion}
              setSelectedRegion={setSelectedRegion}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
            />
          }
        />
      </Routes>
    </Router>
  );
}