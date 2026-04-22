import {
  Children,
  type CSSProperties,
  cloneElement,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  isValidElement,
} from 'react'

type Size = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type Color = 'gray' | 'red' | 'blue' | 'green' | 'orange' | 'purple'
type Weight = 'regular' | 'medium' | 'bold' | 'light'

const COLOR_VAR: Record<Color, string> = {
  gray: 'var(--gray-11)',
  red: 'var(--red-11)',
  blue: 'var(--blue-11)',
  green: 'var(--green-11)',
  orange: 'var(--orange-11)',
  purple: 'var(--purple-11)',
}

const WEIGHT: Record<Weight, number> = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
}

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  size?: Size
  color?: Color
  weight?: Weight
  truncate?: boolean
  wrap?: 'wrap' | 'nowrap' | 'balance' | 'pretty'
  align?: CSSProperties['textAlign']
  highContrast?: boolean
  asChild?: boolean
  htmlFor?: string
  m?: string
  mx?: string
  my?: string
  mt?: string
  mb?: string
  ml?: string
  mr?: string
}

const sp = (v: string | undefined) => (v !== undefined ? `var(--space-${v})` : undefined)

export const Text = forwardRef<HTMLElement, TextProps>(
  (
    {
      as: Component = 'span',
      size,
      color,
      weight,
      truncate,
      wrap,
      align,
      highContrast,
      asChild,
      htmlFor,
      m,
      mx,
      my,
      mt,
      mb,
      ml,
      mr,
      style,
      children,
      ...rest
    },
    ref,
  ) => {
    const colorVar = color ? (highContrast ? `var(--${color}-12)` : COLOR_VAR[color]) : undefined

    const s: CSSProperties = {
      fontSize: size ? `var(--font-size-${size})` : undefined,
      lineHeight: size ? `var(--line-height-${size})` : undefined,
      letterSpacing: size ? `var(--letter-spacing-${size})` : undefined,
      color: colorVar,
      fontWeight: weight ? WEIGHT[weight] : undefined,
      textAlign: align,
      textWrap: wrap,
      ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}),
      marginLeft: sp(ml) ?? sp(mx) ?? sp(m),
      marginRight: sp(mr) ?? sp(mx) ?? sp(m),
      marginTop: sp(mt) ?? sp(my) ?? sp(m),
      marginBottom: sp(mb) ?? sp(my) ?? sp(m),
      ...style,
    }

    if (asChild) {
      const child = Children.only(children)
      if (isValidElement<Record<string, unknown>>(child)) {
        return cloneElement(child, {
          ref,
          style: { ...s, ...(child.props.style as CSSProperties | undefined) },
          ...rest,
        })
      }
    }

    return (
      <Component ref={ref} style={s} htmlFor={htmlFor} {...rest}>
        {children}
      </Component>
    )
  },
)
Text.displayName = 'Text'
