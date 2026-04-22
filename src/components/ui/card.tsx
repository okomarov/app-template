import { forwardRef, type HTMLAttributes } from 'react'
import styles from './card.module.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'classic' | 'ghost'
  size?: '1' | '2' | '3'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'surface', size = '1', className, ...rest }, ref) => {
    const classes = [styles.card, styles[`variant-${variant}`], styles[`size-${size}`], className]
      .filter(Boolean)
      .join(' ')

    return <div ref={ref} className={classes} {...rest} />
  },
)
Card.displayName = 'Card'
