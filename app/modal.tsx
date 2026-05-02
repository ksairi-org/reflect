import { Link } from 'expo-router'
import { YStack, Text } from 'tamagui'

export default function ModalScreen() {
  return (
    <YStack flex={1} items="center" justify="center" p="$5">
      <Text fontSize={24} fontWeight="700" mb="$4">This is a modal</Text>
      <Link href="/" dismissTo>
        <Text color="$accentBackground">Go to home screen</Text>
      </Link>
    </YStack>
  )
}
