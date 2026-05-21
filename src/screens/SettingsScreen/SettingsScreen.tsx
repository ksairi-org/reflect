import { YStack } from 'tamagui'
import { DisplayLg, LabelLg } from '@fonts'
import { Containers } from '@ksairi-org/ui-containers'
import { BaseTouchable } from '@ksairi-org/ui-touchables'
import { Trans } from '@lingui/react/macro'
import { supabase } from '@/src/services/supabase'

export default function SettingsScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <Containers.Screen>
      <YStack flex={1} p="$6" gap="$8" justifyContent="space-between">
        <DisplayLg color="$text-emphasis" letterSpacing={-0.5}>
          <Trans>Settings</Trans>
        </DisplayLg>

        <BaseTouchable
          onPress={handleSignOut}
          bg="$surface-card"
          rounded="$4"
          py="$3"
          items="center"
          borderWidth={1}
          borderColor="$borderColor">
          <LabelLg color="$red10">
            <Trans>Sign out</Trans>
          </LabelLg>
        </BaseTouchable>
      </YStack>
    </Containers.Screen>
  )
}
