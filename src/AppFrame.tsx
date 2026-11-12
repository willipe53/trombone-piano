import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTitle } from './AppTitle'
import { headerClearance, titleBandHeight, titleBlockWidth, titleRightMargin, titleTopMargin } from './panelMeasure'

type LeadingSetter = (node: ReactNode) => void

const LeadingContext = createContext<LeadingSetter>(() => {})

/// The game deal controls render into the frame's header. Pass null on the chooser.
export function useHeaderLeading(node: ReactNode, active: boolean): void {
  const setLeading = useContext(LeadingContext)
  useLayoutEffect(() => {
    setLeading(active ? node : null)
  }, [setLeading, node, active])
  useLayoutEffect(() => () => setLeading(null), [setLeading])
}

export function AppFrame({
  onClose,
  onHelp,
  showHeader = false,
  insetContent,
  background,
  children,
}: {
  onClose?: () => void
  onHelp?: () => void
  showHeader?: boolean
  insetContent: boolean
  background: string
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const [leading, setLeadingState] = useState<ReactNode>(null)
  const [headerWidth, setHeaderWidth] = useState(0)
  const [leadingWidth, setLeadingWidth] = useState(0)
  const setLeading = useCallback((node: ReactNode) => {
    setLeadingState((current) => (current === node ? current : node))
  }, [])
  const room = Math.max(0, headerWidth - (leading ? leadingWidth + 8 : 0))
  const block = titleBlockWidth(room)
  const header = showHeader || onClose ? (
    <View
      pointerEvents="box-none"
      onLayout={(event) => setHeaderWidth(event.nativeEvent.layout.width)}
      style={styles.header}
    >
      <View pointerEvents="box-none" style={styles.leading}>
        {leading ? (
          <View
            pointerEvents="box-none"
            style={styles.leadingRow}
            onLayout={(event) => setLeadingWidth(event.nativeEvent.layout.width)}
          >
            {leading}
          </View>
        ) : null}
      </View>
      <AppTitle width={block} onClose={onClose} onHelp={onHelp} />
    </View>
  ) : null
  return (
    <LeadingContext.Provider value={setLeading}>
      <View style={[styles.frame, { backgroundColor: background }]}>
        <View
          style={[
            styles.body,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          {insetContent ? <View style={styles.headerSlot}>{header}</View> : null}
          <View style={styles.content}>{children}</View>
        </View>
        {!insetContent && header ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.overlay,
              {
                top: insets.top + titleTopMargin,
                left: insets.left,
                right: insets.right + titleRightMargin,
              },
            ]}
          >
            {header}
          </View>
        ) : null}
      </View>
    </LeadingContext.Provider>
  )
}

const styles = StyleSheet.create({
  frame: { flex: 1, position: 'relative' },
  body: { flex: 1 },
  content: { flex: 1 },
  headerSlot: {
    height: headerClearance(),
    paddingTop: titleTopMargin,
    paddingRight: titleRightMargin,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    height: titleBandHeight,
  },
  header: {
    height: titleBandHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  leading: { flex: 1, height: titleBandHeight, justifyContent: 'center' },
  leadingRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 },
})
