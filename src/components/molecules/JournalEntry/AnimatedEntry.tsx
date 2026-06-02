import { useEffect, type ReactNode } from 'react'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, cancelAnimation, SlideOutLeft, LinearTransition } from 'react-native-reanimated'

interface AnimatedEntryProps {
  children: ReactNode
  index: number
  animKey: number
}

const AnimatedEntry = ({ children, index, animKey }: AnimatedEntryProps) => {
  const tx = useSharedValue(index % 2 === 0 ? -40 : 40)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (animKey === 0) return
    cancelAnimation(tx)
    cancelAnimation(opacity)
    tx.value = index % 2 === 0 ? -40 : 40
    opacity.value = 0
    const delay = index * 100
    tx.value = withDelay(delay, withTiming(0, { duration: 500 }))
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }))
  }, [animKey])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View style={style} exiting={SlideOutLeft.duration(250)} layout={LinearTransition}>
      {children}
    </Animated.View>
  )
}

export { AnimatedEntry }
export type { AnimatedEntryProps }
