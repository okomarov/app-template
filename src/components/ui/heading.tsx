import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
type Size = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type Weight = 'regular' | 'medium' | 'bold' | 'light'

const WEIGHT: Record<Weight, number> = { light: 300, regular: 400, medium: 500, bold: 700 }

const DEFAULT_TAG: Record<Size, HeadingTag> = {
  '1': 'h6',
  '2': 'h5',
  '3': 'h4',
  '4': 'h3',
  '5': 'h3',
  '6': 'h2',
  '7': 'h2',
  '8': 'h1',
  '9': 'h1',
}

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingTag
  size?: Size
  weight?: Weight
  color?: 'gray' | 'red' | 'blue'
  truncate?: boolean
  align?: CSSProperties['textAlign']
  m?: string
  mb?: string
  mt?: string
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as, size = '6', weight = 'bold', color, truncate, align, m, mb, mt, style, ...rest }, ref) => {
    const Component = as ?? DEFAULT_TAG[size]

    const s: CSSProperties = {
      fontSize: `var(--font-size-${size})`,
      lineHeight: `var(--line-height-${size})`,
      letterSpacing: `var(--letter-spacing-${size})`,
      fontWeight: WEIGHT[weight],
      color: color ? `var(--${color}-12)` : undefined,
      textAlign: align,
      ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}),
      margin: m ? `var(--space-${m})` : undefined,
      marginBottom: mb ? `var(--space-${mb})` : undefined,
      marginTop: mt ? `var(--space-${mt})` : undefined,
      ...style,
    }

    return <Component ref={ref} style={s} {...rest} />
  },
)
Heading.displayName = 'Heading'
