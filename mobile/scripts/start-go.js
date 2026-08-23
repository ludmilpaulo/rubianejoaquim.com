#!/usr/bin/env node
/**
 * Start Metro for a physical device + Expo Go QR scan.
 *
 * Plain `npx expo start` often advertises exp://127.0.0.1:8081 (phone cannot
 * reach the Mac). Cursor/non-TTY also skips the interactive QR. This script:
 *   - forces the LAN IP into the Expo URL
 *   - skips the interstitial so the QR is exp://… (opens Expo Go)
 *   - prints a QR even when stdout is not a TTY
 */
'use strict'

const { spawn } = require('child_process')
const os = require('os')
const path = require('path')

function getLanIp() {
  const ifaces = os.networkInterfaces()
  const found = []
  for (const [name, list] of Object.entries(ifaces)) {
    for (const iface of list || []) {
      const isV4 = iface.family === 'IPv4' || iface.family === 4
      if (!isV4 || iface.internal) continue
      if (iface.address.startsWith('169.254.')) continue
      found.push({ name, address: iface.address })
    }
  }
  const wifi = found.find((item) => /^en\d+$/.test(item.name))
  return (wifi || found[0])?.address || null
}

function printQr(url) {
  try {
    const qrcode = require('qrcode-terminal')
    qrcode.setErrorLevel('L')
    qrcode.generate(url, { small: true })
  } catch {
    console.log('(Install qrcode-terminal to print a QR in this terminal.)')
  }
}

const extraArgs = process.argv.slice(2)
const useTunnel = extraArgs.includes('--tunnel')
const expoArgs = extraArgs.filter((arg) => arg !== '--tunnel')

// Force interactive-friendly URL generation even under Cursor/CI wrappers.
delete process.env.CI
delete process.env.EXPO_USE_LOCALHOST
process.env.CI = '0'
process.env.EXPO_NO_REDIRECT_PAGE = '1'

const lanIp = getLanIp()
const port = process.env.RCT_METRO_PORT || '8081'

if (!useTunnel && lanIp) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp
}

const hostFlag = useTunnel ? '--tunnel' : '--lan'
const args = ['start', '--go', hostFlag, ...expoArgs]
const expoCli = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli')

console.log('')
if (useTunnel) {
  console.log('Starting Expo Go with a tunnel (works when phone is off this Wi-Fi).')
  console.log('Scan the QR Expo prints after the tunnel is ready.\n')
} else if (lanIp) {
  const expUrl = `exp://${lanIp}:${port}`
  console.log(`Phone + Mac must be on the same Wi-Fi.`)
  console.log(`Scan this with Expo Go (Android) or Camera (iOS):\n`)
  console.log(`  ${expUrl}\n`)
  printQr(expUrl)
  console.log('')
  console.log('If the camera opens a browser instead of Expo Go, open Expo Go → Scan QR.')
  console.log('If it still fails, run: npm run start:go:tunnel\n')
} else {
  console.log('No LAN IP found — Expo may fall back to localhost.')
  console.log('Run: npm run start:go:tunnel\n')
}

const child = spawn(process.execPath, [expoCli, ...args], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
