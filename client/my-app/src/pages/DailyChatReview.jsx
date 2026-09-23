import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  Calendar,
  Sparkles,
  Save,
  User,
  Trash2,
  Sun,
  Moon,
  ListChecks,
  Image as ImageIcon,
  Loader2,
  Settings,
  MessageSquare,
  X,
  Copy,
  Check,
  FileCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export default function DailyChatReview({
  selectedRegion,
  setSelectedRegion,
  selectedMonth,
  setSelectedMonth,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];

  const [reviewDate, setReviewDate] = useState(todayStr);
  const [sourceType, setSourceType] = useState("Morning");

  // Image Paste State
  const [pastedImage, setPastedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Dynamic Rule Controls (Includes updated VIP list)
  const [vipOpeners, setVipOpeners] = useState([
    "Yahia Ashour",
    "Mohamed Kameh",
    "Ali Shaaban",
    "Mohammed Amreey",
    "Akshat Jain",
    "Sushant Singh",
    "Rana Khalifa",
    "Al Fayad Nizamdeen",
  ]);
  const [campaignKeywords, setCampaignKeywords] = useState([
    "Coupon",
    "Festival",
    "Sale",
    "Launch",
    "Discount",
    "QC",
    "CMS",
    "Offer",
    "Deal",
    "FC27",
    "EXTRA",
  ]);
  const [customPrompt, setCustomPrompt] = useState(
    "Identify commercial risks, stock/checkout bugs, and upcoming sales campaigns."
  );
  const [showSettings, setShowSettings] = useState(false);

  // Generated Table State
  const [generatedThreads, setGeneratedThreads] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  // Saved Items State & Hide "Done" Filter Toggle
  const [savedPriorities, setSavedPriorities] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showDoneItems, setShowDoneItems] = useState(false);

  // Thread Deep-Dive Modal State
  const [activeModalItem, setActiveModalItem] = useState(null);
  const [rawThreadText, setRawThreadText] = useState("");
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [threadAnalysis, setThreadAnalysis] = useState(null);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  // Clipboard Image Paste Listener
  useEffect(() => {
    const handlePaste = (e) => {
      if (activeModalItem) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (event) => {
            setPastedImage(event.target.result);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [activeModalItem]);

  // Fetch Saved Items from MongoDB
  const fetchSavedPriorities = async () => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/chat-review?date=${reviewDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setSavedPriorities(data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchSavedPriorities();
  }, [reviewDate]);

  // Send Screenshot to Gemini Vision API
  const handleAnalyzeWithGemini = async () => {
    if (!pastedImage) return;

    setIsAnalyzing(true);
    setGeneratedThreads([]);

    try {
      const res = await fetch("http://localhost:5000/api/chat-review/scan-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: pastedImage,
          vipList: vipOpeners,
          campaignKeywords: campaignKeywords,
          customPrompt,
        }),
      });

      const data = await res.json();

      if (res.ok && data.results) {
        setGeneratedThreads(data.results);
        setSelectedIndices(new Set(data.results.map((_, i) => i)));
      } else {
        alert(`Gemini AI Error: ${data.message || "Failed to analyze image"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Gemini AI backend service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSelectCard = (index) => {
    const updated = new Set(selectedIndices);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setSelectedIndices(updated);
  };

  // Save Generated Items to MongoDB
  const handleSaveToDatabase = async () => {
    if (selectedIndices.size === 0) return;

    setIsSaving(true);
    const itemsToSave = Array.from(selectedIndices).map((idx) => {
      const item = generatedThreads[idx];
      const calculatedPriority =
        item.priorityLevel ||
        (vipOpeners.some((v) => item.openerName?.toLowerCase().includes(v.toLowerCase()))
          ? "Priority 1 (VIP Opener)"
          : campaignKeywords.some((k) => item.threadTitle?.toLowerCase().includes(k.toLowerCase()))
          ? "Priority 2 (Campaign / Event)"
          : "Priority 3 (General Check)");

      return {
        reviewDate,
        sourceType,
        threadTitle: item.threadTitle,
        openerName: item.openerName,
        priorityLevel: calculatedPriority,
        market: item.market || "AE/SA",
        whyItMatters: item.whyItMatters,
        commercialQuestion: item.commercialIdea,
        status: "Pending",
      };
    });

    try {
      const res = await fetch("http://localhost:5000/api/chat-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });

      if (res.ok) {
        setPastedImage(null);
        setGeneratedThreads([]);
        setSelectedIndices(new Set());
        fetchSavedPriorities();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`http://localhost:5000/api/chat-review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setSavedPriorities((prev) =>
          prev.map((item) =>
            (item._id || item.id) === id ? { ...item, status: newStatus } : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Item with Confirmation Alert
  const handleDeleteItem = async (id, threadTitle) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${threadTitle || "this item"}"?`
    );
    if (!isConfirmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/chat-review/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedPriorities((prev) =>
          prev.filter((item) => (item._id || item.id) !== id)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Deep-Dive Modal
  const openDeepDiveModal = (item) => {
    setActiveModalItem(item);
    setRawThreadText(item.rawThreadText || "");
    setThreadAnalysis(item.threadAnalysis || null);
    setCopiedResponse(false);
  };

  // Run AI Summary on Pasted Chat Text
  const handleAnalyzeThreadText = async () => {
    if (!rawThreadText.trim() || !activeModalItem) return;

    setIsAnalyzingText(true);

    try {
      const res = await fetch(
        "http://localhost:5000/api/chat-review/analyze-thread-text",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadText: rawThreadText,
            threadTitle: activeModalItem.threadTitle,
            openerName: activeModalItem.openerName,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.analysis) {
        setThreadAnalysis(data.analysis);
      } else {
        alert(data.message || "Failed to analyze chat text.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting Gemini AI backend service.");
    } finally {
      setIsAnalyzingText(false);
    }
  };

  // Save Deep-Dive Analysis directly to MongoDB Row
  const handleSaveAnalysisToRow = async () => {
    if (!activeModalItem || !threadAnalysis) return;

    const itemId = activeModalItem._id || activeModalItem.id;
    setIsSavingAnalysis(true);

    try {
      const res = await fetch(`http://localhost:5000/api/chat-review/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawThreadText,
          threadAnalysis,
        }),
      });

      if (res.ok) {
        const updatedItem = await res.json();
        setSavedPriorities((prev) =>
          prev.map((item) =>
            (item._id || item.id) === itemId ? updatedItem : item
          )
        );
        setActiveModalItem(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save analysis to database.");
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  // Filtered Saved Items Logic
  const doneCount = savedPriorities.filter((item) => item.status === "Done").length;
  const displayedSavedPriorities = showDoneItems
    ? savedPriorities
    : savedPriorities.filter((item) => item.status !== "Done");

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans antialiased text-gray-800">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header
          title="Daily Chat Review — Gemini AI"
          subtitle="Paste chat screenshots (Ctrl+V) to generate priority tables with AI context"
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="p-4 sm:p-8 max-w-7xl space-y-6">
          {/* Top Control Bar */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button
                  onClick={() => setSourceType("Morning")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    sourceType === "Morning"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> Morning
                </button>
                <button
                  onClick={() => setSourceType("EOD")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    sourceType === "EOD"
                      ? "bg-white text-gray-900 shadow-2xs"
                      : "text-gray-500"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-indigo-500" /> EOD
                </button>
              </div>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all"
                title="Edit Priority Rules & Prompts"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Prompt Settings Drawer */}
          {showSettings && (
            <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-2xs space-y-4">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-500" /> Custom Rules & AI Prompt Settings
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Priority 1: VIP Openers (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={vipOpeners.join(", ")}
                    onChange={(e) =>
                      setVipOpeners(e.target.value.split(",").map((s) => s.trim()))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Priority 2: Campaign Keywords (Comma Separated)
                  </label>
                  <input
                    type="text"
                    value={campaignKeywords.join(", ")}
                    onChange={(e) =>
                      setCampaignKeywords(e.target.value.split(",").map((s) => s.trim()))
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  />
                </div>

                <div className="col-span-full">
                  <label className="font-bold text-gray-700 block mb-1">
                    Gemini AI Strategic Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paste Screenshot Box */}
          <div className="bg-white p-6 rounded-3xl border border-dashed border-gray-300 shadow-2xs space-y-4 text-center">
            {pastedImage ? (
              <div className="space-y-4">
                <div className="relative inline-block max-h-72 overflow-hidden rounded-2xl border border-gray-200 shadow-md">
                  <img
                    src={pastedImage}
                    alt="Pasted Screenshot"
                    className="max-h-72 object-contain"
                  />
                  <button
                    onClick={() => setPastedImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 text-white rounded-full hover:bg-black"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleAnalyzeWithGemini}
                    disabled={isAnalyzing}
                    className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xs transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gemini AI Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Priority Table with Gemini
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 space-y-2 cursor-pointer">
                <ImageIcon className="w-12 h-12 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-900">
                  Paste Chat Screenshot Here (Press Ctrl+V or Cmd+V)
                </h4>
                <p className="text-xs text-gray-400">
                  Directly paste your Google Chat screenshot to auto-generate priority tasks.
                </p>
              </div>
            )}
          </div>

          {/* Gemini AI Generated Priority Table */}
          {generatedThreads.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Gemini Priority Analysis ({generatedThreads.length} Threads)
                  </h3>
                  <p className="text-xs text-gray-400">
                    Review generated context and commercial ideas before saving to MongoDB.
                  </p>
                </div>

                <button
                  onClick={handleSaveToDatabase}
                  disabled={selectedIndices.size === 0 || isSaving}
                  className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-2.5 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xs transition-all disabled:opacity-40 shrink-0"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  Save ({selectedIndices.size}) to MongoDB List
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-3 w-8">Select</th>
                      <th className="p-3">Priority Level</th>
                      <th className="p-3">Opener & Thread</th>
                      <th className="p-3">Market</th>
                      <th className="p-3">Context & Why It Matters</th>
                      <th className="p-3">Commercial Action / Idea</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium">
                    {generatedThreads.map((thread, idx) => {
                      const isSelected = selectedIndices.has(idx);

                      const priorityTag =
                        thread.priorityLevel ||
                        (vipOpeners.some((v) => thread.openerName?.toLowerCase().includes(v.toLowerCase()))
                          ? "Priority 1 (VIP Opener)"
                          : campaignKeywords.some((k) => thread.threadTitle?.toLowerCase().includes(k.toLowerCase()))
                          ? "Priority 2 (Campaign / Event)"
                          : "Priority 3 (General Check)");

                      const isVip = priorityTag.includes("VIP") || priorityTag.includes("Priority 1");
                      const isCampaign = priorityTag.includes("Campaign") || priorityTag.includes("Priority 2");

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-amber-50/40 transition-colors ${
                            isSelected ? "bg-amber-50/20" : ""
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectCard(idx)}
                              className="w-4 h-4 rounded-md text-amber-500 focus:ring-amber-400 cursor-pointer"
                            />
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold block text-center ${
                                isVip
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isCampaign
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {priorityTag}
                            </span>
                          </td>

                          <td className="p-3 space-y-0.5">
                            <span className="font-bold text-gray-900 block">
                              {thread.threadTitle}
                            </span>
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-amber-500" /> {thread.openerName}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 font-extrabold text-[10px] text-gray-700">
                              {thread.market || "AE/SA"}
                            </span>
                          </td>

                          <td className="p-3 text-gray-600 leading-relaxed max-w-xs">
                            {thread.whyItMatters}
                          </td>

                          <td className="p-3 text-amber-900 font-medium leading-relaxed max-w-xs bg-amber-50/50 rounded-xl">
                            {thread.commercialIdea}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Saved Commercial Discussion List */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-emerald-500" />
                  Saved Commercial Discussion List ({displayedSavedPriorities.length})
                </h3>
                <p className="text-xs text-gray-400">
                  Track and manage saved priorities in MongoDB for date: {reviewDate}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Show/Hide Completed "Done" Toggle Button */}
                {doneCount > 0 && (
                  <button
                    onClick={() => setShowDoneItems(!showDoneItems)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      showDoneItems
                        ? "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"
                        : "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                    }`}
                  >
                    {showDoneItems ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                        Hide Done ({doneCount})
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        Show Done ({doneCount})
                      </>
                    )}
                  </button>
                )}

                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-xl">
                  {reviewDate}
                </span>
              </div>
            </div>

            {displayedSavedPriorities.length === 0 ? (
              <div className="text-center py-10 text-xs font-medium text-gray-400">
                {doneCount > 0 && !showDoneItems
                  ? `All items for ${reviewDate} are marked as Done. Click "Show Done (${doneCount})" above to view them.`
                  : `No saved commercial priorities for ${reviewDate}. Paste a screenshot above to generate priorities.`}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="p-3">Priority Level</th>
                      <th className="p-3">Opener & Thread</th>
                      <th className="p-3">Market</th>
                      <th className="p-3">Context & Why It Matters</th>
                      <th className="p-3">Commercial Action / Idea</th>
                      <th className="p-3">Deep Dive</th>
                      <th className="p-3">Status / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium">
                    {displayedSavedPriorities.map((item) => {
                      const itemId = item._id || item.id;

                      const priorityTag =
                        item.priorityLevel ||
                        (vipOpeners.some((v) => item.openerName?.toLowerCase().includes(v.toLowerCase()))
                          ? "Priority 1 (VIP Opener)"
                          : campaignKeywords.some((k) => item.threadTitle?.toLowerCase().includes(k.toLowerCase()))
                          ? "Priority 2 (Campaign / Event)"
                          : "Priority 3 (General Check)");

                      const isVip = priorityTag.includes("VIP") || priorityTag.includes("Priority 1");
                      const isCampaign = priorityTag.includes("Campaign") || priorityTag.includes("Priority 2");
                      const hasAnalysisSaved = Boolean(item.threadAnalysis?.executiveSummary);
                      const isDone = item.status === "Done";

                      return (
                        <tr
                          key={itemId}
                          className={`hover:bg-gray-50/60 transition-colors ${
                            isDone ? "opacity-60 bg-gray-50/40" : ""
                          }`}
                        >
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold block text-center ${
                                isVip
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isCampaign
                                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {priorityTag}
                            </span>
                          </td>

                          <td className="p-3 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-bold block ${
                                  isDone ? "line-through text-gray-500" : "text-gray-900"
                                }`}
                              >
                                {item.threadTitle}
                              </span>
                              {item.sourceType && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                                  {item.sourceType}
                                </span>
                              )}
                              {hasAnalysisSaved && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                  <FileCheck className="w-2.5 h-2.5" /> AI Notes
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <User className="w-3 h-3 text-amber-500" />{" "}
                              {item.openerName || "Team"}
                            </span>
                          </td>

                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 font-extrabold text-[10px] text-gray-700">
                              {item.market || "AE/SA"}
                            </span>
                          </td>

                          <td className="p-3 text-gray-600 leading-relaxed max-w-xs">
                            {item.whyItMatters}
                          </td>

                          <td className="p-3 text-amber-900 font-medium leading-relaxed max-w-xs bg-amber-50/50 rounded-xl">
                            {item.commercialQuestion || item.commercialIdea}
                          </td>

                          <td className="p-3">
                            <button
                              onClick={() => openDeepDiveModal(item)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs ${
                                hasAnalysisSaved
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-amber-400 hover:bg-amber-500 text-gray-950"
                              }`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {hasAnalysisSaved ? "View / Edit Notes" : "Analyze & Reply"}
                            </button>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={item.status}
                                onChange={(e) =>
                                  handleStatusChange(itemId, e.target.value)
                                }
                                className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Discussed">Discussed</option>
                                <option value="Done">Done</option>
                                <option value="Carried Forward">Carry Forward</option>
                              </select>

                              <button
                                onClick={() => handleDeleteItem(itemId, item.threadTitle)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                                title="Delete Priority Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Full Thread Text Analysis Modal Drawer */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Thread Deep Dive Analysis
                </span>
                <h3 className="text-base font-bold">
                  {activeModalItem.threadTitle}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 text-gray-400 hover:text-white rounded-full bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div>
                <label className="font-bold text-gray-900 block mb-2">
                  Paste Full Copied Chat Transcript / Messages Below:
                </label>
                <textarea
                  rows={5}
                  value={rawThreadText}
                  onChange={(e) => setRawThreadText(e.target.value)}
                  placeholder="Select all messages in the Google Chat / Slack thread, copy, and paste here..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleAnalyzeThreadText}
                  disabled={isAnalyzingText || !rawThreadText.trim()}
                  className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-6 py-2.5 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xs transition-all disabled:opacity-50"
                >
                  {isAnalyzingText ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing Conversation...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Summarize & Generate Action Strategy
                    </>
                  )}
                </button>
              </div>

              {/* AI Analysis Output */}
              {threadAnalysis && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                    <h4 className="font-bold text-amber-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Executive Context Summary
                    </h4>
                    <p className="text-amber-900 leading-relaxed font-medium">
                      {threadAnalysis.executiveSummary}
                    </p>
                  </div>

                  {threadAnalysis.keyTakeaways?.length > 0 && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                      <h4 className="font-bold text-gray-900 uppercase tracking-wider text-[11px]">
                        Key Takeaways & Points Discussed
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-700 font-medium">
                        {threadAnalysis.keyTakeaways.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {threadAnalysis.potentialRisksOrBlockers && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                      <h4 className="font-bold text-rose-900 uppercase tracking-wider text-[11px]">
                        Risks or Action Blockers Identified
                      </h4>
                      <p className="text-rose-900 font-medium">
                        {threadAnalysis.potentialRisksOrBlockers}
                      </p>
                    </div>
                  )}

                  {threadAnalysis.recommendedActionOrReply && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-[11px]">
                          Recommended Response / Action Strategy
                        </h4>
                        <button
                          onClick={() => copyToClipboard(threadAnalysis.recommendedActionOrReply)}
                          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          {copiedResponse ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Response
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-emerald-900 font-semibold leading-relaxed bg-white/70 p-3 rounded-xl border border-emerald-200">
                        "{threadAnalysis.recommendedActionOrReply}"
                      </p>
                    </div>
                  )}

                  {/* Save Analysis to Row Button */}
                  <div className="flex justify-end pt-3 border-t border-gray-100">
                    <button
                      onClick={handleSaveAnalysisToRow}
                      disabled={isSavingAnalysis}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-2xs transition-all disabled:opacity-50"
                    >
                      {isSavingAnalysis ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving Notes...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Analysis Notes to Row
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}