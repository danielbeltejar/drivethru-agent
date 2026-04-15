import React, { useState } from 'react';
import MenuBoard from '@/components/MenuBoard';
import VoiceChat from '@/components/VoiceChat';
import OrderPanel from '@/components/OrderPanel';
import { useMenu } from '@/hooks/useMenu';
import { useClientId } from '@/hooks/useClientId';
import { Order } from '@/models/OrderMessage';

export default function DriveThrough() {
  const { menu, loading, error } = useMenu();
  const { clientId, resetClientId } = useClientId();
  const [currentOrder, setCurrentOrder] = useState<Order>({ items: [], subtotal: 0, tax: 0, total: 0 });
  const [orderClosed, setOrderClosed] = useState(false);

  const handleOrderUpdate = (order: Order) => {
    setCurrentOrder(order);
  };

  const handleOrderClosed = () => {
    setOrderClosed(true);
  };

  const handleNewOrder = () => {
    setCurrentOrder({ items: [], subtotal: 0, tax: 0, total: 0 });
    setOrderClosed(false);
    resetClientId();
  };

  return (
    <div className="h-full w-full flex flex-col relative noise-overlay overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0f05] via-[#0c0c0c] to-[#0c0c0c] z-0" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center py-4 px-6 shrink-0">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-display font-black tracking-wider neon-text text-orange-400">
            COSMO BURGER
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-orange-500/50" />
            <p className="text-[10px] font-display tracking-[0.3em] text-orange-300/60 uppercase">
              Drive-Through
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-orange-500/50" />
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex min-h-0 gap-4 px-4 pb-2">
        {/* Menu Board */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-orange-400 font-display text-lg animate-pulse">
                Cargando menú...
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400 font-body text-center">
                <p className="text-lg font-semibold">Error al cargar el menú</p>
                <p className="text-sm text-red-300/60 mt-1">Verifica que el backend esté ejecutándose</p>
              </div>
            </div>
          )}
          {menu && <MenuBoard menu={menu} />}
        </div>

        {/* Order Panel - Side */}
        <div className="w-72 xl:w-80 shrink-0 hidden md:block">
          <OrderPanel
            order={currentOrder}
            orderClosed={orderClosed}
            onNewOrder={handleNewOrder}
          />
        </div>
      </div>

      {/* Voice Chat - Bottom */}
      <div className="relative z-10 shrink-0">
        <VoiceChat
          clientId={clientId}
          onOrderUpdate={handleOrderUpdate}
          onOrderClosed={handleOrderClosed}
          orderClosed={orderClosed}
        />
      </div>
    </div>
  );
}
