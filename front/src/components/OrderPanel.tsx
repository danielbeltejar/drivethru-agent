import React from 'react';
import { Order } from '@/models/OrderMessage';

interface Props {
  order: Order;
  orderClosed: boolean;
  onNewOrder: () => void;
}

export default function OrderPanel({ order, orderClosed, onNewOrder }: Props) {
  const hasItems = order.items.length > 0;

  return (
    <div className="backlit panel-glow rounded-lg h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-orange-500/20 bg-gradient-to-r from-orange-950/40 to-transparent">
        <h2 className="font-display text-xs font-bold tracking-wider text-orange-300 uppercase">
          Tu Pedido
        </h2>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {!hasItems && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-3xl mb-2 opacity-30">🎙️</div>
              <p className="text-xs text-white/30 font-body">
                Habla con Alex para<br />hacer tu pedido
              </p>
            </div>
          </div>
        )}
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-orange-500/20 text-orange-300 text-[10px] font-display font-bold w-5 h-5 rounded flex items-center justify-center shrink-0">
                  {item.quantity}
                </span>
                <span className="text-sm font-body text-white/90 truncate">{item.name}</span>
              </div>
            </div>
            <span className="text-sm font-display font-bold text-yellow-400 shrink-0 ml-2 tabular-nums">
              {item.total.toFixed(2)}€
            </span>
          </div>
        ))}
      </div>

      {/* Totals */}
      {hasItems && (
        <div className="border-t border-orange-500/20 p-3 space-y-1.5 shrink-0 bg-black/20">
          <div className="flex justify-between text-xs font-body text-white/50">
            <span>Subtotal</span>
            <span className="tabular-nums">{order.subtotal.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-xs font-body text-white/50">
            <span>IVA (10%)</span>
            <span className="tabular-nums">{order.tax.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-base font-display font-bold text-orange-300 pt-1 border-t border-orange-500/10">
            <span>TOTAL</span>
            <span className="neon-text tabular-nums">{order.total.toFixed(2)}€</span>
          </div>
        </div>
      )}

      {/* Closed state */}
      {orderClosed && (
        <div className="border-t border-green-500/20 p-3 shrink-0">
          <div className="text-center mb-2">
            <span className="text-green-400 text-xs font-display tracking-wider">PEDIDO CONFIRMADO</span>
          </div>
          <button
            onClick={onNewOrder}
            className="w-full py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-display text-xs tracking-wider transition-colors"
          >
            NUEVO PEDIDO
          </button>
        </div>
      )}
    </div>
  );
}
