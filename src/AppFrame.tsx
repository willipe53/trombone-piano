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
  insetContent,
  background,
  children,
}: {
  onClose?: () => void
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
  const showHeader = onClose !== undefined
  const room = Math.max(0, headerWidth - (leading ? leadingWidth + 8 : 0))
  const block = titleBlockWidth(room)
  const top = insets.top + (showHeader && insetContent ? headerClearance() : 0)
  return (
    <LeadingContext.Provider value={setLeading}>
      <View style={[styles.frame, { backgroundColor: background }]}>
        <View
          style={[
            styles.body,
            {
              paddingTop: top,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          {children}
        </View>
        {onClose ? (
          <View
            pointerEvents="box-none"
            onLayout={(event) => setHeaderWidth(event.nativeEvent.layout.width)}
            style={[
              styles.header,
              {
                top: insets.top + titleTopMargin,
                left: insets.left,
                right: insets.right + titleRightMargin,
              },
            ]}
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
            <AppTitle width={block} onClose={onClose} />
          </View>
        ) : null}
      </View>
    </LeadingContext.Provider>
  )
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  body: { flex: 1 },
  header: {
    position: 'absolute',
    height: titleBandHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  leading: { flex: 1, height: titleBandHeight, justifyContent: 'center' },
  leadingRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8 },
})
