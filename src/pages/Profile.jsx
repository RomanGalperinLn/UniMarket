
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, Package, Gavel, ShoppingBag, CheckCircle, Star, CreditCard, Wallet, Plus, AlertCircle, Mail, Shield, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RatingStars from '../components/marketplace/RatingStars';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [saving, setSaving] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setStripeAccountId(currentUser.stripe_connect_id || '');
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const { data: myListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['my-listings', user?.id],
    queryFn: async () => {
      return await base44.entities.Listing.filter({ seller_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const { data: myBids } = useQuery({
    queryKey: ['my-bids', user?.id],
    queryFn: async () => {
      return await base44.entities.Bid.filter({ bidder_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const { data: myPurchases } = useQuery({
    queryKey: ['my-purchases', user?.id],
    queryFn: async () => {
      return await base44.entities.Order.filter({ buyer_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const { data: virtualCards, isLoading: cardsLoading } = useQuery({
    queryKey: ['virtual-cards', user?.id],
    queryFn: async () => {
      return await base44.entities.VirtualCard.filter({ user_id: user.id });
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

  const { data: auctions } = useQuery({
    queryKey: ['auctions-for-bids'],
    queryFn: async () => {
      return await base44.entities.Auction.list('-created_date', 100);
    },
    enabled: !!myBids?.length,
  });

  const createDemoCardMutation = useMutation({
    mutationFn: async () => {
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

      const existingWallets = await base44.entities.VirtualWallet.filter({ user_id: user.id });
      if (existingWallets.length === 0) {
        await base44.entities.VirtualWallet.create({
          user_id: user.id,
          demo_balance: 100.00
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-cards'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });

  const sendVerificationEmailMutation = useMutation({
    mutationFn: async () => {
      if (resendCooldown > 0) {
        throw new Error(`Please wait ${resendCooldown} seconds before resending`);
      }

      const token = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
      const tokenString = token.substr(0, 28);
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const now = new Date();

      await base44.auth.updateMe({
        verification_token: tokenString,
        verification_expires_at: expiresAt.toISOString(),
        last_verification_sent_at: now.toISOString()
      });

      const verificationUrl = `${window.location.origin}${createPageUrl('Verify')}?uid=${user.id}&token=${tokenString}`;
      
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: 'Verify your email — UniMarket',
        body: `Hi ${user.name || 'there'},

Welcome to UniMarket! Please verify your email address to unlock all features.

Click here to verify:
${verificationUrl}

This link expires in 24 hours.

Thanks,
The UniMarket Team`
      });

      return tokenString;
    },
    onSuccess: async () => {
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);
      
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
  });

  const handleSaveStripeAccount = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ stripe_connect_id: stripeAccountId });
      setUser(prev => ({ ...prev, stripe_connect_id: stripeAccountId }));
    } catch (error) {
      console.error('Failed to save Stripe account', error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B08968]" />
          <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-[#B08968] opacity-20" />
        </div>
      </div>
    );
  }

  const myBidsWithDetails = myBids?.map(bid => {
    const auction = auctions?.find(a => a.id === bid.auction_id);
    return { ...bid, auction };
  }) || [];

  const averageRating = user.rating_count > 0 
    ? (user.average_rating || user.rating_sum / user.rating_count) 
    : 0;

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your listings, bids, and account settings</p>
        </div>

        {/* Verification Alert */}
        {!user.verified && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-gray-900">
                <strong className="text-blue-600">Verify your email to enable all features.</strong> Check your inbox or request a new link.
              </span>
              <Button
                onClick={() => sendVerificationEmailMutation.mutate()}
                disabled={sendVerificationEmailMutation.isPending || resendCooldown > 0}
                size="sm"
                className="bg-[#B08968] hover:bg-[#9A7456] text-white ml-4 rounded-lg shadow-sm"
              >
                {sendVerificationEmailMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send verification email
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {sendVerificationEmailMutation.isSuccess && !sendVerificationEmailMutation.isPending && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-gray-900">
              Verification email sent to <strong className="text-green-600">{user.email}</strong>. Check your inbox!
            </AlertDescription>
          </Alert>
        )}

        {sendVerificationEmailMutation.error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              {sendVerificationEmailMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Coins className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Credits</h3>
            </div>
            <p className="text-3xl font-bold text-[#B08968]">
              £{(user.credits_balance || 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Reduce app fees on wins</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Listings</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{myListings?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Items you're selling</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Gavel className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Bids</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{myBids?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active bids placed</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Rating</h3>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-3xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">{user.rating_count} ratings</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="bg-white grid w-full grid-cols-5 lg:w-auto lg:inline-grid border border-gray-200 rounded-lg p-1">
            <TabsTrigger value="listings" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600 rounded-md">My Listings</TabsTrigger>
            <TabsTrigger value="bids" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600 rounded-md">My Bids</TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600 rounded-md">Purchases</TabsTrigger>
            <TabsTrigger value="cards" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600 rounded-md">Saved Cards</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600 rounded-md">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-4">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">My Listings</CardTitle>
              </CardHeader>
              <CardContent>
                {listingsLoading ? (
                  <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full bg-gray-200 rounded-lg" />
                    ))}
                  </div>
                ) : myListings?.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">You haven't listed any items yet</p>
                    <Link to={createPageUrl('ListingNew')}>
                      <Button className="bg-[#B08968] hover:bg-[#9A7456] text-white rounded-lg">
                        Create First Listing
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myListings.map((listing) => (
                      <Link
                        key={listing.id}
                        to={createPageUrl(`ListingDetail?id=${listing.id}`)}
                        className="block"
                      >
                        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            {listing.photos?.[0] ? (
                              <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{listing.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border border-gray-200">{listing.category}</Badge>
                              <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">{listing.status}</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-[#B08968]">£{listing.start_price.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Start price</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bids" className="space-y-4">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">My Bids</CardTitle>
              </CardHeader>
              <CardContent>
                {myBidsWithDetails.length === 0 ? (
                  <div className="text-center py-12">
                    <Gavel className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">You haven't placed any bids yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myBidsWithDetails.map((bid) => (
                      <div key={bid.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div>
                          <p className="font-medium text-gray-900">Auction #{bid.auction_id.slice(0, 8)}...</p>
                          <p className="text-sm text-gray-600">
                            Placed {new Date(bid.created_date).toLocaleDateString()}
                          </p>
                          {bid.auction && bid.auction.current_price === bid.amount && (
                            <Badge className="mt-2 bg-blue-100 text-blue-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Winning Bid
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-[#B08968]">£{bid.amount.toFixed(2)}</p>
                          {bid.auction && (
                            <p className="text-sm text-gray-500">
                              Current: £{bid.auction.current_price.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">My Purchases</CardTitle>
              </CardHeader>
              <CardContent>
                {myPurchases?.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No purchases yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myPurchases?.map((order) => (
                      <Link
                        key={order.id}
                        to={createPageUrl(`OrderDetail?id=${order.id}`)}
                        className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{order.listing_title}</h3>
                            <p className="text-sm text-gray-600">
                              Purchased {new Date(order.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={
                            order.status === 'Completed' ? 'bg-green-500 text-white' :
                            order.status === 'Pending' ? 'bg-blue-500 text-white' : 
                            order.status === 'Disputed' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'
                          }>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Final Price</p>
                            <p className="font-semibold text-gray-900">£{order.final_price.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">App Fee</p>
                            <p className="font-semibold text-gray-900">£{order.app_fee_final.toFixed(2)}</p>
                          </div>
                          {order.credits_applied > 0 && (
                            <div>
                              <p className="text-gray-600">Credits Used</p>
                              <p className="font-semibold text-green-600">-£{order.credits_applied.toFixed(2)}</p>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-gray-900">Saved Cards</CardTitle>
                <Badge className="bg-[#B08968] text-white">Test Mode</Badge>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6 bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-gray-800">
                    <strong>Demo Only:</strong> These are test cards for simulated payments. No real charges will be made.
                  </AlertDescription>
                </Alert>

                {cardsLoading ? (
                  <Skeleton className="h-48 w-full bg-gray-200 rounded-lg" />
                ) : virtualCards?.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No saved cards yet</p>
                    <Button
                      onClick={() => createDemoCardMutation.mutate()}
                      disabled={createDemoCardMutation.isPending}
                      className="bg-[#B08968] hover:bg-[#9A7456] text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createDemoCardMutation.isPending ? 'Creating...' : 'Create Demo Card'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {virtualCards.map((card) => (
                      <div key={card.id} className="relative overflow-hidden">
                        <div className="bg-gradient-to-br from-[#B08968] to-[#D4AF37] rounded-2xl p-6 text-white shadow-lg">
                          <div className="flex items-start justify-between mb-8">
                            <div>
                              <p className="text-xs opacity-75 mb-1">DEMO CARD</p>
                              <p className="text-lg font-semibold">{card.brand}</p>
                            </div>
                            <Badge className={
                              card.status === 'Active' 
                                ? 'bg-white text-[#B08968]' 
                                : 'bg-white/20 text-gray-900'
                            }>
                              {card.status}
                            </Badge>
                          </div>
                          
                          <div className="mb-6">
                            <p className="text-2xl tracking-wider font-mono">
                              4242 4242 4242 {card.last4}
                            </p>
                          </div>
                          
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs opacity-75">EXPIRES</p>
                              <p className="font-semibold">
                                {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs opacity-75">CVC</p>
                              <p className="font-semibold">{card.cvc}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full blur-3xl"></div>
                      </div>
                    ))}

                    {wallet && (
                      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Wallet className="w-6 h-6 text-green-600" />
                              <div>
                                <p className="text-sm text-gray-600">Demo Balance</p>
                                <p className="text-2xl font-bold text-gray-900">
                                  £{wallet.demo_balance?.toFixed(2) || '0.00'}
                                </p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">Virtual Wallet</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">User Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600">Name:</span> <span className="font-medium text-gray-900">{user.name}</span></p>
                    <p className="flex items-center gap-2">
                      <span className="text-gray-600">Email:</span> 
                      <span className="font-medium text-gray-900">{user.email}</span>
                      {user.verified ? (
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-600 border border-gray-300">
                          Unverified
                        </Badge>
                      )}
                    </p>
                    {user.rating_count > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Rating:</span>
                        <RatingStars rating={averageRating} count={user.rating_count} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    Email Verification
                  </h3>
                  {user.verified ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-gray-900">
                        Your email is verified. You have full vault access.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-3">
                        Verify your email address to unlock all marketplace features and build trust.
                      </p>
                      <Button
                        onClick={() => sendVerificationEmailMutation.mutate()}
                        disabled={sendVerificationEmailMutation.isPending || resendCooldown > 0}
                        className="bg-[#B08968] hover:bg-[#9A7456] text-white rounded-lg"
                      >
                        {sendVerificationEmailMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending verification link...
                          </>
                        ) : resendCooldown > 0 ? (
                          `Resend in ${resendCooldown}s`
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Get verification link
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Stripe Connect (For Sellers)</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Connect your Stripe account to receive payouts when items sell
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="acct_xxxxxxxxxxxxx"
                      value={stripeAccountId}
                      onChange={(e) => setStripeAccountId(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-[#B08968] rounded-lg"
                    />
                    <Button
                      onClick={handleSaveStripeAccount}
                      disabled={saving}
                      className="bg-[#B08968] hover:bg-[#9A7456] text-white rounded-lg"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  {user.stripe_connect_id && (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Stripe account connected
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Credits Balance</h3>
                  <p className="text-3xl font-bold text-[#B08968]">
                    £{(user.credits_balance || 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Earn 2% back on purchases (up to £10 per order). Credits reduce app fees when you win auctions.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
