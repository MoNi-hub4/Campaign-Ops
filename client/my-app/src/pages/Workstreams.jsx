import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Layers, Pencil, Trash2, X, Plus, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

export default function Workstreams({ selectedRegion, setSelectedRegion, selectedMonth, setSelectedMonth }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sub_tasks: [''],
  });

  const fetchTemplates = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/workstreams/templates')
      .then((res) => res.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const toggleCardExpand = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', sub_tasks: [''] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tmpl, e) => {
    if (e) e.stopPropagation();
    setEditingId(tmpl._id);
    setFormData({
      name: tmpl.name,
      description: tmpl.description || '',
      sub_tasks: Array.isArray(tmpl.sub_tasks) && tmpl.sub_tasks.length > 0 ? [...tmpl.sub_tasks] : [''],
    });
    setIsModalOpen(true);
  };

  const handleSubTaskChange = (index, value) => {
    const updated = [...formData.sub_tasks];
    updated[index] = value;
    setFormData({ ...formData, sub_tasks: updated });
  };

  const handleAddSubTaskField = () => {
    setFormData({ ...formData, sub_tasks: [...formData.sub_tasks, ''] });
  };

  const handleRemoveSubTaskField = (index) => {
    const updated = formData.sub_tasks.filter((_, i) => i !== index);
    setFormData({ ...formData, sub_tasks: updated.length ? updated : [''] });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const endpoint = editingId
      ? `http://localhost:5000/api/workstreams/templates/${encodeURIComponent(editingId)}`
      : 'http://localhost:5000/api/workstreams/templates';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          sub_tasks: formData.sub_tasks.filter((st) => st.trim() !== ''),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ name: '', description: '', sub_tasks: [''] });
        fetchTemplates();
      } else {
        alert(`Error: ${data.message || 'Failed to save template'}`);
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this workstream template?')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/workstreams/templates/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTemplates();
      } else {
        const data = await res.json();
        alert(`Delete failed: ${data.message || 'Could not delete template'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans antialiased text-gray-800">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header 
          title="Workstream Templates"
          subtitle="Configure baseline execution steps and sub-tasks applied across all campaigns"
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          actionText="Add Workstream"
          onActionClick={handleOpenCreate}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="p-4 sm:p-8 max-w-7xl">
          {loading ? (
            <div className="text-center py-12 text-gray-400 font-medium">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">No templates found. Click "Add Workstream" to create one.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
              {templates.map((tmpl) => {
                const subTaskCount = Array.isArray(tmpl.sub_tasks) ? tmpl.sub_tasks.length : 0;
                const isExpanded = !!expandedCards[tmpl._id];

                return (
                  <div 
                    key={tmpl._id} 
                    onClick={(e) => toggleCardExpand(tmpl._id, e)}
                    className="bg-white border border-gray-200/80 rounded-3xl p-6 shadow-2xs hover:shadow-md hover:border-gray-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-700">
                          <Layers className="w-5 h-5" />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                            {subTaskCount} {subTaskCount === 1 ? 'Sub-task' : 'Sub-tasks'}
                          </span>
                          <button className="text-gray-400 p-1">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-950 mb-1">{tmpl.name}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">{tmpl.description || 'No description provided.'}</p>

                      {isExpanded && subTaskCount > 0 && (
                        <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Process Sub-tasks</span>
                          {tmpl.sub_tasks.map((subTitle, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 font-medium bg-gray-50/80 px-3 py-2 rounded-xl border border-gray-100">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{subTitle}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                      <span className="text-[11px] font-semibold text-gray-400">
                        {isExpanded ? 'Click to collapse' : 'Click to preview sub-tasks'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={(e) => handleOpenEdit(tmpl, e)}
                          className="p-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(tmpl._id, e)}
                          className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold">{editingId ? 'Edit Workstream Template' : 'New Workstream Template'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full hover:bg-white/10">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-sm overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Main Workstream Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Wireframe & creative assets"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                <textarea 
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Hero banner, category strips, carousel slices"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase">Process Sub-tasks</label>
                  <button
                    type="button"
                    onClick={handleAddSubTaskField}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Process Step
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.sub_tasks.map((subTaskTitle, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={subTaskTitle}
                        onChange={(e) => handleSubTaskChange(index, e.target.value)}
                        placeholder={`Step ${index + 1}: e.g. Collect SKU curation`}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                      {formData.sub_tasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubTaskField(index)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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
                  className="bg-[#ffcc00] hover:bg-[#f2c200] text-gray-950 px-6 py-2.5 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  {editingId ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}