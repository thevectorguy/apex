import { type ReactNode } from 'react';

function buildClassName(baseClassName: string, className: string) {
  return className ? `${baseClassName} ${className}` : baseClassName;
}

export function SkeletonBlock({
  className = '',
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={buildClassName(
        'animate-pulse rounded-[20px] border border-white/6 bg-white/[0.06]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <SkeletonBlock className={buildClassName('h-4 rounded-full', className)} />;
}

export function SkeletonCircle({ className = '' }: { className?: string }) {
  return <SkeletonBlock className={buildClassName('rounded-full', className)} />;
}
