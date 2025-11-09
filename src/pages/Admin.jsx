import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Shield, Users, Coins, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creditAdjustment, setCreditAdjustment] = useState('');
  const queryClient = useQueryClient();

  const createPageUrl = (pageName) => {
    switch (pageName) {
      case 'Home':
        return '/';
      default:
        return `/${pageName.toLowerCase()}`;
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      return await base44.entities.User.list('-created_date');
    },
    enabled: !!user,
  });

  const { data: allListings } = useQuery({
    queryKey: ['all-listings-admin'],
    queryFn: async () => {
      return await base44.entities.Listing.list('-created_date', 50);
    },
    enabled: !!user,
  });

  const adjustCreditsMutation = useMutation({
    mutationFn: async ({ userId, amount }) => {
      const users = await base44.entities.User.filter({ id: userId });
      const targetUser = users[0];
      const newBalance = (targetUser.credits_balance || 0) + amount;
      
      await base44.entities.User.update(userId, {
        credits_balance: Math.max(0, newBalance)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setCreditAdjustment('');
      setSelectedUser(null);
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B08968]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-[#B08968]" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">Manage users and platform settings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Users</h3>
            </div>
            <p className="text-3xl font-bold text-[#2D3648]">{allUsers?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total registered</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-8 h-8 text-amber-600" />
              <h3 className="font-semibold text-gray-900">Listings</h3>
            </div>
            <p className="text-3xl font-bold text-[#2D3648]">{allListings?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Total created</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="w-8 h-8 text-green-600" />
              <h3 className="font-semibold text-gray-900">Total Credits</h3>
            </div>
            <p className="text-3xl font-bold text-[#2D3648]">
              £{allUsers?.reduce((sum, u) => sum + (u.credits_balance || 0), 0).toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-500 mt-1">In circulation</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white grid w-full grid-cols-2 lg:w-auto lg:inline-grid border border-gray-200 rounded-lg p-1">
            <TabsTrigger value="users" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600 rounded-md">Users</TabsTrigger>
            <TabsTrigger value="listings" className="data-[state=active]:bg-gray-100 data-[state=active]:text-gray-900 text-gray-600 rounded-md">Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {Array(5).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full bg-gray-200" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allUsers?.map((u) => (
                      <div key={u.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{u.name}</h3>
                            <p className="text-sm text-gray-600">{u.email}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {u.verified && (
                                <Badge className="bg-green-100 text-green-700 border border-green-200">Email Verified</Badge>
                              )}
                              {u.role === 'admin' && (
                                <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Admin</Badge>
                              )}
                              <Badge variant="outline" className="border-gray-300 text-gray-700">
                                Credits: £{(u.credits_balance || 0).toFixed(2)}
                              </Badge>
                              {u.rating_count > 0 && (
                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
                                  Rating: {((u.average_rating || u.rating_sum / u.rating_count) || 0).toFixed(1)} ★ ({u.rating_count})
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(u)}
                            className="border-[#B08968] text-[#B08968] hover:bg-[#B08968]/10 rounded-lg"
                          >
                            Adjust Credits
                          </Button>
                        </div>

                        {selectedUser?.id === u.id && (
                          <div className="pt-3 border-t border-gray-200 space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor={`credit-adjustment-${u.id}`} className="text-gray-900">Credit Adjustment</Label>
                              <div className="flex gap-2">
                                <Input
                                  id={`credit-adjustment-${u.id}`}
                                  type="number"
                                  step="0.01"
                                  placeholder="Amount (+ or -)"
                                  value={creditAdjustment}
                                  onChange={(e) => setCreditAdjustment(e.target.value)}
                                  className="bg-gray-50 border-gray-300 text-gray-900 rounded-lg"
                                />
                                <Button
                                  onClick={() => {
                                    const amount = parseFloat(creditAdjustment);
                                    if (!isNaN(amount)) {
                                      adjustCreditsMutation.mutate({ userId: u.id, amount });
                                    }
                                  }}
                                  disabled={adjustCreditsMutation.isPending}
                                  className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold rounded-lg"
                                >
                                  Apply
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setSelectedUser(null)}
                                  className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="listings">
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900">All Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allListings?.map((listing) => (
                    <div key={listing.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {listing.photos?.[0] ? (
                          <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-full h-full p-3 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{listing.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border border-gray-200">{listing.category}</Badge>
                          <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">{listing.status}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#B08968]">£{listing.start_price.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Start price</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}