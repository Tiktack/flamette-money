import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Shared loading placeholders so every page skeleton matches the real Card radius
// (rounded-[1.25rem]) and MetricCard height instead of hand-rolled approximations.

export function MetricCardsSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-[118px] rounded-[1.25rem]" />
      ))}
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-[320px] rounded-[1.25rem]", className)} />
}
