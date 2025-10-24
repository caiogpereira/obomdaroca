import { TrendingUp, TrendingDown, Users, ShoppingBag, DollarSign, CreditCard, Clock } from 'lucide-react';
import { Metric } from '../types';

interface MetricCardProps {
  metric: Metric;
}

const iconMap: Record<string, React.ReactNode> = {
  users: <Users className="w-6 h-6" />,
  'shopping-bag': <ShoppingBag className="w-6 h-6" />,
  'trending-up': <TrendingUp className="w-6 h-6" />,
  'dollar-sign': <DollarSign className="w-6 h-6" />,
  'credit-card': <CreditCard className="w-6 h-6" />,
  clock: <Clock className="w-6 h-6" />,
};

export const MetricCard = ({ metric }: MetricCardProps) => {
  const hasChange = metric.change !== undefined;
  const isPositive = metric.change && metric.change > 0;
  const isNegative = metric.change && metric.change < 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:scale-[1.02] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
          <p className="text-3xl font-bold text-gray-900 mb-3">{metric.value}</p>

          {hasChange && (
            <div className="flex items-center gap-1">
              {isPositive && (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    +{metric.change}%
                  </span>
                </>
              )}
              {isNegative && (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">
                    {metric.change}%
                  </span>
                </>
              )}
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          )}
        </div>

        <div className="bg-red-50 p-3 rounded-lg text-red-600">
          {iconMap[metric.icon]}
        </div>
      </div>
    </div>
  );
};

export const MetricCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-24 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="bg-gray-200 w-12 h-12 rounded-lg"></div>
      </div>
    </div>
  );
};
