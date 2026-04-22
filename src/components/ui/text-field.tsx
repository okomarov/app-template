'use client'

import { type CSSProperties, forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './text-field.module.css'

type Size = '1' | '2' | '3'
type Variant = 'surface' | 'classic' | 'soft'

interface RootProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: Size
  variant?: Variant
  children?: ReactNode
}

const Root = forwardRef<HTMLInputElement, RootProps>(
  ({ size = '2', variant = 'surface', children, className, style, ...inputProps }, ref) => {
    return (
      <div
        className={`${styles.wrapper} ${styles[`size-${size}`]} ${styles[`variant-${variant}`]}${className ? ` ${className}` : ''}`}
        style={style}
      >
        {children}
        <input ref={ref} className={styles.input} autoComplete="off" {...inputProps} />
      </div>
    )
  },
)
Root.displayName = 'TextFieldRoot'

interface SlotProps {
  children: ReactNode
  side?: 'left' | 'right'
  style?: CSSProperties
  className?: string
}

function Slot({ children, side, className, style }: SlotProps) {
  return (
    <div
      className={`${styles.slot}${side === 'right' ? ` ${styles.slotRight}` : ''}${className ? ` ${className}` : ''}`}
      data-side={side}
      style={style}
    >
      {children}
    </div>
  )
}

export const TextField = { Root, Slot }
