// StatsCard.jsx - New design
import React from "react";

export default function StatsCard({ title, value, sub, icon, color = "blue" }) {
  const colorMap = {
    blue: "from-blue-500/5 to-cyan-500/5 border-blue-500/20 text-blue-700",
    green: "from-emerald-500/5 to-teal-500/5 border-emerald-500/20 text-emerald-700",
    purple: "from-purple-500/5 to-pink-500/5 border-purple-500/20 text-purple-700",
    yellow: "from-amber-500/5 to-orange-500/5 border-amber-500/20 text-amber-700",
    red: "from-rose-500/5 to-red-500/5 border-rose-500/20 text-rose-700",
  };

  const selectedColor = colorMap[color] ?? colorMap.blue;
  const isSvg = typeof icon === "function" || React.isValidElement(icon);

  return (
    <div className={`bg-gradient-to-br ${selectedColor} rounded-3xl p-6 border shadow-[0_8px_30px_rgba(15,23,42,0.02)] hover:shadow-[0_12px_36px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300/40 transition-all duration-300 group relative overflow-hidden`}>
      {/* Decorative subtle top glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-900/5 to-transparent" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
          <p className="text-3xl font-extrabold text-slate-800 tracking-tight font-['Outfit']">{value}</p>
          {sub && <p className="text-[10px] text-slate-500 font-medium mt-1">{sub}</p>}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-500/5 flex items-center justify-center text-xl border border-slate-500/10 group-hover:bg-slate-500/10 group-hover:border-slate-500/20 group-hover:scale-105 transition-all duration-300">
          {isSvg ? (
            typeof icon === "function" ? React.createElement(icon, { className: "w-5 h-5 text-current" }) : icon
          ) : (
            <span>{icon}</span>
          )}
        </div>
      </div>
    </div>
  );
}