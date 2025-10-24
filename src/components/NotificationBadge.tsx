interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export const NotificationBadge = ({ count, className = '' }: NotificationBadgeProps) => {
  if (count === 0) return null;

  return (
    <span
      className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-600 text-white text-xs font-bold rounded-full border-2 border-white shadow-sm animate-pulse ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};
