import { useRef, useEffect, type ComponentRef, type ReactNode } from 'react'
import { Alert } from 'react-native'
import { useLingui } from '@lingui/react/macro'
import { BaseTouchable, type TouchableProps } from '@ksairi-org/ui-touchables'
import { Ionicons } from '@expo/vector-icons'
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable'
import { logJournalEntryDeleted } from '@analytics'
import { useSwipeableStore } from '@/src/stores'

type MbProp = TouchableProps['mb']

const DeleteAction = ({ onPress, mb }: { onPress: () => void; mb: MbProp }) => (
  <BaseTouchable
    onPress={onPress}
    bg="$red10"
    justify="center"
    items="center"
    width={72}
    mb={mb}
    rounded="$4">
    <Ionicons name="trash-outline" size={22} color="white" />
  </BaseTouchable>
)

interface SwipeableDeleteWrapperProps {
  entryId: string
  onDelete: (id: string) => void
  closeKey: number
  mb?: MbProp
  children: ReactNode
}

const SwipeableDeleteWrapper = ({ entryId, onDelete, closeKey, mb = '$2', children }: SwipeableDeleteWrapperProps) => {
  const { t } = useLingui()
  const ref = useRef<ComponentRef<typeof ReanimatedSwipeable>>(null)
  const isDragging = useRef(false)
  const { startDrag, endDrag } = useSwipeableStore()

  useEffect(() => {
    if (closeKey > 0) ref.current?.reset()
  }, [closeKey])

  useEffect(() => {
    return () => {
      if (isDragging.current) endDrag()
    }
  }, [])

  const handleDragStart = () => {
    isDragging.current = true
    startDrag()
  }

  const handleClose = () => {
    if (isDragging.current) {
      isDragging.current = false
      endDrag()
    }
  }

  const confirmDelete = () => {
    Alert.alert(
      t`Delete entry?`,
      t`This cannot be undone.`,
      [
        { text: t`Cancel`, style: 'cancel', onPress: () => ref.current?.close() },
        { text: t`Delete`, style: 'destructive', onPress: () => { onDelete(entryId); logJournalEntryDeleted() } },
      ],
    )
  }

  return (
    <ReanimatedSwipeable
      ref={ref}
      renderRightActions={() => <DeleteAction onPress={confirmDelete} mb={mb} />}
      rightThreshold={60}
      onSwipeableOpenStartDrag={handleDragStart}
      onSwipeableClose={handleClose}>
      {children}
    </ReanimatedSwipeable>
  )
}

export { SwipeableDeleteWrapper }
export type { SwipeableDeleteWrapperProps }
