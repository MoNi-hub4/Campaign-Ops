import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  Globe,
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  ImageIcon,
  Maximize2,
  X,
  FileText,
  Camera,
  Trash2,
  ExternalLink,
} from "lucide-react";

export default function PreflightScanner({
  selectedRegion,
  setSelectedRegion,
  selectedMonth,
  setSelectedMonth,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const [isCapturing, setIsCapturing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Fetch all saved URL scans from Database on mount
  const fetchScans = async () => {
    try {
      const res = await fetch("/api/preflight");
      if (res.ok) {
        const data = await res.json();
        setScans(data);
        if (data.length > 0 && !selectedScan) {
          setSelectedScan(data[0]);
          setUrlInput(data[0].targetUrl || "");
        }
      }
    } catch (err) {
      console.error("Fetch scans error:", err);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  // Reset search results whenever a different saved URL entry is clicked
  const handleSelectScan = (scan) => {
    setSelectedScan(scan);
    setUrlInput(scan.targetUrl || "");
    setSearchResults(null); // Clear previous URL's search filter
  };

  // Run Playwright Capture & Save to DB with detailed error parsing
  const handleCapturePage = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsCapturing(true);
    setSearchResults(null);
    setStatusMessage("Capturing module sections & sliders via Playwright...");

    try {
      const captureRes = await fetch("/api/preflight/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      const data = await captureRes.json();

      if (!captureRes.ok) {
        throw new Error(
          data.message || data.error || "Capture failed on server",
        );
      }

      setScans((prev) => [data, ...prev]);
      setSelectedScan(data);
      setUrlInput(data.targetUrl || urlInput);
      setStatusMessage("Capture completed and stored in database!");
    } catch (err) {
      console.error("Capture Error:", err);
      alert(`Capture Error: ${err.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Run OCR Keyword Search specifically scoped to the active URL
  const handleSearchKeyword = async (e) => {
    e.preventDefault();
    if (!keywordInput.trim()) return;

    setIsSearching(true);
    setStatusMessage(`Searching "${keywordInput}" in selected URL...`);

    try {
      const searchRes = await fetch("/api/preflight/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keywordInput,
          urlFolderName: selectedScan?.urlFolderName || "", // Scopes search strictly to selected URL
        }),
      });

      const searchData = await searchRes.json();

      if (!searchRes.ok) {
        throw new Error(searchData.message || "Search failed");
      }

      setSearchResults(searchData.report);
      setStatusMessage("OCR search finished!");
    } catch (err) {
      console.error("Search Error:", err);
      alert(`Search error: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteScan = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this saved URL scan from database?")) return;

    try {
      const res = await fetch(`/api/preflight/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updated = scans.filter((s) => (s._id || s.id) !== id);
        setScans(updated);
        if ((selectedScan?._id || selectedScan?.id) === id) {
          const nextScan = updated[0] || null;
          setSelectedScan(nextScan);
          setUrlInput(nextScan?.targetUrl || "");
          setSearchResults(null);
        }
      }
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  // Filter search results so only matches belonging to the selected URL card are shown
  const displayedImages = searchResults
    ? searchResults.matches
        .filter((match) => {
          if (!selectedScan?.urlFolderName) return true;
          return (
            match.websiteFolder?.toLowerCase() ===
            selectedScan.urlFolderName.toLowerCase()
          );
        })
        .map((match) => ({
          filename: match.filename,
          path: match.relativeScreenshotPath,
          text: match.detectedText,
          type: match.matchType || "OCR Match",
          source: match.websiteFolder,
          isMatch: true,
        }))
    : (selectedScan?.captures || []).map((cap) => ({
        filename: cap.moduleName || cap.sectionId,
        path: cap.screenshotPath,
        text: cap.text,
        type: cap.moduleType || "Module Section",
        source: cap.sectionId,
        isMatch: false,
      }));

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans antialiased text-gray-800">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header
          title="Preflight Automated Scanner"
          subtitle="Database-backed website scanner & OCR keyword matching"
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          actionText="New Scan"
          onActionClick={() => {
            setUrlInput("");
            setSelectedScan(null);
            setSearchResults(null);
            document.getElementById("preflight-url-input")?.focus();
          }}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="p-4 sm:p-8 max-w-7xl space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
            <form
              onSubmit={handleCapturePage}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Globe className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                <input
                  id="preflight-url-input"
                  type="text"
                  required
                  placeholder="Enter target URL to capture (e.g. noon.com)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <button
                type="submit"
                disabled={isCapturing || isSearching}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs transition-all disabled:opacity-50 shrink-0"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-yellow-400" />
                    Capture & Store Page
                  </>
                )}
              </button>
            </form>

            <form
              onSubmit={handleSearchKeyword}
              className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-100"
            >
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                <input
                  type="text"
                  required
                  placeholder="Search keyword inside captured images..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <button
                type="submit"
                disabled={isCapturing || isSearching}
                className="bg-amber-400 hover:bg-amber-500 text-gray-950 font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs transition-all disabled:opacity-50 shrink-0"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching OCR...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Search Keyword
                  </>
                )}
              </button>
            </form>
          </div>

          {(isCapturing || isSearching) && (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2 shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {scans.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
              <ImageIcon className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-gray-900">
                No Database Scans Found
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                Capture a webpage URL above to save screenshots to the database.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              {/* URL History Sidebar */}
              <div className="bg-white rounded-3xl border border-gray-200/80 p-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-3">
                  Scanned URLs ({scans.length})
                </h4>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {scans.map((scan) => {
                    const scanId = scan._id || scan.id;
                    const isSelected =
                      (selectedScan?._id || selectedScan?.id) === scanId;

                    return (
                      <div
                        key={scanId}
                        onClick={() => handleSelectScan(scan)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-300/50"
                            : "bg-gray-50/60 border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        <div className="truncate mr-2">
                          <h5 className="text-xs font-bold text-gray-900 truncate">
                            {scan.title || scan.targetUrl}
                          </h5>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {scan.captures?.length || 0} module screenshots
                          </p>
                        </div>

                        <button
                          onClick={(e) => handleDeleteScan(scanId, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* URL Screenshots Grid */}
              <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-200/80 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      {searchResults
                        ? `Matches for "${searchResults.keyword}"`
                        : selectedScan?.title || selectedScan?.targetUrl}
                    </h3>
                    {selectedScan?.targetUrl && (
                      <a
                        href={selectedScan?.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-amber-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        {selectedScan?.targetUrl}{" "}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {searchResults && (
                    <button
                      onClick={() => setSearchResults(null)}
                      className="text-xs font-bold text-amber-600 hover:underline"
                    >
                      Show All Captures
                    </button>
                  )}
                </div>

                {/* COMPACT GRID: Displays screenshot modules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {displayedImages.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-xs font-medium text-gray-400">
                      No matching screenshots found for this URL record.
                    </div>
                  ) : (
                    displayedImages.map((imgItem, idx) => (
                      <div
                        key={idx}
                        className={`group relative border rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                          imgItem.isMatch
                            ? "bg-amber-50/40 border-amber-200/80"
                            : "bg-gray-50 border-gray-200/80"
                        }`}
                      >
                        <div className="h-44 overflow-hidden flex items-center justify-center bg-gray-100 p-2 relative">
                          <img
                            src={`/api/preflight/screenshots/${imgItem.path}`}
                            alt={imgItem.filename}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://via.placeholder.com/200?text=Module+Screenshot";
                            }}
                          />

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => setPreviewImage(imgItem)}
                              className="px-3 py-2 bg-white text-gray-900 rounded-xl shadow-md hover:bg-yellow-400 transition-colors text-xs font-bold flex items-center gap-1.5"
                            >
                              <Maximize2 className="w-3.5 h-3.5" /> Inspect
                              Image & OCR
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between text-[10px] font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 truncate max-w-[120px]">
                            {imgItem.type}
                          </span>
                          <span className="text-gray-400 truncate max-w-[120px]">
                            {imgItem.source}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Expanded Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-gray-900 text-white flex justify-between items-center shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider">
                {previewImage.filename}
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 overflow-auto flex flex-col items-center justify-center bg-gray-100 max-h-[60vh]">
              <img
                src={`/api/preflight/screenshots/${previewImage.path}`}
                alt="Preview"
                className="max-h-[40vh] max-w-full rounded-2xl object-contain shadow-lg mb-4"
              />

              <div className="bg-white p-4 rounded-2xl border border-gray-200 text-xs w-full max-w-2xl shadow-xs space-y-2">
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-500" /> Detected Text
                  (OCR):
                </span>
                <p className="text-gray-700 font-mono text-[11px] leading-relaxed whitespace-pre-wrap bg-gray-50 p-3 rounded-xl border border-gray-100 max-h-36 overflow-y-auto">
                  {previewImage.text ||
                    "No text detected for this module screenshot."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
