import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from 'react'
import styles from './button.module.css'

type Variant = 'solid' | 'soft' | 'outline' | 'ghost' | 'surface'
type Color = 'blue' | 'gray' | 'red' | 'green' | 'orange' | 'yellow' | 'purple'
type Size = '1' | '2' | '3' | '4'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  color?: Color
  size?: Size
  radius?: 'small' | 'medium' | 'large' | 'full'
  loading?: boolean
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'solid',
      color = 'blue',
      size = '2',
      radius,
      loading,
      className,
      disabled,
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      styles.button,
      styles[`variant-${variant}`],
      styles[`color-${color}`],
      styles[`size-${size}`],
      radius && styles[`radius-${radius}`],
      loading && styles.loading,
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'
