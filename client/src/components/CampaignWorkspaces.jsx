import React, { useState, useEffect } from "react";
import {
  Plus,
  X,
  Check,
  Sparkles,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";

const warmThemeStyles = [
  {
    defaultBorder:
      "border-amber-200 hover:border-amber-400 hover:shadow-amber-100/50",
    accentLine: "bg-amber-400",
    progressFill: "bg-amber-500",
  },
  {
    defaultBorder:
      "border-orange-200 hover:border-orange-400 hover:shadow-orange-100/50",
    accentLine: "bg-orange-400",
    progressFill: "bg-orange-500",
  },
  {
    defaultBorder:
      "border-rose-200 hover:border-rose-400 hover:shadow-rose-100/50",
    accentLine: "bg-rose-400",
    progressFill: "bg-rose-500",
  },
  {
    defaultBorder:
      "border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-100/50",
    accentLine: "bg-yellow-400",
    progressFill: "bg-yellow-500",
  },
];

export default function CampaignWorkspaces({
  selectedRegion,
  selectedCampaignId,
  onSelectCampaign,
  refreshTrigger,
}) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State (Supports Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    type: "Awareness campaign",
    startDate: "",
    endDate: "",
    markets: "AE + KSA",
    status: "Planning",
    objective: "",
    owner: "Monishan · Onsite",
  });

  const formatDateRange = (startStr, endStr) => {
    if (!startStr && !endStr) return "TBD";
    if (startStr && !endStr) {
      const d = new Date(startStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    const start = new Date(startStr);
    const end = new Date(endStr);

    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}–${endDay}`;
    }
    return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
  };

  const fetchCampaigns = (isBackground = false) => {
    if (!isBackground) setLoading(true);

    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching campaigns:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCampaigns(false);
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCampaigns(true);
    }
  }, [refreshTrigger]);

  const handleOpenCreateModal = () => {
    setEditingCampaignId(null);
    setFormData({
      title: "",
      type: "Awareness campaign",
      startDate: "",
      endDate: "",
      markets: "AE + KSA",
      status: "Planning",
      objective: "",
      owner: "Monishan · Onsite",
    });
    setIsModalOpen(true);

    fetch("/api/workstreams/templates")
      .then((res) => res.json())
      .then((templates) => {
        if (Array.isArray(templates)) {
          setAvailableTemplates(templates);
          setSelectedTemplateIds(templates.map((t) => t._id));
        }
      })
      .catch((err) => console.error("Error loading templates:", err));
  };

  const handleOpenEditModal = (campaign, e) => {
    if (e) e.stopPropagation();
    const targetId = campaign.id || campaign._id;
    setEditingCampaignId(targetId);
    setFormData({
      title: campaign.title || "",
      type: campaign.type || "Awareness campaign",
      startDate: "",
      endDate: "",
      markets: campaign.markets || "AE + KSA",
      status: campaign.status || "Planning",
      objective: campaign.objective || "",
      owner: campaign.owner || "Monishan · Onsite",
    });
    setIsModalOpen(true);
  };

  const handleDeleteCampaign = async (campaignId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this campaign workspace and all its tasks?"))
      return;

    try {
      const res = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}`,
        {
          method: "DELETE",
        },
      );
      if (res.ok) {
        if (selectedCampaignId === campaignId) {
          onSelectCampaign(null);
        }
        fetchCampaigns(true);
      }
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    }
  };

  const toggleTemplateSelection = (id) => {
    setSelectedTemplateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formattedDateRange =
      formData.startDate && formData.endDate
        ? formatDateRange(formData.startDate, formData.endDate)
        : undefined;

    const endpoint = editingCampaignId
      ? `/api/campaigns/${encodeURIComponent(editingCampaignId)}`
      : "/api/campaigns";
    const method = editingCampaignId ? "PUT" : "POST";

    const payload = editingCampaignId
      ? {
          title: formData.title,
          type: formData.type,
          markets: formData.markets,
          status: formData.status,
          objective: formData.objective,
          owner: formData.owner,
          ...(formattedDateRange && { dateRange: formattedDateRange }),
        }
      : {
          title: formData.title,
          type: formData.type,
          dateRange: formattedDateRange || "TBD",
          markets: formData.markets,
          status: formData.status,
          objective: formData.objective,
          owner: formData.owner,
          selectedTemplateIds,
        };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const savedCampaign = await response.json();
        setIsModalOpen(false);
        fetchCampaigns(true);
        if (!editingCampaignId) {
          onSelectCampaign(savedCampaign);
        }
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.message}`);
      }
    } catch (err) {
      console.error("Error saving campaign:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedRegion === "AE Only") return c.markets.includes("AE");
    if (selectedRegion === "SA Only")
      return c.markets.includes("KSA") || c.markets.includes("SA");
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Planning":
        return "bg-amber-100/80 text-amber-900 border border-amber-200/60";
      case "Live":
        return "bg-emerald-100/80 text-emerald-900 border border-emerald-200/60";
      case "Complete":
        return "bg-blue-100/80 text-blue-900 border border-blue-200/60";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden mt-6">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div>
          <h3 className="text-lg font-bold text-gray-950 tracking-tight">
            Campaign workspaces
          </h3>
          <p className="text-xs text-gray-400 font-medium">
            Manage active campaign execution checklists
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Campaign
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400 font-medium text-xs">
            Loading campaign workspaces...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-8">
            <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-gray-900">
              No campaigns found
            </h4>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Click "Add Campaign" to configure a new workspace and select
              workstreams.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              + Create First Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCampaigns.map((item, index) => {
              const currentId = item.id || item._id;
              const isSelected = selectedCampaignId === currentId;
              const progressPercent =
                item.totalTasks > 0
                  ? Math.round((item.completedTasks / item.totalTasks) * 100)
                  : 0;
              const colorTheme =
                warmThemeStyles[index % warmThemeStyles.length];

              return (
                <div
                  key={currentId}
                  onClick={() => onSelectCampaign(item)}
                  className={`relative p-5 rounded-2xl cursor-pointer overflow-hidden flex flex-col justify-between group transition-colors duration-150 ${
                    isSelected
                      ? "bg-[#fffbeb] border-2 border-yellow-400 shadow-md"
                      : `bg-white border-2 ${colorTheme.defaultBorder} hover:shadow-md shadow-2xs`
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${colorTheme.accentLine}`}
                  />

                  <div>
                    <div className="flex justify-between items-start mb-1.5 pt-1">
                      <h4 className="text-base font-bold text-gray-950 tracking-tight leading-snug">
                        {item.title}
                      </h4>

                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {/* Edit & Delete Action Buttons */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150">
                          <button
                            onClick={(e) => handleOpenEditModal(item, e)}
                            className="p-1 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100 bg-white"
                            title="Edit Campaign"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteCampaign(currentId, e)}
                            className="p-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 bg-white"
                            title="Delete Campaign"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span
                          className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${getStatusBadge(item.status)}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-gray-500 mb-4">
                      {item.dateRange || "Dates pending"}{" "}
                      <span className="mx-1.5 text-gray-300">•</span>{" "}
                      <span className="text-gray-700">{item.markets}</span>
                    </p>
                  </div>

                  <div>
                    {/* Animated Warm Progress Bar */}
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-3 border border-gray-200/40">
                      <div
                        className={`${colorTheme.progressFill} h-full rounded-full transition-all duration-300 ease-out`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold text-gray-600">
                      <span>
                        {item.completedTasks} / {item.totalTasks} tasks complete
                      </span>
                      <span className="text-gray-500 font-bold">
                        {item.proofsCount || 0} proofs
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold">
                  {editingCampaignId
                    ? "Edit Campaign Details"
                    : "New Campaign Entry"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingCampaignId
                    ? "Update campaign name and metadata"
                    : "Define campaign info and select workstream templates"}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="p-6 space-y-4 text-sm overflow-y-auto flex-1"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Baby Safety Month 2026"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  Execution Date Range
                </label>

                <div className="grid grid-cols-2 gap-3 bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                  <div>
                    <span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">
                      Start Date
                    </span>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>

                  <div>
                    <span className="block text-[10px] font-extrabold text-gray-400 uppercase mb-1">
                      End Date
                    </span>
                    <input
                      type="date"
                      min={formData.startDate}
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                </div>

                {formData.startDate && formData.endDate && (
                  <span className="text-[11px] font-bold text-amber-600 block mt-1.5 ml-1">
                    Formatted Range:{" "}
                    {formatDateRange(formData.startDate, formData.endDate)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Target Markets
                  </label>
                  <select
                    value={formData.markets}
                    onChange={(e) =>
                      setFormData({ ...formData, markets: e.target.value })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 text-xs"
                  >
                    <option value="AE + KSA">AE + KSA</option>
                    <option value="AE Only">AE Only</option>
                    <option value="KSA Only">KSA Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400 text-xs"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Live">Live</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>

              {!editingCampaignId && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                    Include Workstream Templates ({selectedTemplateIds.length}{" "}
                    selected)
                  </label>

                  {availableTemplates.length === 0 ? (
                    <div className="text-xs text-gray-400 italic">
                      No global templates found in database.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {availableTemplates.map((tmpl) => {
                        const isChecked = selectedTemplateIds.includes(
                          tmpl._id,
                        );
                        const subTaskCount = tmpl.sub_tasks
                          ? tmpl.sub_tasks.length
                          : 0;

                        return (
                          <div
                            key={tmpl._id}
                            onClick={() => toggleTemplateSelection(tmpl._id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                              isChecked
                                ? "bg-purple-50/60 border-purple-300 text-purple-950"
                                : "bg-gray-50 border-gray-200 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                  isChecked
                                    ? "bg-purple-700 border-purple-700 text-white"
                                    : "border-gray-300"
                                }`}
                              >
                                {isChecked && (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                )}
                              </div>
                              <div>
                                <h5 className="text-xs font-bold">
                                  {tmpl.name}
                                </h5>
                                <p className="text-[11px] text-gray-500">
                                  {subTaskCount} process sub-tasks
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600">
                              Template
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold uppercase text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#ffcc00] hover:bg-[#f2c200] text-gray-950 px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingCampaignId
                      ? "Update Campaign"
                      : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
