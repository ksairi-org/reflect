import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { Input, XStack, useTheme, getTokenValue, styled } from 'tamagui'
import { BaseTouchable } from '@ksairi-org/ui-touchables'
import { Feather } from '@expo/vector-icons'

const PasswordField = styled(Input, {
  flex: 1,
  size: '$4',
  bg: '$background0',
  borderWidth: 0,
  color: '$text-emphasis',
  placeholderTextColor: '$placeholderColor',
  focusStyle: {
    borderWidth: 0,
    outlineWidth: 0,
  },
})

type PasswordInputProps = {
  value: string
  onChangeText: (text: string) => void
  placeholder: string
  onBlur?: () => void
  onSubmitEditing?: () => void
  returnKeyType?: 'done' | 'next' | 'go'
  autoComplete?: 'current-password' | 'new-password'
  mb?: string | number
}

export type PasswordInputHandle = { focus: () => void }

export const PasswordInput = forwardRef<PasswordInputHandle, PasswordInputProps>(({
  value,
  onChangeText,
  placeholder,
  onBlur,
  onSubmitEditing,
  returnKeyType = 'done',
  autoComplete = 'current-password',
  mb = '$2',
}, ref) => {
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<React.ElementRef<typeof Input>>(null)
  const theme = useTheme()

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }))

  const mbValue = typeof mb === 'string' && mb.startsWith('$')
    ? getTokenValue(mb as '$1' | '$2' | '$3' | '$4' | '$5' | '$6', 'space')
    : mb

  return (
    <XStack
      position="relative"
      alignSelf="stretch"
      mb={mbValue as number}
      borderRadius="$4"
      borderWidth={1}
      borderColor={focused ? '$accentBackground' : '$borderColor'}
      bg="$surface-card"
      overflow="hidden">
      <PasswordField
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.() }}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        placeholder={placeholder}
        pr={44}
        secureTextEntry={!visible}
        autoComplete={autoComplete}
        autoCapitalize="none"
      />
      <BaseTouchable
        position="absolute"
        right="$3"
        top={0}
        bottom={0}
        justify="center"
        onPress={() => setVisible(v => !v)}>
        <Feather
          name={visible ? 'eye-off' : 'eye'}
          size={18}
          color={theme['text-placeholder'].val}
        />
      </BaseTouchable>
    </XStack>
  )
})

PasswordInput.displayName = 'PasswordInput'
