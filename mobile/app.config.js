/**
 * Dynamic Expo config so native Google / Facebook plugins can read EAS env
 * (Facebook Client Token) at build time. Static plugin entries live in app.json.
 *
 * @param {{ config: import('expo/config').ExpoConfig }} args
 * @returns {import('expo/config').ExpoConfig}
 */
function pluginName(plugin) {
  if (typeof plugin === 'string') return plugin
  if (Array.isArray(plugin) && typeof plugin[0] === 'string') return plugin[0]
  return ''
}

module.exports = ({ config }) => {
  const facebookClientToken = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN || ''
  const plugins = [...(config.plugins || [])]

  const hasGoogle = plugins.some((plugin) => pluginName(plugin) === '@react-native-google-signin/google-signin')
  if (!hasGoogle) {
    plugins.push([
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          'com.googleusercontent.apps.112065604009-bt1io2ogtdl5focg0r25i2stg1sln4co',
      },
    ])
  }

  const fbIndex = plugins.findIndex((plugin) => pluginName(plugin) === 'react-native-fbsdk-next')
  const facebookPluginConfig = {
    appID: '2691305731001778',
    clientToken: facebookClientToken,
    displayName: 'Zenda',
    scheme: 'fb2691305731001778',
    advertiserIDCollectionEnabled: false,
    autoLogAppEventsEnabled: false,
    isAutoInitEnabled: true,
  }
  if (fbIndex >= 0) {
    const existing = plugins[fbIndex]
    const prev =
      Array.isArray(existing) && existing[1] && typeof existing[1] === 'object' ? existing[1] : {}
    plugins[fbIndex] = [
      'react-native-fbsdk-next',
      { ...prev, ...facebookPluginConfig, clientToken: facebookClientToken || prev.clientToken || '' },
    ]
  } else {
    plugins.push(['react-native-fbsdk-next', facebookPluginConfig])
  }

  return {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      infoPlist: {
        ...(config.ios && config.ios.infoPlist ? config.ios.infoPlist : {}),
        ...(facebookClientToken ? { FacebookClientToken: facebookClientToken } : {}),
      },
    },
  }
}
