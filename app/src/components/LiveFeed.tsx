"use client";
import { liveFeed } from "@/lib/mock-data";
import { Zap, CheckCircle, Clock, Eye } from "lucide-react";

const statusConfig = {
  funded: { icon: CheckCircle, color: "text-brand-400", bg: "bg-brand-500/10", label: "Funded" },
  pitched: { icon: Zap, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Pitched" },
  reviewing: { icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10", label: "Reviewing" },
};

export default function LiveFeed() {
  return (
    <div className="space-y-2">
      {liveFeed.map((deal) => {
        const cfg = statusConfig[deal.status];
        const Icon = cfg.icon;
        return (
          <div
            key={deal.id}
            className="flex items-center justify-between p-3 rounded-xl glass glass-hover"
          >
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                <Icon size={14} className={cfg.color} />
              </div>
              <div>
                <span className="text-sm font-medium">{deal.sharkName}</span>
                <span className="text-zinc-500 text-sm"> → </span>
                <span className="text-sm text-zinc-300">{deal.projectName}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gradient">
                ${deal.amount.toLocaleString()}
              </span>
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock size={10} />
                {deal.timestamp}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
