import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT_CLS: Record<Variant, string> = {
  primary:
    'bg-emerald-900 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700 disabled:bg-emerald-900/60',
  secondary:
    'bg-white text-ink ring-1 ring-firefly-200 hover:bg-ecru-100 hover:ring-firefly-300 focus-visible:ring-emerald-500',
  ghost:
    'bg-transparent text-ink hover:bg-ecru-200 focus-visible:ring-emerald-500',
  danger:
    'bg-white text-severity-high ring-1 ring-red-200 hover:bg-red-50 hover:ring-red-300 focus-visible:ring-red-400',
};

const SIZE_CLS: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLS[variant],
        SIZE_CLS[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
