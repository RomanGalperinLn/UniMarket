import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function InitializeUserData({ user }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const initializeUserData = async () => {
      try {
        // Check if virtual card already exists
        const existingCards = await base44.entities.VirtualCard.filter({ user_id: user.id });
        
        if (existingCards.length === 0) {
          // Create virtual card
          const currentYear = new Date().getFullYear();
          await base44.entities.VirtualCard.create({
            user_id: user.id,
            brand: 'Visa (Demo)',
            last4: '4242',
            exp_month: 12,
            exp_year: currentYear + 3,
            cvc: '123',
            token: 'tok_demo_' + Math.random().toString(36).substr(2, 16),
            status: 'Active'
          });
        }

        // Check if wallet already exists
        const existingWallets = await base44.entities.VirtualWallet.filter({ user_id: user.id });
        
        if (existingWallets.length === 0) {
          // Create virtual wallet
          await base44.entities.VirtualWallet.create({
            user_id: user.id,
            demo_balance: 100.00
          });
        }

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['virtual-cards'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
      } catch (error) {
        console.error('Failed to initialize user data:', error);
      }
    };

    initializeUserData();
  }, [user?.id, queryClient]);

  return null;
}