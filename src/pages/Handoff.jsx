import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Key, QrCode, Mail, Copy, AlertTriangle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';

export default function Handoff() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');

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

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId && !!user,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders-for-listing', listingId],
    queryFn: async () => {
      const allOrders = await base44.entities.Order.filter({ listing_id: listingId }, '-created_date');
      // Filter for Pending/Ready orders
      return allOrders.filter(o => o.status === 'Pending' || o.status === 'Ready');
    },
    enabled: !!listingId && !!user,
  });

  const { data: buyers } = useQuery({
    queryKey: ['buyers', orders],
    queryFn: async () => {
      if (!orders || orders.length === 0) return {};
      const buyerIds = [...new Set(orders.map(o => o.buyer_id))];
      const buyerPromises = buyerIds.map(id => 
        base44.entities.User.filter({ id }).then(users => users[0])
      );
      const buyerList = await Promise.all(buyerPromises);
      return Object.fromEntries(buyerList.map(b => [b.id, b]));
    },
    enabled: !!orders && orders.length > 0,
  });

  // Auto-select the most recent order
  useEffect(() => {
    if (orders && orders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders]);

  const selectedOrder = orders?.find(o => o.id === selectedOrderId);

  const generateHandoffCodeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error('No order selected');

      // Check if active code exists
      if (selectedOrder.handoff_code && selectedOrder.handoff_expires_at) {
        const expiresAt = new Date(selectedOrder.handoff_expires_at);
        const now = new Date();
        if (now < expiresAt) {
          throw new Error(`Active code already exists (expires at ${expiresAt.toLocaleString()})`);
        }
      }

      // Generate 6-digit code
      const code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      
      // Generate 32-char token
      const token = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
      const qrToken = token.substr(0, 32);

      // Set expiry to 2 hours
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 2);

      await base44.entities.Order.update(selectedOrder.id, {
        handoff_code: code,
        handoff_qr_token: qrToken,
        handoff_expires_at: expiresAt.toISOString(),
        handoff_attempts: 0,
        handoff_max_attempts: 5,
        status: 'Ready'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-for-listing'] });
    },
  });

  const sendToBuyerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder || !selectedOrder.handoff_code) {
        throw new Error('No code generated yet');
      }

      const buyer = buyers[selectedOrder.buyer_id];
      if (!buyer) throw new Error('Buyer not found');

      const deepLink = `${window.location.origin}${createPageUrl('VerifyHandoff')}?oid=${selectedOrder.id}&t=${selectedOrder.handoff_qr_token}`;

      await base44.integrations.Core.SendEmail({
        to: buyer.email,
        subject: `Pickup code for ${listing.title}`,
        body: `
Hi ${buyer.name || 'there'},

Your item "${listing.title}" is ready for pickup!

Your 6-digit confirmation code: ${selectedOrder.handoff_code}

Or click this one-tap link to confirm:
${deepLink}

IMPORTANT:
- Do not share this code with anyone else
- Only confirm after you physically have the item
- This code expires at ${new Date(selectedOrder.handoff_expires_at).toLocaleString()}

Thanks,
UniMarket Team
        `
      });
    },
    onSuccess: () => {
      alert('Email sent to buyer!');
    },
    onError: (err) => {
      alert('Failed to send email: ' + err.message);
    },
  });

  const copyLink = () => {
    if (!selectedOrder?.handoff_qr_token) return;
    const deepLink = `${window.location.origin}${createPageUrl('VerifyHandoff')}?oid=${selectedOrder.id}&t=${selectedOrder.handoff_qr_token}`;
    navigator.clipboard.writeText(deepLink);
    setCopySuccess('Link copied!');
    setTimeout(() => setCopySuccess(''), 3000);
  };

  if (listingLoading || ordersLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Listing not found</h2>
          <Button onClick={() => navigate(createPageUrl('SellDashboard'))}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (user.id !== listing.seller_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
          <p className="text-slate-600 mb-4">You can only manage handoff codes for your own listings</p>
          <Button onClick={() => navigate(createPageUrl('SellDashboard'))}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('SellDashboard'))}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card>
            <CardContent className="p-12 text-center">
              <Key className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">No Active Orders</h2>
              <p className="text-slate-600 mb-4">
                This listing has no pending or ready orders. Once a buyer purchases, you can generate a handoff code here.
              </p>
              <Button onClick={() => navigate(createPageUrl('SellDashboard'))}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isCodeActive = selectedOrder?.handoff_code && selectedOrder?.handoff_expires_at && 
    new Date() < new Date(selectedOrder.handoff_expires_at);
  
  const timeUntilExpiry = selectedOrder?.handoff_expires_at 
    ? Math.max(0, (new Date(selectedOrder.handoff_expires_at) - new Date()) / (1000 * 60 * 60))
    : null;

  const qrUrl = selectedOrder?.handoff_qr_token 
    ? `${window.location.origin}${createPageUrl('VerifyHandoff')}?oid=${selectedOrder.id}&t=${selectedOrder.handoff_qr_token}`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl('SellDashboard'))}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Handoff Code</h1>
          <p className="text-slate-600">{listing.title}</p>
        </div>

        {/* Order Selection */}
        {orders.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Select Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Choose which order to generate a code for:</Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => {
                      const buyer = buyers?.[order.buyer_id];
                      return (
                        <SelectItem key={order.id} value={order.id}>
                          {buyer?.name || buyer?.email || 'Unknown'} - £{order.final_price.toFixed(2)} - {order.status}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Status */}
        {selectedOrder && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Buyer</p>
                  <p className="font-semibold">{buyers?.[selectedOrder.buyer_id]?.name || 'Loading...'}</p>
                </div>
                <div>
                  <p className="text-slate-600">Status</p>
                  <Badge className={selectedOrder.status === 'Ready' ? 'bg-blue-600' : 'bg-yellow-600'}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-600">Order Total</p>
                  <p className="font-semibold">£{selectedOrder.final_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-600">Attempts Used</p>
                  <p className="font-semibold">{selectedOrder.handoff_attempts || 0} / {selectedOrder.handoff_max_attempts || 5}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Code Section */}
        <Card className="mb-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              6-Digit Handoff Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                <strong>How it works:</strong> Generate a 6-digit code and share it with the buyer (or send the link). The code expires in 2 hours.
              </AlertDescription>
            </Alert>

            {!isCodeActive ? (
              <div>
                <p className="text-sm text-slate-600 mb-4">
                  Generate a secure 6-digit code for the buyer to confirm they received the item.
                </p>
                <Button
                  onClick={() => generateHandoffCodeMutation.mutate()}
                  disabled={generateHandoffCodeMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {generateHandoffCodeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Generate 6-Digit Code
                    </>
                  )}
                </Button>
                {generateHandoffCodeMutation.error && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertDescription>{generateHandoffCodeMutation.error.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div>
                <Alert className="bg-amber-50 border-amber-300 mb-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-900">
                    <strong>Share this code with the buyer</strong> when you meet to hand over the item.
                  </AlertDescription>
                </Alert>

                {/* Large Code Display */}
                <div className="bg-white rounded-lg p-8 text-center mb-4 border-2 border-indigo-200">
                  <p className="text-sm text-slate-600 mb-2">Your Handoff Code</p>
                  <p className="text-7xl font-bold text-indigo-600 tracking-wider font-mono">
                    {selectedOrder.handoff_code}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600 mt-3">
                    <Clock className="w-4 h-4" />
                    <p>Expires in {timeUntilExpiry?.toFixed(1)} hours</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <Button
                    onClick={() => sendToBuyerMutation.mutate()}
                    disabled={sendToBuyerMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {sendToBuyerMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send to Buyer via Email
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={copyLink}
                    variant="outline"
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {copySuccess || 'Copy Link'}
                  </Button>
                </div>

                {/* QR Code */}
                <div className="bg-white rounded-lg p-6 text-center border">
                  <p className="text-sm text-slate-600 mb-3">Or let buyer scan this QR code:</p>
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                    alt="Handoff QR Code"
                    className="mx-auto rounded-lg shadow-md"
                  />
                </div>

                {/* Status Info */}
                <div className="mt-4 p-4 bg-white rounded-lg border">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 mb-1">Next Steps:</p>
                      <ul className="text-sm text-slate-600 space-y-1">
                        <li>• Share this code or link with the buyer</li>
                        <li>• Buyer will confirm on their side</li>
                        <li>• We'll finalize the order and release your payment</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}