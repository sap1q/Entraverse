import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const STAR_SIZE: Record<NonNullable<RatingStarsProps["size"]>, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4.5 w-4.5",
  lg: "h-5 w-5",
};

export const RatingStars = ({ rating, size = "md", className }: RatingStarsProps) => {
  const safe = Math.max(0, Math.min(5, rating));

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)} aria-label={`Rating ${safe.toFixed(1)} dari 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="relative inline-flex">
          <Star className={cn(STAR_SIZE[size], "text-slate-200")} />
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${Math.max(0, Math.min(1, safe - (star - 1))) * 100}%` }}
          >
            <Star className={cn(STAR_SIZE[size], "fill-amber-400 text-amber-400")} />
          </span>
        </span>
      ))}
    </div>
  );
};
