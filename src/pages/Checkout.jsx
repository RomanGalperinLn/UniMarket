
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, ShoppingCart, AlertCircle, CheckCircle, Info, CreditCard, Wallet, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin(window.location.pathname);
    }
  };

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId && !!user,
  });

  const { data: listing } = useQuery({
    queryKey: ['listing', order?.listing_id],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: order.listing_id });
      return listings[0];
    },
    enabled: !!order?.listing_id,
  });

  const { data: virtualCard } = useQuery({
    queryKey: ['virtual-card', user?.id],
    queryFn: async () => {
      const cards = await base44.entities.VirtualCard.filter({ user_id: user.id, status: 'Active' });
      return cards[0];
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      const wallets = await base44.entities.VirtualWallet.filter({ user_id: user.id });
      return wallets[0];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (order && order.status !== 'Pending') {
      navigate(createPageUrl(`OrderDetail?id=${order.id}`));
    }
  }, [order, navigate]);

  const payWithVirtualCardMutation = useMutation({
    mutationFn: async () => {
      if (!virtualCard || virtualCard.status !== 'Active') {
        throw new Error('Virtual card not active');
      }
      
      if (!wallet || wallet.demo_balance < order.final_price) {
        throw new Error('Insufficient demo balance');
      }

      await new Promise(resolve => setTimeout(resolve, 1500));

      const paymentIntentId = 'pi_demo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      await base44.entities.VirtualWallet.update(wallet.id, {
        demo_balance: wallet.demo_balance - order.final_price
      });

      const autoReleaseTime = new Date();
      autoReleaseTime.setHours(autoReleaseTime.getHours() + 72);

      await base44.entities.Order.update(order.id, {
        status: 'Pending',
        stripe_payment_intent_id: paymentIntentId,
        auto_release_time: autoReleaseTime.toISOString(),
      });

      if (listing) {
        await base44.entities.Listing.update(listing.id, {
          status: 'Sold',
        });
      }

      if (order.auction_id) {
        await base44.entities.Auction.update(order.auction_id, {
          status: 'Ended',
          winner_id: user.id,
        });
      }

      if (order.credits_applied > 0) {
        const newBalance = (user.credits_balance || 0) - order.credits_applied;
        await base44.auth.updateMe({ credits_balance: Math.max(0, newBalance) });
      }

      const creditsEarned = Math.min(10, Math.round(order.final_price * 0.02 * 100) / 100);
      const finalBalance = (user.credits_balance || 0) - (order.credits_applied || 0) + creditsEarned;
      await base44.auth.updateMe({ credits_balance: finalBalance });

      return order.id;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      navigate(createPageUrl(`OrderDetail?id=${orderId}`));
    },
    onError: (err) => {
      setError(err.message || 'Payment failed. Please try again.');
    },
  });

  const handleStripePayment = async () => {
    setProcessing(true);
    setError('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const paymentIntentId = 'pi_stripe_test_' + Date.now();
      const autoReleaseTime = new Date();
      autoReleaseTime.setHours(autoReleaseTime.getHours() + 72);

      await base44.entities.Order.update(order.id, {
        status: 'Pending',
        stripe_payment_intent_id: paymentIntentId,
        auto_release_time: autoReleaseTime.toISOString(),
      });

      if (listing) {
        await base44.entities.Listing.update(listing.id, {
          status: 'Sold',
        });
      }

      if (order.auction_id) {
        await base44.entities.Auction.update(order.auction_id, {
          status: 'Ended',
          winner_id: user.id,
        });
      }

      if (order.credits_applied > 0) {
        const newBalance = (user.credits_balance || 0) - order.credits_applied;
        await base44.auth.updateMe({ credits_balance: Math.max(0, newBalance) });
      }

      const creditsEarned = Math.min(10, Math.round(order.final_price * 0.02 * 100) / 100);
      const finalBalance = (user.credits_balance || 0) - (order.credits_applied || 0) + creditsEarned;
      await base44.auth.updateMe({ credits_balance: finalBalance });

      navigate(createPageUrl(`OrderDetail?id=${order.id}`));
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    if (!user.verified) {
      setError('Please verify your email before completing purchases. Check your Profile for the verification link.');
      return;
    }

    if (paymentMethod === 'virtual') {
      payWithVirtualCardMutation.mutate();
    } else {
      await handleStripePayment();
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#B08968]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h2>
          <Button onClick={() => navigate(createPageUrl('Home'))}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  if (order.buyer_id !== user.id) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">This order belongs to another user</p>
          <Button onClick={() => navigate(createPageUrl('Home'))}>
            Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const canUseVirtualCard = virtualCard?.status === 'Active' && wallet && wallet.demo_balance >= order.final_price;

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Test Mode Warning */}
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-gray-900">
            <strong>Test Mode:</strong> Payments are simulated with test cards. No real charges will be made.
          </AlertDescription>
        </Alert>

        {!user.verified && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-gray-900">
              <strong>Email verification required.</strong> Please verify your email to complete checkout.{' '}
              <Link to={createPageUrl('Profile')} className="underline font-semibold text-[#B08968]">
                Go to Profile
              </Link>
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="ghost"
          onClick={() => {
            if (listing) {
              navigate(createPageUrl(`ListingDetail?id=${listing.id}`));
            } else {
              navigate(createPageUrl('Home'));
            }
          }}
          className="mb-6 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Item
        </Button>

        <div className="mb-8 text-center">
          <ShoppingCart className="w-16 h-16 text-[#B08968] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
          <p className="text-gray-600">Review your order and proceed to payment</p>
        </div>

        {/* Order Summary */}
        <Card className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-gray-200">
              {listing?.photos?.[0] && (
                <img 
                  src={listing.photos[0]} 
                  alt={order.listing_title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{order.listing_title}</h3>
                <Badge variant="secondary" className="mt-2 bg-gray-100 text-gray-700 border border-gray-200">{listing?.category}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Price:</span>
                <span className="font-semibold text-gray-900">£{order.final_price.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-gray-600">
                <span>Platform Fee (10%):</span>
                <span className="font-semibold text-gray-900">£{order.app_fee_raw.toFixed(2)}</span>
              </div>

              {order.credits_applied > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Credits Applied:</span>
                  <span className="font-semibold">-£{order.credits_applied.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Final Platform Fee:</span>
                <span className="font-semibold text-gray-900">£{order.app_fee_final.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t border-gray-200">
                <span>Total to Pay:</span>
                <span className="text-[#B08968]">£{order.final_price.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              {/* Virtual Card Payment */}
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-colors ${
                canUseVirtualCard 
                  ? 'hover:bg-gray-50 cursor-pointer border-gray-200' 
                  : 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
              }`}
                   onClick={() => canUseVirtualCard && setPaymentMethod('virtual')}>
                <RadioGroupItem value="virtual" id="virtual" disabled={!canUseVirtualCard || !user.verified} />
                <Label htmlFor="virtual" className={`flex items-center gap-3 flex-1 ${canUseVirtualCard && user.verified ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <Wallet className="w-6 h-6 text-[#B08968]" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      Pay with Saved Demo Card (no typing)
                      <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border border-gray-200">Demo</Badge>
                    </p>
                    {virtualCard ? (
                      <>
                        <p className="text-sm text-gray-600">
                          {virtualCard.brand} •••• {virtualCard.last4} — Exp {virtualCard.exp_month}/{String(virtualCard.exp_year).slice(-2)} — CVC •••
                        </p>
                        <p className="text-sm text-gray-600">
                          Balance: £{wallet?.demo_balance?.toFixed(2) || '0.00'}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">No saved card available</p>
                    )}
                  </div>
                </Label>
                {!canUseVirtualCard && wallet && wallet.demo_balance < order.final_price && (
                  <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border border-red-200">Insufficient Balance</Badge>
                )}
                {!user.verified && (
                  <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border border-red-200">Email Not Verified</Badge>
                )}
              </div>

              {/* Stripe Payment */}
              <div className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-colors ${
                user.verified 
                  ? 'hover:bg-gray-50 cursor-pointer border-gray-200' 
                  : 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
              }`}
                   onClick={() => user.verified && setPaymentMethod('stripe')}>
                <RadioGroupItem value="stripe" id="stripe" disabled={!user.verified} />
                <Label htmlFor="stripe" className={`flex items-center gap-3 flex-1 ${user.verified ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <CreditCard className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Pay with Card (Stripe test checkout)</p>
                    <p className="text-sm text-gray-600">Enter test card: 4242 4242 4242 4242</p>
                  </div>
                </Label>
                {!user.verified && (
                  <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border border-red-200">Email Not Verified</Badge>
                )}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Escrow Notice */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-gray-900">
            <strong>Secure Payment:</strong> Your payment will be held securely until you confirm delivery. 
            Funds will be automatically released to the seller after 72 hours if no dispute is raised.
          </AlertDescription>
        </Alert>

        {/* Benefits */}
        <Card className="mb-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-xl shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Benefits of This Purchase
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✓ Earn £{Math.min(10, (order.final_price * 0.02)).toFixed(2)} in cashback credits</li>
              <li>✓ Funds held securely until delivery confirmation</li>
              <li>✓ 72-hour buyer protection period</li>
              <li>✓ Dispute resolution available if needed</li>
            </ul>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        {/* Payment Button */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <CardContent className="p-6">
            <Button
              onClick={handlePayment}
              disabled={processing || payWithVirtualCardMutation.isPending || !user.verified}
              className="w-full h-14 bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold text-lg rounded-lg shadow-md"
            >
              {(processing || payWithVirtualCardMutation.isPending) ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  {paymentMethod === 'virtual' ? (
                    <>
                      <Wallet className="w-5 h-5 mr-2" />
                      Pay £{order.final_price.toFixed(2)} with Saved Card
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Pay £{order.final_price.toFixed(2)} Securely
                    </>
                  )}
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-4">
              By completing this purchase, you agree to our terms of service
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
