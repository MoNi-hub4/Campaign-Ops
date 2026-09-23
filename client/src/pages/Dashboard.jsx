import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import CampaignWorkspaces from "../components/CampaignWorkspaces";
import CampaignDetailWindow from "../components/CampaignDetailWindow";
import { Megaphone, Ticket, Send, CheckCircle2 } from "lucide-react";

export default function Dashboard({
  selectedRegion,
  setSelectedRegion,
  selectedMonth,
  setSelectedMonth,
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [totalCouponsCount, setTotalCouponsCount] = useState(0);
  const [liveCouponsCount, setLiveCouponsCount] = useState(0);
  const [plannedCouponsCount, setPlannedCouponsCount] = useState(0);
  const [expiredCouponsCount, setExpiredCouponsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Selected Campaign & Refresh Trigger State
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Ref to anchor detail window and prevent layout jumping on switch
  const detailWindowRef = useRef(null);

  // Auto-select the first campaign on initial load if none is selected
  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0 && !selectedCampaign) {
          setSelectedCampaign(data[0]);
        }
      })
      .catch((err) => console.error("Error fetching default campaign:", err));
  }, []);

  const handleSelectCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    if (campaign && detailWindowRef.current) {
      detailWindowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  };

  const triggerWorkspaceRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coupons?region=${encodeURIComponent(selectedRegion)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTotalCouponsCount(data.length);
          setLiveCouponsCount(data.filter((c) => c.status === "LIVE").length);
          setPlannedCouponsCount(
            data.filter((c) => c.status === "PLANNED").length,
          );
          setExpiredCouponsCount(
            data.filter((c) => c.status === "EXPIRED").length,
          );
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch coupons for dashboard:", err);
        setLoading(false);
      });
  }, [selectedRegion, selectedMonth]);

  return (
    <div className="flex h-screen bg-[#f8f9fa] font-sans antialiased text-gray-800">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header
          title="Campaign operations"
          subtitle="Sample workspace • Last updated today"
          selectedRegion={selectedRegion}
          setSelectedRegion={setSelectedRegion}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          actionText="New campaign"
          onActionClick={() => alert("New Campaign Modal")}
          setIsMobileOpen={setIsMobileOpen}
        />

        <main className="p-4 sm:p-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-1">
            <h2 className="text-xl font-bold text-gray-900">
              {selectedMonth} at a glance
            </h2>
            <span className="text-sm font-medium text-gray-400">
              Baby category <span className="mx-1">•</span> {selectedRegion}
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-gray-500">
                  Campaigns
                </span>
                <Megaphone className="w-5 h-5 text-gray-400 stroke-[1.5]" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">5</div>
              <div className="text-sm text-gray-500">
                2 live <span className="mx-0.5">•</span> 2 planning{" "}
                <span className="mx-0.5">•</span> 1 done
              </div>
            </div>

            <Link
              to="/coupons"
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md hover:border-gray-300 transition-all cursor-pointer block group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
                  Coupons
                </span>
                <Ticket className="w-5 h-5 text-gray-400 stroke-[1.5] group-hover:text-yellow-500 transition-colors" />
              </div>

              <div className="text-4xl font-bold text-gray-900 mb-2">
                {loading ? "..." : totalCouponsCount}
              </div>

              <div className="text-sm text-gray-500">
                {loading ? (
                  "Loading details..."
                ) : (
                  <>
                    <span className="font-medium text-green-600">
                      {liveCouponsCount} live
                    </span>
                    <span className="mx-1">•</span>
                    <span className="font-medium text-amber-600">
                      {plannedCouponsCount} planned
                    </span>
                    <span className="mx-1">•</span>
                    <span className="font-medium text-gray-400">
                      {expiredCouponsCount} expired
                    </span>
                  </>
                )}
              </div>
            </Link>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-gray-500">
                  Push notifications
                </span>
                <Send className="w-5 h-5 text-gray-400 stroke-[1.5]" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">11</div>
              <div className="text-sm text-gray-500">
                8 campaign <span className="mx-0.5">•</span> 3 BAU
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <span className="text-sm font-medium text-gray-500">
                  Execution complete
                </span>
                <CheckCircle2 className="w-5 h-5 text-gray-400 stroke-[1.5]" />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-2">79%</div>
              <div className="text-sm text-gray-500">
                14 of 18 workstreams done
              </div>
            </div>
          </div>

          {/* Campaign Workspaces List */}
          <CampaignWorkspaces
            selectedRegion={selectedRegion}
            selectedCampaignId={selectedCampaign?.id || selectedCampaign?._id}
            onSelectCampaign={handleSelectCampaign}
            refreshTrigger={refreshTrigger}
          />

          {/* Persistent Detail Window Container */}
          <div ref={detailWindowRef}>
            {selectedCampaign && (
              <CampaignDetailWindow
                campaign={selectedCampaign}
                onClose={() => setSelectedCampaign(null)}
                onSubtaskToggle={triggerWorkspaceRefresh}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
