import { Tabs } from 'expo-router'
import React from 'react'
import { HapticTab, BaseIcon } from '@atoms'
import { useTheme } from 'tamagui'

export default function TabLayout() {
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accentBackground.val,
        tabBarInactiveTintColor: theme.color8.val,
        tabBarStyle: {
          backgroundColor: theme.color1.val,
          borderTopColor: theme.borderColor.val,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <BaseIcon iconName="iconPen" width={26} height={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reflections"
        options={{
          title: 'Reflections',
          tabBarIcon: ({ color }) => <BaseIcon iconName="iconBook" width={26} height={26} color={color} />,
        }}
      />
    </Tabs>
  )
}
