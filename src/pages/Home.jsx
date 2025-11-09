import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal, Gavel, Shield, CreditCard, TrendingDown, Package, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AuctionCard from '../components/marketplace/AuctionCard';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    }
  };

  const { data: listings, isLoading } = useQuery({
    queryKey: ['listings', 'live'],
    queryFn: async () => {
      const allListings = await base44.entities.Listing.filter({ status: 'Live' }, '-created_date');
      return allListings;
    },
    refetchInterval: 30000,
  });

  const { data: auctions } = useQuery({
    queryKey: ['auctions', 'live'],
    queryFn: async () => {
      const allAuctions = await base44.entities.Auction.filter({ status: 'Live' }, '-created_date');
      return allAuctions;
    },
    refetchInterval: 30000,
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users-count'],
    queryFn: async () => {
      return await base44.entities.User.list('-created_date', 2000);
    },
  });

  const auctionMap = {};
  auctions?.forEach(auction => {
    auctionMap[auction.listing_id] = auction;
  });

  const filteredListings = listings?.filter(listing => {
    const matchesSearch = !searchQuery || 
      listing.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || listing.category === selectedCategory;
    
    let matchesPrice = true;
    if (priceFilter !== 'all') {
      const auction = auctionMap[listing.id];
      const price = auction?.current_price || listing.start_price || 0;
      
      switch (priceFilter) {
        case 'under25':
          matchesPrice = price < 25;
          break;
        case '25to50':
          matchesPrice = price >= 25 && price < 50;
          break;
        case '50to100':
          matchesPrice = price >= 50 && price < 100;
          break;
        case 'over100':
          matchesPrice = price >= 100;
          break;
      }
    }
    
    return matchesSearch && matchesCategory && matchesPrice;
  }) || [];

  const activeAuctions = filteredListings.filter(l => auctionMap[l.id]);
  const endingSoon = [...activeAuctions].sort((a, b) => {
    const aTime = new Date(auctionMap[a.id]?.end_time);
    const bTime = new Date(auctionMap[b.id]?.end_time);
    return aTime - bTime;
  }).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-gray-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Student Marketplace</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 leading-tight">
              Buy and sell within your{' '}
              <span className="text-[#B08968]">
                university
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Secure, verified marketplace with escrow protection. Discover amazing deals from verified students.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Button
                    onClick={() => base44.auth.redirectToLogin()}
                    size="lg"
                    className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold px-8 rounded-lg shadow-md"
                  >
                    Sign up with student email
                  </Button>
                  <Button
                    onClick={() => document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' })}
                    size="lg"
                    className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                    variant="outline"
                  >
                    Browse items
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => document.getElementById('marketplace').scrollIntoView({ behavior: 'smooth' })}
                  size="lg"
                  className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold px-8 rounded-lg shadow-md"
                >
                  Browse Marketplace
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 border border-blue-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified Students</h3>
              <p className="text-gray-600">All users verified with university email addresses for your safety</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Escrow</h3>
              <p className="text-gray-600">Payment protection with automated dispute resolution</p>
            </div>
            <div className="text-center p-8 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-green-100 border border-green-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Maximum Savings</h3>
              <p className="text-gray-600">Save up to 70% on retail prices with peer-to-peer deals</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="py-8 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-[#B08968] mb-1">{activeAuctions.length}</div>
              <div className="text-sm text-gray-600">Live Auctions</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#2D3648] mb-1">{listings?.length || 0}</div>
              <div className="text-sm text-gray-600">Total Listings</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#B08968] mb-1">{allUsers?.length || 0}</div>
              <div className="text-sm text-gray-600">Verified Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div id="marketplace" className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
              />
            </div>
            
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 h-12 bg-gray-50 border-gray-300 text-gray-900 rounded-lg">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Furniture">Furniture</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger className="w-40 h-12 bg-gray-50 border-gray-300 text-gray-900 rounded-lg">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Price" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900">
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under25">Under £25</SelectItem>
                  <SelectItem value="25to50">£25 - £50</SelectItem>
                  <SelectItem value="50to100">£50 - £100</SelectItem>
                  <SelectItem value="over100">Over £100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Ending Soon Section */}
        {endingSoon.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">⏰ Ending Soon</h2>
                <p className="text-gray-600 mt-1">Don't miss out - place your bids now!</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {endingSoon.map((listing) => (
                <AuctionCard
                  key={listing.id}
                  listing={listing}
                  auction={auctionMap[listing.id]}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Active Auctions */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {searchQuery || selectedCategory !== 'all' || priceFilter !== 'all' 
                  ? '🔍 Search Results' 
                  : 'All Active Auctions'}
              </h2>
              <p className="text-gray-600 mt-1">
                {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} available
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-[4/3] w-full bg-gray-200" />
                  <Skeleton className="h-4 w-3/4 bg-gray-200" />
                  <Skeleton className="h-4 w-1/2 bg-gray-200" />
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or search query
              </p>
              {!user && (
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold rounded-lg"
                >
                  Sign In to Start Selling
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredListings.map((listing) => (
                <AuctionCard
                  key={listing.id}
                  listing={listing}
                  auction={auctionMap[listing.id]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#B08968]" />
              <span className="font-semibold text-gray-900">UniMarket</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-[#B08968] transition-colors">About</a>
              <a href="#" className="hover:text-[#B08968] transition-colors">Help</a>
              <a href="#" className="hover:text-[#B08968] transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}