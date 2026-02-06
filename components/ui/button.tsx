import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center rounded-lg font-semibold 
      transition-all duration-200 ease-in-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50
      active:scale-95 hover:shadow-lg
    `;
    
    const variants = {
      primary: `
        bg-blue-600 text-white hover:bg-blue-700 
        focus-visible:ring-blue-600
        hover:shadow-blue-500/50
      `,
      gradient: `
        bg-gradient-to-br from-blue-500 to-indigo-600 text-white
        hover:from-blue-600 hover:to-indigo-700
        focus-visible:ring-indigo-600
        shadow-md hover:shadow-indigo-500/50
      `,
      secondary: `
        bg-gray-100 text-gray-900 hover:bg-gray-200
        focus-visible:ring-gray-600
      `,
      outline: `
        border-2 border-blue-600 text-blue-600 bg-transparent
        hover:bg-blue-50
        focus-visible:ring-blue-600
      `,
      ghost: `
        text-gray-700 hover:bg-gray-100
        focus-visible:ring-gray-600
      `,
      danger: `
        bg-red-600 text-white hover:bg-red-700
        focus-visible:ring-red-600
        hover:shadow-red-500/50
      `,
      success: `
        bg-green-600 text-white hover:bg-green-700
        focus-visible:ring-green-600
        hover:shadow-green-500/50
      `,
    };
    
    const sizes = {
      sm: 'h-9 px-3 py-2 text-sm gap-1.5',
      md: 'h-11 px-5 py-2.5 text-base gap-2',
      lg: 'h-14 px-7 py-3 text-lg gap-2.5',
    };
    
    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
