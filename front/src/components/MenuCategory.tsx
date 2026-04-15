import React from 'react';
import { MenuItem } from '@/models/MenuItem';

interface Props {
  name: string;
  icon: string;
  items: MenuItem[];
}

export default function MenuCategory({ name, icon, items }: Props) {
  return (
    <div className="backlit panel-glow rounded-lg overflow-hidden h-fit">
      {/* Category Header */}
      <div className="px-4 py-2.5 border-b border-orange-500/20 bg-gradient-to-r from-orange-950/40 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <h2 className="font-display text-sm font-bold tracking-wider text-orange-300 uppercase">
            {name}
          </h2>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-start justify-between gap-3 py-1.5 px-2 rounded-md hover:bg-white/[0.03] transition-colors"
          >
            <div className="min-w-0 flex-1">
              <h3 className="font-body font-semibold text-sm text-white/95 group-hover:text-orange-200 transition-colors leading-tight">
                {item.name}
              </h3>
              <p className="text-[11px] text-white/40 leading-snug mt-0.5 line-clamp-2">
                {item.description}
              </p>
            </div>
            <div className="shrink-0 pt-0.5">
              <span className="font-display text-sm font-bold text-yellow-400 tabular-nums">
                {item.price.toFixed(2)}€
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
