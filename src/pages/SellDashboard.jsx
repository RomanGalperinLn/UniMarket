import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Gavel, TrendingUp, Clock, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function SellDashboard() {
  const [user, setUser] = useState(null);

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

  const { data: myListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['seller-listings', user?.id],
    queryFn: async () => {
      return await base44.entities.Listing.filter({ seller_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  const { data: myOrders } = useQuery({
    queryKey: ['seller-orders', user?.id],
    queryFn: async () => {
      return await base44.entities.Order.filter({ seller_id: user.id }, '-created_date');
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B08968]" />
      </div>
    );
  }

  const activeListings = myListings?.filter(l => l.status === 'Live').length || 0;
  const soldListings = myListings?.filter(l => l.status === 'Sold').length || 0;
  const totalRevenue = myOrders?.reduce((sum, o) => sum + (o.seller_payout || 0), 0) || 0;
  const pendingPayouts = myOrders?.filter(o => o.status === 'Pending' || o.status === 'Ready').length || 0;
  const recentSales = myOrders?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Seller Dashboard</h1>
            <p className="text-gray-600">Manage your listings and track your sales</p>
          </div>
          <Link to={createPageUrl('ListingNew')}>
            <Button className="bg-[#B08968] hover:bg-[#9A7456] text-white rounded-lg shadow-md">
              <Plus className="w-5 h-5 mr-2" />
              New Listing
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Active</h3>
            </div>
            <p className="text-3xl font-bold text-[#2D3648]">{activeListings}</p>
            <p className="text-xs text-gray-500 mt-1">Live listings</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Gavel className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Sold</h3>
            </div>
            <p className="text-3xl font-bold text-[#2D3648]">{soldListings}</p>
            <p className="text-xs text-gray-500 mt-1">Total sold items</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Revenue</h3>
            </div>
            <p className="text-3xl font-bold text-[#B08968]">£{totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">Total earnings</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Pending</h3>
            </div>
            <p className="text-3xl font-bold text-[#2D3648]">{pendingPayouts}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting delivery</p>
          </div>
        </div>

        {/* Listings Table */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-gray-900">All Listings</CardTitle>
          </CardHeader>
          <CardContent>
            {listingsLoading ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full bg-gray-200" />
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Item</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Status</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Price</th>
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myListings.map((listing) => (
                      <tr key={listing.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              {listing.photos?.[0] ? (
                                <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-full h-full p-2 text-gray-300" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{listing.title}</p>
                              <p className="text-xs text-gray-500">{listing.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={
                            listing.status === 'Live' ? 'bg-green-100 text-green-700 border border-green-200' :
                            listing.status === 'Sold' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            'bg-gray-100 text-gray-700 border border-gray-200'
                          }>
                            {listing.status}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-gray-900">£{listing.start_price.toFixed(2)}</p>
                        </td>
                        <td className="p-3">
                          <Link to={createPageUrl(`ListingDetail?id=${listing.id}`)}>
                            <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg">
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        {recentSales.length > 0 && (
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSales.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <p className="font-medium text-gray-900">{order.listing_title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">£{order.final_price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Fee: £{order.app_fee_final.toFixed(2)}</p>
                      <p className="text-sm font-semibold text-green-600">Payout: £{order.seller_payout.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}