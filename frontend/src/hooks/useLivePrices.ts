import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/providers/socket-provider';
import { TokenData } from '@/services/market.service';

export function useLivePrices() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const handlePriceUpdate = (payload: any) => {
      if (!Array.isArray(payload)) return;

      queryClient.setQueriesData({ queryKey: ['tokens'] }, (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;

        const updatedData = [...oldData.data];
        let hasChanges = false;

        payload.forEach((updateItem: TokenData) => {
          const index = updatedData.findIndex((t) => t.token_address === updateItem.token_address);
          if (index !== -1) {
            updatedData[index] = { ...updatedData[index], ...updateItem };
            hasChanges = true;
          }
        });

        if (hasChanges) {
          return { ...oldData, data: updatedData };
        }
        return oldData;
      });
      
      queryClient.setQueriesData({ queryKey: ['markets', 'trending'] }, (oldData: any) => {
        if (!oldData || !oldData.data) return oldData;

        const updatedData = [...oldData.data];
        let hasChanges = false;

        payload.forEach((updateItem: TokenData) => {
          const index = updatedData.findIndex((t) => t.token_address === updateItem.token_address);
          if (index !== -1) {
            updatedData[index] = { ...updatedData[index], ...updateItem };
            hasChanges = true;
          }
        });

        if (hasChanges) {
          return { ...oldData, data: updatedData };
        }
        return oldData;
      });
    };

    socket.on('price-update', handlePriceUpdate);
    socket.on('initial-data', handlePriceUpdate);

    return () => {
      socket.off('price-update', handlePriceUpdate);
      socket.off('initial-data', handlePriceUpdate);
    };
  }, [socket, queryClient]);
}
