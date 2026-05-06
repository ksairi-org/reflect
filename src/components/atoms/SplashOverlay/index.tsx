import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet } from 'react-native'
import Rive from 'rive-react-native'

type Props = {
  source: number
  backgroundColor?: string
  fadeOutDuration?: number
}

export function SplashOverlay({ source, backgroundColor = '#F5F0E8', fadeOutDuration = 600 }: Props) {
  const opacity = useRef(new Animated.Value(1)).current
  const [visible, setVisible] = useState(true)

  const fadeOut = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: fadeOutDuration,
      useNativeDriver: true,
    }).start(() => setVisible(false))
  }

  useEffect(() => {
    const timeout = setTimeout(fadeOut, 3000)
    return () => clearTimeout(timeout)
  }, [])

  if (!visible) return null

  return (
    <Animated.View style={[styles.overlay, { backgroundColor, opacity }]}>
      <Rive
        source={source}
        style={styles.rive}
        onStop={fadeOut}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rive: {
    width: '100%',
    height: '100%',
  },
})
