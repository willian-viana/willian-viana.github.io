import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ButtonHTMLAttributes } from 'react';

const variants = cva('button', {
  variants: {
    variant: {
      default: 'button-primary',
      outline: 'button-outline',
      secondary: 'button-secondary',
    },
  },
  defaultVariants: { variant: 'default' },
});

export function Button({ asChild = false, variant, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp className={twMerge(clsx(variants({ variant }), className))} {...props} />;
}
