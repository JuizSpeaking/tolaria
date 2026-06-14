#!/usr/bin/env node

import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const defaultOutputDir = '/tmp/tolaria-mobile-ui-simulator'

function printHelp() {
  console.log(`Capture the current iOS Simulator screen for mobile UI QA.

Usage:
  node apps/mobile/scripts/capture-ios-simulator.mjs [options]

Options:
  --device <udid>       Simulator UDID. Defaults to MOBILE_QA_SIMULATOR_UDID, then the booted iPad.
  --dir <path>          Output directory. Defaults to MOBILE_QA_SIMULATOR_SCREENSHOT_DIR or ${defaultOutputDir}.
  --out <path>          Output PNG path. Defaults to <dir>/ipad-landscape.png.
  --landscape           Set the Simulator device orientation to Landscape Right before capture.
  --orientation <value> Set orientation: portrait, landscape-left, or landscape-right.
  --framebuffer         Capture the raw simulator framebuffer instead of the visible Simulator window.
  --open-url <url>      Open a simulator URL before capture. Use exp:// URLs for Expo Go native QA.
  --wait <ms>           Delay after opening a URL and before capture. Defaults to 3000.
  --help                Show this help.
`)
}

function readOption(args, name, fallback) {
  const index = args.indexOf(name)
  if (index === -1) {
    return fallback
  }
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`)
  }
  return value
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit ${result.status}`
    throw new Error(`${command} ${args.join(' ')} failed: ${detail}`)
  }
  return result.stdout
}

function hasFlag(args, name) {
  return args.includes(name)
}

function listBootedDevices() {
  const json = run('xcrun', ['simctl', 'list', 'devices', 'booted', '--json'])
  const parsed = JSON.parse(json)
  return Object.values(parsed.devices ?? {}).flat()
}

function selectDevice(requestedDevice) {
  if (requestedDevice) {
    return requestedDevice
  }

  const bootedDevices = listBootedDevices()
  const iPad = bootedDevices.find((device) => device.name?.toLowerCase().includes('ipad'))
  const selected = iPad ?? bootedDevices[0]
  if (!selected?.udid) {
    throw new Error('No booted iOS Simulator found. Start one with `pnpm mobile:ios` first.')
  }
  return selected.udid
}

function orientationMenuItem(value) {
  if (value === 'portrait') return 'Portrait'
  if (value === 'landscape-left') return 'Landscape Left'
  if (value === 'landscape-right') return 'Landscape Right'
  throw new Error(`Unsupported orientation: ${value}`)
}

function setSimulatorOrientation(value) {
  const menuItem = orientationMenuItem(value)
  run('osascript', [
    '-e',
    'tell application "Simulator" to activate',
    '-e',
    `tell application "System Events" to tell process "Simulator" to click menu item "${menuItem}" of menu 1 of menu item "Orientation" of menu "Device" of menu bar 1`,
  ])
}

function simulatorWindowRect() {
  const output = run('osascript', [
    '-e',
    'tell application "Simulator" to activate',
    '-e',
    `tell application "System Events"
      tell process "Simulator"
        set windowPosition to position of window 1
        set windowSize to size of window 1
        return ((item 1 of windowPosition) as text) & "," & ((item 2 of windowPosition) as text) & "," & ((item 1 of windowSize) as text) & "," & ((item 2 of windowSize) as text)
      end tell
    end tell`,
  ])
  const values = output.trim().split(',').map((value) => Number(value))
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Unable to read Simulator window bounds: ${output.trim()}`)
  }
  return values.join(',')
}

function captureSimulatorWindow(outputPath) {
  run('screencapture', ['-x', `-R${simulatorWindowRect()}`, outputPath])
}

function captureSimulatorFramebuffer(device, outputPath) {
  run('xcrun', ['simctl', 'io', device, 'screenshot', outputPath])
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    printHelp()
    return
  }

  const device = selectDevice(readOption(args, '--device', process.env.MOBILE_QA_SIMULATOR_UDID))
  const outputDir = resolve(
    readOption(args, '--dir', process.env.MOBILE_QA_SIMULATOR_SCREENSHOT_DIR ?? defaultOutputDir),
  )
  const outputPath = resolve(readOption(args, '--out', join(outputDir, 'ipad-landscape.png')))
  const waitMs = Number(readOption(args, '--wait', '3000'))
  const url = readOption(args, '--open-url', undefined)
  const requestedOrientation = readOption(args, '--orientation', hasFlag(args, '--landscape') ? 'landscape-right' : undefined)

  await mkdir(dirname(outputPath), { recursive: true })

  if (requestedOrientation) {
    setSimulatorOrientation(requestedOrientation)
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000))
  }

  if (url) {
    run('xcrun', ['simctl', 'openurl', device, url])
    await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs))
  }

  if (hasFlag(args, '--framebuffer')) {
    captureSimulatorFramebuffer(device, outputPath)
  } else {
    captureSimulatorWindow(outputPath)
  }

  console.log(`Captured iOS Simulator screenshot: ${outputPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
