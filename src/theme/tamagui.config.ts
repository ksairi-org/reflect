import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { themes } from './themes'

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    ...themes,
  },
})

export type AppConfig = typeof tamaguiConfig
export default tamaguiConfig
