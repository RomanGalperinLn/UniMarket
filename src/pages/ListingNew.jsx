import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X, ArrowLeft, Loader2, Gavel, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PriceScanner from '../components/marketplace/PriceScanner';

export default function ListingNew() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [marketData, setMarketData] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    photos: [],
    category: '',
    condition: '',
    retail_price: '',
    retail_source_url: '',
    start_price: '',
    buy_now_price: '',
    auction_duration_days: '7',
  });

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

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const photoUrls = results.map(r => r.file_url);
      
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...photoUrls]
      }));
    } catch (err) {
      setError('Failed to upload photos. Please try again.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleMarketDataFetched = (data) => {
    setMarketData(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.title || !formData.category || !formData.condition || !formData.start_price) {
        throw new Error('Please fill in all required fields');
      }

      if (!user.verified) {
        throw new Error('Please verify your email before creating listings. Check your Profile for the verification link.');
      }

      const listingData = {
        title: formData.title,
        description: formData.description,
        photos: formData.photos,
        category: formData.category,
        condition: formData.condition,
        seller_id: user.id,
        seller_email: user.email,
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        retail_source_url: formData.retail_source_url || null,
        start_price: parseFloat(formData.start_price),
        buy_now_price: formData.buy_now_price ? parseFloat(formData.buy_now_price) : null,
        status: 'Draft',
      };

      // Add market data if available
      if (marketData) {
        listingData.average_market_price = marketData.average_market_price;
        listingData.market_price_range_min = marketData.market_price_range_min;
        listingData.market_price_range_max = marketData.market_price_range_max;
        listingData.ai_price_comment = marketData.ai_price_comment;
        listingData.market_data_fetched_at = marketData.market_data_fetched_at;
      }

      const listing = await base44.entities.Listing.create(listingData);

      const durationDays = parseInt(formData.auction_duration_days);
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + durationDays);

      const auction = await base44.entities.Auction.create({
        listing_id: listing.id,
        start_price: parseFloat(formData.start_price),
        current_price: parseFloat(formData.start_price),
        end_time: endTime.toISOString(),
        status: 'Live',
        bid_count: 0,
      });

      await base44.entities.Listing.update(listing.id, {
        status: 'Live',
        active_auction_id: auction.id,
      });

      navigate(createPageUrl(`ListingDetail?id=${listing.id}`));
    } catch (err) {
      setError(err.message || 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9]">
        <Loader2 className="w-8 h-8 animate-spin text-[#B08968]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('Home'))}
            className="mb-4 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Gavel className="w-8 h-8 text-[#B08968]" />
            <h1 className="text-3xl font-bold text-gray-900">Create New Listing</h1>
          </div>
          <p className="text-gray-600">List your item and start an auction</p>
        </div>

        {!user.verified && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-gray-900">
              <strong>Email verification required.</strong> Please verify your email before creating listings.{' '}
              <Link to={createPageUrl('Profile')} className="underline font-semibold text-[#B08968]">
                Go to Profile
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-600">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-900">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., iPhone 13 Pro - Excellent Condition"
                  className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-900">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your item in detail..."
                  rows={5}
                  className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900">Photos</Label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group">
                      <img src={photo} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#B08968] hover:bg-gray-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Upload</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhotos}
                    />
                  </label>
                </div>
                {uploadingPhotos && (
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading photos...
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-900">Category *</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData(prev => ({ ...prev, category: val }))}>
                    <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Books">Books</SelectItem>
                      <SelectItem value="Clothing">Clothing</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="condition" className="text-gray-900">Condition *</Label>
                  <Select value={formData.condition} onValueChange={(val) => setFormData(prev => ({ ...prev, condition: val }))}>
                    <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-900">
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Like New">Like New</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="retail_price" className="text-gray-900">Retail Price (£)</Label>
                  <Input
                    id="retail_price"
                    type="number"
                    step="0.01"
                    value={formData.retail_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, retail_price: e.target.value }))}
                    placeholder="Original price"
                    className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
                  />
                  <p className="text-xs text-gray-500">Shows buyers how much they can save</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retail_source_url" className="text-gray-900">Retail Source URL</Label>
                  <Input
                    id="retail_source_url"
                    type="url"
                    value={formData.retail_source_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, retail_source_url: e.target.value }))}
                    placeholder="https://..."
                    className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="start_price" className="text-gray-900">Starting Price (£) *</Label>
                  <Input
                    id="start_price"
                    type="number"
                    step="0.01"
                    value={formData.start_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_price: e.target.value }))}
                    placeholder="10.00"
                    className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buy_now_price" className="text-gray-900">Buy Now Price (£)</Label>
                  <Input
                    id="buy_now_price"
                    type="number"
                    step="0.01"
                    value={formData.buy_now_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, buy_now_price: e.target.value }))}
                    placeholder="Optional"
                    className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg"
                  />
                </div>
              </div>

              {/* AI Price Scanner */}
              {formData.title && formData.start_price && formData.condition && (
                <div className="pt-4 border-t border-gray-200">
                  <PriceScanner
                    title={formData.title}
                    description={formData.description}
                    startPrice={parseFloat(formData.start_price) || 0}
                    condition={formData.condition}
                    onDataFetched={handleMarketDataFetched}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="duration" className="text-gray-900">Auction Duration</Label>
                <Select value={formData.auction_duration_days} onValueChange={(val) => setFormData(prev => ({ ...prev, auction_duration_days: val }))}>
                  <SelectTrigger className="bg-gray-50 border-gray-300 text-gray-900 focus:border-[#B08968] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="5">5 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('Home'))}
              disabled={loading}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#B08968] hover:bg-[#9A7456] text-white font-semibold rounded-lg shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Gavel className="w-4 h-4 mr-2" />
                  Start Auction
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}