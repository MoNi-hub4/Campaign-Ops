import React from 'react';
import { ChevronDown, Menu, Plus } from 'lucide-react';

export default function Header({ 
  title, 
  subtitle, 
  selectedRegion, 
  setSelectedRegion, 
  selectedMonth, 
  setSelectedMonth, 
  actionText, 
  onActionClick,
  setIsMobileOpen 
}) {
  return (
    <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
      {/* Title & Subtitle */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <button 
          onClick={() => setIsMobileOpen(true)} 
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Persistent Filters & Main Button */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Country / Market Select */}
        <div className="relative flex-1 sm:flex-none">
          <select 
            value={selectedRegion} 
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
          >
            <option>AE + SA</option>
            <option>AE Only</option>
            <option>SA Only</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Date / Month Select */}
        <div className="relative flex-1 sm:flex-none">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full appearance-none bg-white border border-gray-200 rounded-2xl px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-sm"
          >
            <option>September 2026</option>
            <option>October 2026</option>
            <option>November 2026</option>
          </select>
          <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" style={{ top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        {/* Dynamic Action Button */}
        <button 
          onClick={onActionClick}
          className="w-full sm:w-auto bg-[#ffcc00] hover:bg-[#f2c200] text-gray-900 font-semibold text-sm px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{actionText}</span>
        </button>
      </div>
    </header>
  );
}