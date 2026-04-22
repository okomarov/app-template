import { type CSSProperties, type ElementType, forwardRef, type HTMLAttributes } from 'react'

type SpaceValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface FlexProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  display?: 'none' | 'flex' | 'inline-flex'
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between'
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse'
  gap?: SpaceValue
  gapX?: SpaceValue
  gapY?: SpaceValue
  p?: SpaceValue
  px?: SpaceValue
  py?: SpaceValue
  pt?: SpaceValue
  pb?: SpaceValue
  pl?: SpaceValue
  pr?: SpaceValue
  m?: SpaceValue
  mx?: SpaceValue
  my?: SpaceValue
  mt?: SpaceValue
  mb?: SpaceValue
  ml?: SpaceValue
  mr?: SpaceValue
  flexGrow?: CSSProperties['flexGrow']
  flexShrink?: CSSProperties['flexShrink']
  flexBasis?: CSSProperties['flexBasis']
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  overflow?: CSSProperties['overflow']
  position?: CSSProperties['position']
}

const sp = (v: SpaceValue | undefined) =>
  v !== undefined ? (v === '0' ? '0' : `var(--space-${v})`) : undefined

const JUSTIFY: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
}

const ALIGN: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
  stretch: 'stretch',
}

export const Flex = forwardRef<HTMLElement, FlexProps>(
  (
    {
      as: Component = 'div',
      display,
      direction,
      align,
      justify,
      wrap,
      gap,
      gapX,
      gapY,
      p,
      px,
      py,
      pt,
      pb,
      pl,
      pr,
      m,
      mx,
      my,
      mt,
      mb,
      ml,
      mr,
      flexGrow,
      flexShrink,
      flexBasis,
      width,
      height,
      overflow,
      position,
      style,
      ...rest
    },
    ref,
  ) => {
    const s: CSSProperties = {
      display: display ?? 'flex',
      flexDirection: direction,
      alignItems: align ? ALIGN[align] : undefined,
      justifyContent: justify ? JUSTIFY[justify] : undefined,
      flexWrap: wrap,
      rowGap: sp(gap) ?? sp(gapY),
      columnGap: sp(gap) ?? sp(gapX),
      paddingLeft: sp(pl) ?? sp(px) ?? sp(p),
      paddingRight: sp(pr) ?? sp(px) ?? sp(p),
      paddingTop: sp(pt) ?? sp(py) ?? sp(p),
      paddingBottom: sp(pb) ?? sp(py) ?? sp(p),
      marginLeft: sp(ml) ?? sp(mx) ?? sp(m),
      marginRight: sp(mr) ?? sp(mx) ?? sp(m),
      marginTop: sp(mt) ?? sp(my) ?? sp(m),
      marginBottom: sp(mb) ?? sp(my) ?? sp(m),
      flexGrow,
      flexShrink,
      flexBasis,
      width,
      height,
      overflow,
      position,
      ...style,
    }

    return <Component ref={ref} style={s} {...rest} />
  },
)
Flex.displayName = 'Flex'
