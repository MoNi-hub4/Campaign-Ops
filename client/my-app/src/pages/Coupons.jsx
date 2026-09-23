import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import {
  Tag,
  Globe,
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Pencil,
} from "lucide-react";

export default function Coupons({
  selectedRegion,
  setSelectedRegion,
  selectedMonth,
  setSelectedMonth,
}) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null); // Tracks if modal is in Edit Mode
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const defaultFormState = {
    code: "",
    title: "",
    category_name: "Baby",
    discount_type: "PERCENTAGE",
    discount_value: "",
    minimum_spend: "",
    maximum_discount: "",
    start_at: "",
    end_at: "",
    status: "PLANNED",
    markets: ["market_ae"],
    campaign_id: "",
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchCoupons = () => {
    setLoading(true);
    fetch(`/api/coupons?region=${encodeURIComponent(selectedRegion)}`)
      .then((res) => res.json())
      .then((data) => {
        setCoupons(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch coupons:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCoupons();
  }, [selectedRegion, selectedMonth]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedCoupon(null);
        setIsLogModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMarketChange = (e) => {
    const val = e.target.value;
    if (val === "AE & SA") {
      setFormData((prev) => ({ ...prev, markets: ["market_ae", "market_sa"] }));
    } else if (val === "SA") {
      setFormData((prev) => ({ ...prev, markets: ["market_sa"] }));
    } else {
      setFormData((prev) => ({ ...prev, markets: ["market_ae"] }));
    }
  };

  // OPEN CREATE MODAL
  const handleOpenCreateModal = () => {
    setEditingCouponId(null);
    setFormData(defaultFormState);
    setIsLogModalOpen(true);
  };

  // OPEN EDIT MODAL
  const handleOpenEditModal = (coupon, e) => {
    if (e) e.stopPropagation();
    setEditingCouponId(coupon.id);

    let marketsArr = ["market_ae"];
    if (coupon.market === "SA") marketsArr = ["market_sa"];
    if (coupon.market === "AE & SA") marketsArr = ["market_ae", "market_sa"];

    setFormData({
      code: coupon.code,
      title: coupon.mainText,
      category_name: coupon.category,
      discount_type: coupon.discountType || "PERCENTAGE",
      discount_value: coupon.discountValue || "",
      minimum_spend: coupon.minOrder !== "None" ? coupon.minOrder : "",
      maximum_discount: coupon.maxDiscount !== "N/A" ? coupon.maxDiscount : "",
      start_at: coupon.rawStartDate || "",
      end_at: coupon.rawEndDate || "",
      status: coupon.status,
      markets: marketsArr,
      campaign_id: coupon.campaign !== "BAU" ? coupon.campaign : "",
    });

    if (selectedCoupon) setSelectedCoupon(null);
    setIsLogModalOpen(true);
  };

  // SAVE OR UPDATE COUPON
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);

    const isEdit = !!editingCouponId;
    const endpoint = isEdit
      ? `/api/coupons/${editingCouponId}`
      : "/api/coupons";

    const method = isEdit ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          discount_value: Number(formData.discount_value),
          minimum_spend: Number(formData.minimum_spend) || 0,
          maximum_discount: Number(formData.maximum_discount) || 0,
        }),
      });

      if (response.ok) {
        setIsLogModalOpen(false);
        setEditingCouponId(null);
        setFormData(defaultFormState);
        fetchCoupons();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to connect to backend server.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // DELETE COUPON
  const handleDeleteCoupon = async (couponId, e) => {
    if (e) e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this coupon?")) {
      return;
    }

    try {
      const response = await fetch(`/api/coupons/${couponId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (selectedCoupon?.id === couponId) setSelectedCoupon(null);
        fetchCoupons();
      } else {
        const errorData = await response.json();
        alert(`Delete failed: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete coupon.");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "LIVE":
        return "bg-green-100 text-green-700 border-green-200";
      case "PLANNED":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "EXPIRED":
        return "bg-gray-100 text-gray-500 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "LIVE":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "PLANNED":
        return <Clock className="w-4 h-4 text-amber-600" />;
      case "EXPIRED":
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans antialiased text-gray-800">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header
          title="Coupon Tracker"
          subtitle={`Promotions assigned for ${selectedRegion} in ${selectedMonth}`}
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          actionText="Log Coupon"
          onActionClick={handleOpenCreateModal}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="p-4 sm:p-8 max-w-7xl">
          {loading ? (
            <div className="text-center py-12 text-gray-400 font-medium">
              Loading active coupons...
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-12 text-gray-400 font-medium">
              No coupons found for this selection.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  onClick={() => setSelectedCoupon(coupon)}
                  className="relative group bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between overflow-hidden min-h-[10rem] hover:border-gray-300 active:scale-[0.99]"
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -left-3.5 w-7 h-7 bg-[#f8f9fa] border border-gray-100 rounded-full z-10"></div>

                  <div className="flex-1 pl-7 pr-4 py-4 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getStatusBadge(coupon.status)}`}
                        >
                          {coupon.status}
                        </span>
                        <span className="text-xs font-semibold text-gray-600">
                          {coupon.category}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          <Globe className="w-3 h-3 text-gray-500" />
                          {coupon.market}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-gray-900 tracking-tight leading-snug">
                        {coupon.mainText}
                      </h3>

                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Max disc:{" "}
                        <span className="text-gray-700 font-semibold">
                          {coupon.maxDiscount}
                        </span>{" "}
                        • Min order:{" "}
                        <span className="text-gray-700 font-semibold">
                          {coupon.minOrder}
                        </span>
                      </p>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-50">
                      <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span
                        className={`font-semibold truncate ${coupon.campaign && coupon.campaign !== "BAU" ? "text-gray-800" : "text-gray-400"}`}
                      >
                        {coupon.campaign}
                      </span>
                    </div>
                  </div>

                  <div className="h-full border-l-2 border-dashed border-gray-100"></div>

                  <div className="w-36 pl-4 pr-6 py-4 bg-gray-50/70 flex flex-col items-center justify-center gap-3 h-full shrink-0 relative">
                    {/* Hover Action Buttons (Edit & Delete) */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditModal(coupon, e)}
                        title="Edit Coupon"
                        className="p-1 rounded-md text-gray-400 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteCoupon(coupon.id, e)}
                        title="Delete Coupon"
                        className="p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-full bg-yellow-300/40 border border-yellow-400/60 rounded-xl py-2 px-1 text-center shadow-2xs">
                      <span className="font-mono font-black text-sm text-gray-950 tracking-wider block uppercase">
                        {coupon.code}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-gray-500 text-center tracking-tight leading-tight">
                      {coupon.startDate} <br />
                      <span className="text-gray-400 font-normal">to</span>{" "}
                      <br />
                      {coupon.endDate}
                    </span>
                  </div>

                  <div className="absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 bg-[#f8f9fa] border border-gray-100 rounded-full z-10"></div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 1. LOG / EDIT COUPON FORM MODAL */}
      {isLogModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsLogModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 my-8 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 text-white p-6 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {editingCouponId ? "Edit Coupon Entry" : "Log New Coupon"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingCouponId
                    ? "Update promotional details in tracker"
                    : "Add promotional coupon entry to work tracker"}
                </p>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="p-6 overflow-y-auto space-y-4 text-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    name="code"
                    required
                    placeholder="e.g. TRAVEL10"
                    value={formData.code}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Main Offer Text *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    placeholder="e.g. Extra 20% off"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    name="category_name"
                    value={formData.category_name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="Baby">Baby</option>
                    <option value="Toys">Toys</option>
                    <option value="General">General</option>
                    <option value="Electronics">Electronics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Market / Region
                  </label>
                  <select
                    onChange={handleMarketChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="AE">AE Only</option>
                    <option value="SA">SA Only</option>
                    <option value="AE & SA">AE & SA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Discount Type
                  </label>
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    name="discount_value"
                    required
                    placeholder="e.g. 20"
                    value={formData.discount_value}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Max Discount Limit
                  </label>
                  <input
                    type="number"
                    name="maximum_discount"
                    placeholder="e.g. 80"
                    value={formData.maximum_discount}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Minimum Spend Limit
                  </label>
                  <input
                    type="number"
                    name="minimum_spend"
                    placeholder="e.g. 200"
                    value={formData.minimum_spend}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="start_at"
                    required
                    value={formData.start_at}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    name="end_at"
                    required
                    value={formData.end_at}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="PLANNED">PLANNED</option>
                    <option value="LIVE">LIVE</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Campaign Name (Leave blank for BAU)
                  </label>
                  <input
                    type="text"
                    name="campaign_id"
                    placeholder="e.g. Safe Travel Week"
                    value={formData.campaign_id}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 font-bold text-xs uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-[#ffcc00] hover:bg-[#f2c200] text-gray-900 font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {formSubmitting
                    ? "Saving..."
                    : editingCouponId
                      ? "Update Coupon"
                      : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EXPANDED CARD DETAILS MODAL VIEW */}
      {selectedCoupon && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedCoupon(null)}
        >
          <div
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900 text-white p-6 relative">
              <button
                onClick={() => setSelectedCoupon(null)}
                className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 bg-white text-gray-900`}
                >
                  {getStatusIcon(selectedCoupon.status)}
                  {selectedCoupon.status}
                </span>
                <span className="text-xs font-semibold text-gray-300">
                  {selectedCoupon.category}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-xs font-semibold text-gray-300">
                  {selectedCoupon.market}
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight">
                {selectedCoupon.mainText}
              </h2>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-yellow-300/30 border border-yellow-400/60 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                    Promotional Code
                  </span>
                  <span className="font-mono font-black text-2xl text-gray-950 tracking-wider uppercase">
                    {selectedCoupon.code}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">
                    Validity
                  </span>
                  <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    {selectedCoupon.startDate} → {selectedCoupon.endDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-xs text-gray-400 font-semibold block">
                    Maximum Discount
                  </span>
                  <span className="text-base font-extrabold text-gray-900">
                    {selectedCoupon.maxDiscount}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <span className="text-xs text-gray-400 font-semibold block">
                    Minimum Order
                  </span>
                  <span className="text-base font-extrabold text-gray-900">
                    {selectedCoupon.minOrder}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Tracking Information
                </h4>

                <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">
                    Assigned Campaign
                  </span>
                  <span className="font-bold text-gray-900 flex items-center gap-1">
                    <Tag className="w-4 h-4 text-gray-400" />
                    {selectedCoupon.campaign}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Record ID</span>
                  <span className="font-mono text-xs font-semibold text-gray-700">
                    {selectedCoupon.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleOpenEditModal(selectedCoupon, e)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-gray-600" /> Edit
                </button>
                <button
                  onClick={() => handleDeleteCoupon(selectedCoupon.id)}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>

              <button
                onClick={() => setSelectedCoupon(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-700 hover:bg-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
