const { withDangerousMod } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

// Sets SWIFT_VERSION = '5.0' for all pod targets.
// Required when building with Xcode 16.3+ (Swift 6.1.2): expo-modules-core uses
// concurrency syntax that compiles cleanly in Swift 5 mode but errors in Swift 6
// strict concurrency mode.
const withSwiftVersion = (config) =>
  withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile')
      if (!fs.existsSync(podfilePath)) return config

      const contents = fs.readFileSync(podfilePath, 'utf-8')
      if (contents.includes("build_settings['SWIFT_VERSION'] = '5.0'")) return config

      const hook = `
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['SWIFT_VERSION'] = '5.0'
    end
  end
end
`
      fs.writeFileSync(podfilePath, contents + hook)
      return config
    },
  ])

module.exports = withSwiftVersion
