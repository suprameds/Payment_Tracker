import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

export function StatsCard({ title, value, subtitle, icon, trend, onClick }: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card
      variant="elevated"
      className={cn(
        'transition-all',
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className={cn('text-sm mt-2', trend ? trendColors[trend] : 'text-gray-500')}>
                {subtitle}
              </p>
            )}
          </div>
          {icon && (
            <div className="text-3xl ml-4">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
