import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  Globe,
  Search,
  Sparkles,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Maximize2,
  X,
  Download,
  Loader2,
  FileText,
} from "lucide-react";

export default function Scanner({
  selectedRegion,
  setSelectedRegion,
  selectedMonth,
  setSelectedMonth,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [previewImage, setPreviewImage] = useState(null);

  const fetchScans = () => {
    fetch("http://localhost:5000/api/scanner")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setScans(data);
          if (data.length > 0 && !selectedScan) {
            setSelectedScan(data[0]);
          }
        }
      })
      .catch((err) => console.error("Error fetching scans:", err));
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleStartScan = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsScanning(true);
    try {
      const res = await fetch("http://localhost:5000/api/scanner/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });

      if (res.ok) {
        const newScan = await res.json();
        setUrlInput("");
        setScans((prev) => [newScan, ...prev]);
        setSelectedScan(newScan);
      } else {
        const err = await res.json();
        alert(`Scan failed: ${err.message}`);
      }
    } catch (err) {
      console.error("Scan error:", err);
      alert("Failed to connect to scanner service");
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeleteScan = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this scan record?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/scanner/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        // Match using _id or id
        const updated = scans.filter((s) => (s._id || s.id) !== id);
        setScans(updated);
        if ((selectedScan?._id || selectedScan?.id) === id) {
          setSelectedScan(updated[0] || null);
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // OCR IMAGE SEARCH: Searches both image URL and OCR extracted text inside images
  const filteredAssets = (selectedScan?.assets || []).filter((asset) => {
    const query = searchTerm.toLowerCase().trim();
    const matchesUrl = asset.url.toLowerCase().includes(query);
    const matchesOCR =
      asset.extractedText && asset.extractedText.toLowerCase().includes(query);

    const matchesSearch = matchesUrl || matchesOCR;
    const matchesType = typeFilter === "ALL" || asset.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans antialiased text-gray-800">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header
          title="Website Image Scanner"
          subtitle="Scan web pages to extract images and search text inside images using OCR"
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          actionText="New Scan"
          onActionClick={() => document.getElementById("scan-input")?.focus()}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="p-4 sm:p-8 max-w-7xl space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs">
            <form
              onSubmit={handleStartScan}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Globe className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
                <input
                  id="scan-input"
                  type="text"
                  required
                  placeholder="Enter website URL (e.g. amazon.ae or noon.com)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <button
                type="submit"
                disabled={isScanning}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xs transition-all disabled:opacity-50 shrink-0"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                    Extracting & Running OCR...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Scan & Read Text
                  </>
                )}
              </button>
            </form>
          </div>

          {scans.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
              <ImageIcon className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-gray-900">
                No Web Scans Yet
              </h4>
              <p className="text-xs text-gray-400 mt-1">
                Enter a website URL above to extract images and read text inside
                them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              <div className="bg-white rounded-3xl border border-gray-200/80 p-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-3">
                  Scan History ({scans.length})
                </h4>

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {scans.map((scan) => {
                    const isSelected = selectedScan?.id === scan.id;
                    return (
                      <div
                        key={scan.id}
                        onClick={() => setSelectedScan(scan)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-300/50"
                            : "bg-gray-50/60 border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        <div className="truncate mr-2">
                          <h5 className="text-xs font-bold text-gray-900 truncate">
                            {scan.title}
                          </h5>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {scan.url}
                          </p>
                        </div>

                        <button
                          onClick={(e) =>
                            handleDeleteScan(scan._id || scan.id, e)
                          }
                          className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-200/80 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedScan?.title}
                    </h3>
                    <a
                      href={selectedScan?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-amber-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      {selectedScan?.url} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search text inside images..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 w-52"
                      />
                    </div>

                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                      <option value="ALL">All Formats</option>
                      <option value="PNG">PNG</option>
                      <option value="JPG">JPG</option>
                      <option value="JPEG">JPEG</option>
                      <option value="WEBP">WEBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredAssets.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-xs font-medium text-gray-400">
                      No images match your search term "{searchTerm}".
                    </div>
                  ) : (
                    filteredAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="group relative bg-gray-50 border border-gray-200/80 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="h-36 overflow-hidden flex items-center justify-center bg-gray-100 p-2 relative">
                          <img
                            src={asset.url}
                            alt="Scanned Asset"
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                "https://via.placeholder.com/150?text=Image+Load+Error";
                            }}
                          />

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => setPreviewImage(asset)}
                              className="p-2 bg-white text-gray-900 rounded-xl shadow-md hover:bg-yellow-400 transition-colors"
                              title="Expand Image & OCR Text"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <a
                              href={asset.url}
                              target="_blank"
                              download="scanned_asset"
                              rel="noopener noreferrer"
                              className="p-2 bg-white text-gray-900 rounded-xl shadow-md hover:bg-yellow-400 transition-colors"
                              title="Download Asset"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        <div className="p-2.5 bg-white border-t border-gray-100 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                              {asset.type}
                            </span>
                            <span className="text-gray-400 truncate max-w-[80px]">
                              {asset.source}
                            </span>
                          </div>

                          {asset.extractedText && (
                            <p className="text-[10px] text-gray-500 truncate italic flex items-center gap-1 pt-1 border-t border-gray-50">
                              <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="truncate">
                                {asset.extractedText}
                              </span>
                            </p>
                          )}
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
                Asset & Detected Text Preview
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
                src={previewImage.url}
                alt="Preview"
                className="max-h-[45vh] max-w-full rounded-2xl object-contain shadow-lg mb-4"
              />

              {previewImage.extractedText && (
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 text-xs w-full max-w-2xl">
                  <span className="font-bold text-gray-900 block mb-1">
                    OCR Detected Text Inside Image:
                  </span>
                  <p className="text-gray-600 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {previewImage.extractedText}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500 truncate max-w-lg">
                {previewImage.url}
              </span>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Direct Link
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
