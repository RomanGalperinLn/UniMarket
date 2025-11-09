
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, QrCode, Package } from 'lucide-react';

export default function VerifyHandoff() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [canConfirm, setCanConfirm] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const oid = urlParams.get('oid');
  const t = urlParams.get('t');
  const scan = urlParams.get('scan');

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
    queryKey: ['order-verify', oid],
    queryFn: async () => {
      if (!oid) return null;
      const orders = await base44.entities.Order.filter({ id: oid });
      return orders[0];
    },
    enabled: !!oid && !!user,
  });

  useEffect(() => {
    if (!user || !order) return;

    // If scan mode and no token, just show camera/QR scanner instructions
    if (scan === 'true' && !t) {
      setVerifying(false);
      setError('Please scan the QR code shown by the seller');
      return;
    }

    // Validate the order and token
    validateOrder();
  }, [user, order, t, scan]);

  const validateOrder = async () => {
    try {
      if (!oid || !t) {
        throw new Error('Invalid link.');
      }

      if (!order) {
        throw new Error('Order not found.');
      }

      // Check if current user is the buyer
      if (user.id !== order.buyer_id) {
        throw new Error('Only the buyer can confirm this handoff.');
      }

      // Check if token matches
      if (order.handoff_qr_token !== t) {
        throw new Error('Invalid or expired QR code.');
      }

      // Check if code has expired
      if (order.handoff_expires_at) {
        const expiresAt = new Date(order.handoff_expires_at);
        const now = new Date();
        
        if (now > expiresAt) {
          throw new Error('Code expired—ask seller to generate a new one');
        }
      }

      // Check attempt limits
      if (order.handoff_attempts >= order.handoff_max_attempts) {
        throw new Error('Too many attempts—ask seller to regenerate');
      }

      // All checks passed
      setCanConfirm(true);
      setError('');
    } catch (err) {
      setError(err.message);
      setCanConfirm(false);
    } finally {
      setVerifying(false);
    }
  };

  const confirmHandoffMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();

      // Mark as delivered and capture payment
      await base44.entities.Order.update(order.id, {
        handoff_confirmed_by: user.id,
        handoff_confirmed_at: now.toISOString(),
        handoff_code: null,
        handoff_qr_token: null,
        delivery_confirmed_by_buyer: true,
        delivery_confirmed_at: now.toISOString(),
        status: 'Completed'
      });

      // Simulate Stripe capture
      console.log('Stripe PaymentIntent captured:', order.stripe_payment_intent_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order'] });
      // Redirect to order detail after short delay
      setTimeout(() => {
        navigate(createPageUrl(`OrderDetail?id=${order.id}`));
      }, 2000);
    },
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying QR Code...</h2>
            <p className="text-slate-600">Please wait while we verify the seller's code</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmHandoffMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Item Received Confirmed!</h2>
            <p className="text-slate-600 mb-6">
              Your order is complete. Payment has been released to the seller.
            </p>
            <Alert className="bg-green-50 border-green-200 mb-4">
              <AlertDescription className="text-green-900">
                Redirecting to order details...
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => navigate(createPageUrl(`OrderDetail?id=${order.id}`))}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              View Order Details
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-6 h-6 text-indigo-600" />
            Verify Seller's Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <>
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Failed</h2>
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>

              {scan === 'true' && !t && (
                <div className="text-center">
                  <div className="bg-slate-100 rounded-lg p-8 mb-4">
                    <QrCode className="w-24 h-24 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm text-slate-600">
                      Use your camera app to scan the QR code shown by the seller
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => navigate(createPageUrl(`OrderDetail?id=${oid}`))}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  Go to Order Details
                </Button>
                <p className="text-sm text-slate-600 text-center">
                  You can also ask the seller for their code and enter it manually
                </p>
              </div>
            </>
          ) : canConfirm && order ? (
            <>
              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-start gap-4 mb-4">
                  {order.listing_title && (
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1">{order.listing_title}</h3>
                      <Badge className="bg-green-600">Ready to Confirm</Badge>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">Order Total</p>
                    <p className="font-semibold text-lg">£{order.final_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Status</p>
                    <p className="font-semibold">{order.status}</p>
                  </div>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-900">
                  <strong>Confirm you received the item:</strong> By clicking below, you confirm that the seller gave you the item and authorize payment release.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => confirmHandoffMutation.mutate()}
                disabled={confirmHandoffMutation.isPending}
                className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg"
              >
                {confirmHandoffMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Confirm Received & Release Payment
                  </>
                )}
              </Button>

              <Button
                onClick={() => navigate(createPageUrl(`OrderDetail?id=${order.id}`))}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
