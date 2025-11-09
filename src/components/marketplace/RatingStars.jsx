import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RatingStars({ rating, count, size = 'md', showCount = true }) {
  const stars = [1, 2, 3, 4, 5];
  const avgRating = rating || 0;
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {stars.map((star) => (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              star <= Math.round(avgRating) 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            )}
          />
        ))}
      </div>
      {showCount && count > 0 && (
        <span className="text-sm text-gray-600">
          {avgRating.toFixed(1)} ({count})
        </span>
      )}
    </div>
  );
}