import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  X,
  EyeOff,
  PlusCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link2,
  Save,
  Edit3,
  Circle,
  Layers,
  Check,
  Copy,
  Pencil,
} from "lucide-react";

export default function CampaignDetailWindow({ campaign, onClose, onSubtaskToggle }) {
  const [activeTab, setActiveTab] = useState("Workstreams");
  const [workstreams, setWorkstreams] = useState([]);
  const [loadingWorkstreams, setLoadingWorkstreams] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});

  const [editingWorkstreamId, setEditingWorkstreamId] = useState(null);
  const [workstreamNameInput, setWorkstreamNameInput] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("template");
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [linkInput, setLinkInput] = useState("");

  const [customWorkstream, setCustomWorkstream] = useState({
    name: "",
    description: "",
    sub_tasks: [""],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetCampaignId = campaign?.id || campaign?._id;

  const fetchCampaignWorkstreams = () => {
    if (targetCampaignId) {
      setLoadingWorkstreams(true);
      fetch(`http://localhost:5000/api/workstreams/${encodeURIComponent(targetCampaignId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setWorkstreams(data);
            setExpandedTasks({});
          }
          setLoadingWorkstreams(false);
        })
        .catch((err) => {
          console.error("Failed to load campaign workstreams:", err);
          setLoadingWorkstreams(false);
        });
    }
  };

  const fetchGlobalTemplates = () => {
    setLoadingTemplates(true);
    fetch("http://localhost:5000/api/workstreams/templates")
      .then((res) => res.json())
      .then((data) => {
        setAvailableTemplates(Array.isArray(data) ? data : []);
        setLoadingTemplates(false);
      })
      .catch((err) => {
        console.error("Failed to load templates:", err);
        setLoadingTemplates(false);
      });
  };

  useEffect(() => {
    fetchCampaignWorkstreams();
  }, [targetCampaignId]);

  const toggleTaskExpand = (id) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDuplicateWorkstream = async (workstreamId, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(`http://localhost:5000/api/workstreams/${encodeURIComponent(workstreamId)}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        fetchCampaignWorkstreams();
        if (onSubtaskToggle) onSubtaskToggle();
      }
    } catch (error) {
      console.error("Duplicate workstream error:", error);
    }
  };

  const handleSaveWorkstreamName = async (workstreamId, e) => {
    if (e) e.stopPropagation();
    if (!workstreamNameInput.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/api/workstreams/${encodeURIComponent(workstreamId)}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workstreamNameInput }),
      });

      if (response.ok) {
        const updated = await response.json();
        setWorkstreams((prev) =>
          prev.map((w) => (w._id === workstreamId ? updated : w))
        );
        setEditingWorkstreamId(null);
        setWorkstreamNameInput("");
      }
    } catch (error) {
      console.error("Failed to rename workstream:", error);
    }
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
    setModalMode("template");
    setCustomWorkstream({ name: "", description: "", sub_tasks: [""] });
    fetchGlobalTemplates();
  };

  const handleAddTemplateToCampaign = async (template) => {
    if (!targetCampaignId) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/workstreams/${encodeURIComponent(targetCampaignId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            description: template.description || "",
            sub_tasks: template.sub_tasks || [],
          }),
        },
      );

      if (response.ok) {
        setIsAddModalOpen(false);
        fetchCampaignWorkstreams();
        if (onSubtaskToggle) onSubtaskToggle();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.message}`);
      }
    } catch (err) {
      console.error("Error adding template:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubTaskChange = (index, value) => {
    const updated = [...customWorkstream.sub_tasks];
    updated[index] = value;
    setCustomWorkstream({ ...customWorkstream, sub_tasks: updated });
  };

  const handleAddSubTaskField = () => {
    setCustomWorkstream({
      ...customWorkstream,
      sub_tasks: [...customWorkstream.sub_tasks, ""],
    });
  };

  const handleRemoveSubTaskField = (index) => {
    const updated = customWorkstream.sub_tasks.filter((_, i) => i !== index);
    setCustomWorkstream({
      ...customWorkstream,
      sub_tasks: updated.length ? updated : [""],
    });
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!targetCampaignId) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/workstreams/${encodeURIComponent(targetCampaignId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: customWorkstream.name,
            description: customWorkstream.description,
            sub_tasks: customWorkstream.sub_tasks.filter(
              (st) => st.trim() !== "",
            ),
          }),
        },
      );

      if (response.ok) {
        setIsAddModalOpen(false);
        setCustomWorkstream({ name: "", description: "", sub_tasks: [""] });
        fetchCampaignWorkstreams();
        if (onSubtaskToggle) onSubtaskToggle();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Add workstream error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSubtask = async (
    workstreamId,
    subtaskId,
    currentStatus,
  ) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/workstreams/${encodeURIComponent(workstreamId)}/subtasks/${encodeURIComponent(subtaskId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_completed: !currentStatus }),
        },
      );

      if (res.ok) {
        const updated = await res.json();
        setWorkstreams((prev) =>
          prev.map((w) => (w._id === workstreamId ? updated : w)),
        );
        if (onSubtaskToggle) onSubtaskToggle();
      }
    } catch (err) {
      console.error("Failed to update subtask:", err);
    }
  };

  const handleSaveLink = async (workstreamId, subtaskId) => {
    try {
      const res = await fetch(
        `http://localhost:5000/api/workstreams/${encodeURIComponent(workstreamId)}/subtasks/${encodeURIComponent(subtaskId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link: linkInput }),
        },
      );

      if (res.ok) {
        const updated = await res.json();
        setWorkstreams((prev) =>
          prev.map((w) => (w._id === workstreamId ? updated : w)),
        );
        setEditingSubtaskId(null);
        setLinkInput("");
      }
    } catch (err) {
      console.error("Failed to save link:", err);
    }
  };

  const handleToggleStatus = async (workstreamId, currentStatus) => {
    const newStatus = currentStatus === "IGNORED" ? "ACTIVE" : "IGNORED";
    try {
      const response = await fetch(
        `http://localhost:5000/api/workstreams/${encodeURIComponent(workstreamId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (response.ok) {
        setWorkstreams((prev) =>
          prev.map((w) =>
            w._id === workstreamId ? { ...w, status: newStatus } : w,
          ),
        );
        if (onSubtaskToggle) onSubtaskToggle();
      }
    } catch (error) {
      console.error("Failed to update workstream status:", error);
    }
  };

  const handleDeleteWorkstream = async (workstreamId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this workstream from campaign?")) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/workstreams/${encodeURIComponent(workstreamId)}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        setWorkstreams((prev) => prev.filter((w) => w._id !== workstreamId));
        if (onSubtaskToggle) onSubtaskToggle();
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (!campaign) return null;

  const tabs = ["Workstreams"];
  const activeWorkstreams = workstreams.filter((w) => w.status !== "IGNORED");
  const ignoredWorkstreams = workstreams.filter((w) => w.status === "IGNORED");
  const existingNames = workstreams.map((w) => w.name.toLowerCase().trim());

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden mt-6">
      {/* Campaign Header */}
      <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#ffcc00] flex items-center justify-center shrink-0 text-gray-900 shadow-2xs">
            <ShieldCheck className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {campaign.title}
            </h3>
            <p className="text-xs font-medium text-gray-400 mt-0.5">
              {campaign.type || "Awareness campaign"}{" "}
              <span className="mx-1">•</span> {campaign.dateRange}{" "}
              <span className="mx-1">•</span> {campaign.markets}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => alert(`Opening workspace for ${campaign.title}`)}
            className="px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            Open workspace
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-gray-100 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="px-5 border-b border-gray-100 flex justify-between items-center">
        <div className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 text-xs font-semibold relative transition-colors ${
                activeTab === tab
                  ? "text-gray-900 font-bold"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#eab308] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleOpenAddModal}
          className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-2xs transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" /> Add Workstream
        </button>
      </div>

      <div className="p-5">
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-sm font-bold text-gray-900">
              Campaign execution checklist
            </h4>
            <span className="text-[11px] text-gray-400 font-medium">
              {activeWorkstreams.length} active workstreams
            </span>
          </div>

          {loadingWorkstreams ? (
            <div className="text-center py-6 text-gray-400 font-medium text-xs">
              Loading execution checklist...
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeWorkstreams.map((mainTask) => {
                const subTasks = mainTask.sub_tasks || [];
                const completedCount = subTasks.filter(
                  (st) => st.is_completed,
                ).length;
                const isExpanded = !!expandedTasks[mainTask._id];
                const isEditingName = editingWorkstreamId === mainTask._id;

                return (
                  <div
                    key={mainTask._id}
                    className={`rounded-xl overflow-hidden transition-all duration-150 ${
                      isExpanded
                        ? "border-2 border-amber-300 bg-amber-50/20 shadow-sm ring-1 ring-amber-300/40"
                        : "border border-gray-200/80 bg-white shadow-2xs"
                    }`}
                  >
                    {/* Main Workstream Row (Highlighted Header when Open) */}
                    <div
                      onClick={() => toggleTaskExpand(mainTask._id)}
                      className={`py-2.5 px-3.5 flex items-center justify-between cursor-pointer border-b transition-colors ${
                        isExpanded
                          ? "bg-amber-100/40 hover:bg-amber-100/60 border-amber-200/80"
                          : "bg-gray-50/70 hover:bg-gray-50 border-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <button className={isExpanded ? "text-amber-700 font-bold" : "text-gray-400"}>
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <div>
                          {isEditingName ? (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={workstreamNameInput}
                                onChange={(e) => setWorkstreamNameInput(e.target.value)}
                                className="text-xs font-bold bg-white border border-yellow-400 rounded-lg px-2 py-0.5 focus:outline-none"
                              />
                              <button
                                onClick={(e) => handleSaveWorkstreamName(mainTask._id, e)}
                                className="bg-yellow-400 text-gray-950 p-1 rounded-md text-xs font-bold"
                              >
                                <Save className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <h4 className={`text-xs font-bold ${isExpanded ? "text-amber-950" : "text-gray-950"}`}>
                                {mainTask.name}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingWorkstreamId(mainTask._id);
                                  setWorkstreamNameInput(mainTask.name);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 p-0.5 transition-opacity"
                                title="Rename Workstream"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                          {mainTask.description && (
                            <p className="text-[11px] text-gray-400 leading-tight">
                              {mainTask.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDuplicateWorkstream(mainTask._id, e)}
                          className="text-[11px] font-semibold text-gray-400 hover:text-purple-600 p-1 rounded-md hover:bg-purple-50 transition-colors"
                          title="Duplicate Workstream"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(mainTask._id, mainTask.status);
                          }}
                          className="text-[11px] font-semibold text-gray-400 hover:text-amber-600 p-1 rounded-md hover:bg-amber-50"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) =>
                            handleDeleteWorkstream(mainTask._id, e)
                          }
                          className="text-[11px] font-semibold text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ml-1 ${
                          isExpanded 
                            ? "text-amber-900 bg-amber-100/80 border-amber-200" 
                            : "text-purple-700 bg-purple-50 border-purple-100"
                        }`}>
                          {completedCount} / {subTasks.length} Done
                        </span>
                      </div>
                    </div>

                    {/* Sub-tasks Container */}
                    {isExpanded && (
                      <div className="p-2 space-y-1 bg-white/80">
                        {subTasks.length === 0 ? (
                          <div className="text-[11px] text-gray-400 font-medium py-1.5 px-2">
                            No process sub-tasks added yet.
                          </div>
                        ) : (
                          subTasks.map((subTask) => (
                            <div
                              key={subTask._id}
                              className={`py-1.5 px-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                subTask.is_completed
                                  ? "bg-emerald-50/30 border-emerald-100"
                                  : "bg-white border-gray-100 shadow-2xs"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    handleToggleSubtask(
                                      mainTask._id,
                                      subTask._id,
                                      subTask.is_completed,
                                    )
                                  }
                                >
                                  {subTask.is_completed ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-gray-300 hover:text-gray-400" />
                                  )}
                                </button>
                                <span
                                  className={`text-xs font-medium ${subTask.is_completed ? "line-through text-gray-400" : "text-gray-800"}`}
                                >
                                  {subTask.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 pl-6 sm:pl-0">
                                {editingSubtaskId === subTask._id ? (
                                  <div className="flex items-center gap-1 bg-gray-50 p-0.5 rounded-lg border border-yellow-300">
                                    <input
                                      type="url"
                                      placeholder="Paste link..."
                                      value={linkInput}
                                      onChange={(e) =>
                                        setLinkInput(e.target.value)
                                      }
                                      className="text-[11px] bg-transparent px-1.5 py-0.5 focus:outline-none w-36 font-medium"
                                    />
                                    <button
                                      onClick={() =>
                                        handleSaveLink(
                                          mainTask._id,
                                          subTask._id,
                                        )
                                      }
                                      className="bg-yellow-400 text-gray-950 p-1 rounded-md"
                                    >
                                      <Save className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : subTask.link ? (
                                  <div className="flex items-center gap-1">
                                    <a
                                      href={subTask.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 max-w-[150px] truncate"
                                    >
                                      <Link2 className="w-3 h-3 shrink-0" />
                                      <span className="truncate">
                                        {subTask.link}
                                      </span>
                                    </a>
                                    <button
                                      onClick={() => {
                                        setEditingSubtaskId(subTask._id);
                                        setLinkInput(subTask.link);
                                      }}
                                      className="text-gray-400 hover:text-gray-700 p-0.5"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingSubtaskId(subTask._id);
                                      setLinkInput("");
                                    }}
                                    className="text-[10px] font-bold text-gray-400 hover:text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200/60 flex items-center gap-1"
                                  >
                                    <Link2 className="w-2.5 h-2.5" /> Add Link
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {ignoredWorkstreams.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Ignored Workstreams ({ignoredWorkstreams.length})
                  </span>
                  <div className="space-y-1.5">
                    {ignoredWorkstreams.map((ws) => (
                      <div
                        key={ws._id}
                        className="bg-gray-50/60 py-2 px-3 rounded-lg border border-gray-100 flex justify-between items-center text-xs opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <div>
                          <span className="font-bold text-gray-700">
                            {ws.name}
                          </span>
                          <span className="text-gray-400 ml-1.5">
                            • {ws.description}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              handleToggleStatus(ws._id, ws.status)
                            }
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                          >
                            <PlusCircle className="w-3 h-3" /> Re-add
                          </button>
                          <button
                            onClick={(e) => handleDeleteWorkstream(ws._id, e)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 p-0.5 rounded-md"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Workstream Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 text-white p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-bold">Add Campaign Workstream</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select a template or create custom step
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="flex border-b border-gray-100 bg-gray-50/50 p-1 gap-1 shrink-0">
              <button
                onClick={() => setModalMode("template")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  modalMode === "template"
                    ? "bg-white text-gray-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Available Templates
              </button>
              <button
                onClick={() => setModalMode("custom")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  modalMode === "custom"
                    ? "bg-white text-gray-950 shadow-xs"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                + Create Custom
              </button>
            </div>

            {modalMode === "template" && (
              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
                {loadingTemplates ? (
                  <div className="text-center py-6 text-gray-400 font-medium text-xs">
                    Loading available templates...
                  </div>
                ) : availableTemplates.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 font-medium text-xs">
                    No global templates found. Switch to Custom mode.
                  </div>
                ) : (
                  availableTemplates.map((tmpl) => {
                    const isAlreadyAdded = existingNames.includes(
                      tmpl.name.toLowerCase().trim(),
                    );

                    return (
                      <div
                        key={tmpl._id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isAlreadyAdded
                            ? "bg-gray-50 border-gray-200 opacity-60"
                            : "bg-white border-gray-100 hover:border-gray-300 hover:shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-gray-900">
                              {tmpl.name}
                            </h5>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {tmpl.description || "Global workstream"}
                            </p>
                          </div>
                        </div>

                        {isAlreadyAdded ? (
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3" /> Added
                          </span>
                        ) : (
                          <button
                            disabled={isSubmitting}
                            onClick={() => handleAddTemplateToCampaign(tmpl)}
                            className="bg-yellow-400 hover:bg-yellow-500 text-gray-950 text-xs font-bold px-2.5 py-1 rounded-lg transition-all shadow-2xs"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {modalMode === "custom" && (
              <form
                onSubmit={handleCustomSubmit}
                className="p-5 space-y-3.5 text-sm overflow-y-auto flex-1"
              >
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Main Workstream Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Influencer Outreach"
                    value={customWorkstream.name}
                    onChange={(e) =>
                      setCustomWorkstream({
                        ...customWorkstream,
                        name: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">
                    Description / Deliverables
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Unboxing videos, product seeding, discount links"
                    value={customWorkstream.description}
                    onChange={(e) =>
                      setCustomWorkstream({
                        ...customWorkstream,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div className="pt-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase">
                      Process Sub-tasks
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSubTaskField}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Step
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {customWorkstream.sub_tasks.map((subTaskTitle, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={subTaskTitle}
                          onChange={(e) =>
                            handleSubTaskChange(index, e.target.value)
                          }
                          placeholder={`Step ${index + 1}: e.g. Collect SKU curation`}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                        {customWorkstream.sub_tasks.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubTaskField(index)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-bold uppercase text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#ffcc00] text-gray-950 px-5 py-2 rounded-lg text-xs font-bold uppercase hover:bg-[#f2c200] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Adding..." : "Add Workstream"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}