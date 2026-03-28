"use client";
import Link from "next/link";
import { ExternalLink, TrendingUp, Shield } from "lucide-react";
import type { Shark } from "@/lib/mock-data";

export default function SharkCard({ shark }: { shark: Shark }) {
  return (
    <Link href={`/sharks/${shark.id}`}>
      <div className="group relative rounded-2xl glass glass-hover p-6 cursor-pointer glow-green">
        {/* Staked badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium">
          <Shield size={12} />
          Verified
        </div>

        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-500/20 to-emerald-500/20 flex items-center justify-center text-2xl border border-brand-500/20">
            {shark.avatar}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">
              {shark.name}
            </h3>
            <p className="text-xs text-zinc-500">{shark.title}</p>
          </div>
        </div>

        {/* Staked Amount */}
        <div className="mb-4 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10">
          <div className="text-xs text-zinc-500 mb-1">Staked Amount</div>
          <div className="text-2xl font-bold text-gradient">
            ${shark.stakedAmount.toLocaleString()}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {shark.sectors.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 text-xs border border-white/5">
              {s}
            </span>
          ))}
          <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20">
            {shark.stage}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-xs text-zinc-500">Deals</div>
            <div className="text-sm font-medium">{shark.dealsCompleted}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Success Rate</div>
            <div className="text-sm font-medium flex items-center gap-1">
              <TrendingUp size={12} className="text-brand-400" />
              {shark.successRate}%
            </div>
          </div>
        </div>

        {/* CTA */}
        <button className="w-full py-2.5 rounded-xl bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-black font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 border border-brand-500/20 hover:border-brand-500 group-hover:bg-brand-500 group-hover:text-black">
          Pitch Me
          <ExternalLink size={14} />
        </button>
      </div>
    </Link>
  );
}
