import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { HostProfile } from '../host-catalog/host-profile'

const appStateListeners: ((state: string) => void)[] = []
const networkListeners: ((state: { isConnected: boolean }) => void)[] = []

vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, listener: (state: string) => void) => {
      appStateListeners.push(listener)
      return { remove: () => {} }
    }
  }
}))
vi.mock('expo-network', () => ({
  addNetworkStateListener: (listener: (state: { isConnected: boolean }) => void) => {
    networkListeners.push(listener)
    return { remove: () => {} }
  }
}))
vi.mock('../diagnostics/connection/persisted-connection-log-store', () => ({
  connectionLogStore: { flush: async () => {} },
  recordConnectionRevival: () => {}
}))
// The socket boundary: every host connection, first or retried, opens through here.
vi.mock('../transport/connection/host-entry-opener', () => ({
  openHostClientEntry: vi.fn(async () => null)
}))

import { RpcClientProvider } from '../transport/connection/client-context'
import { openHostClientEntry } from '../transport/connection/host-entry-opener'
import { useAllHostClients } from '../transport/connection/use-all-host-clients'
import { selectHomeAutoConnectHostIds } from '../transport/hosts/home-host-auto-connect'

function host(id: string, lastConnected: number, autoConnect?: boolean): HostProfile {
  return {
    id,
    name: `Host ${id}`,
    endpoint: `ws://${id}.local:6768`,
    deviceToken: 'token',
    publicKeyB64: 'key',
    lastConnected,
    ...(autoConnect === undefined ? {} : { autoConnect })
  }
}

function HomeConnections({ hosts }: { hosts: HostProfile[] }) {
  useAllHostClients(
    hosts.map((h) => h.id),
    { autoConnectHostIds: selectHomeAutoConnectHostIds(hosts), closeUnusedOnRelease: true }
  )
  return null
}

describe('a host with Connect automatically off', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    vi.useRealTimers()
  })

  it('gets no connection from Home, app resume, network change or retries', async () => {
    vi.useFakeTimers()
    const hosts = [host('quiet', 20, false), host('active', 10)]
    await act(async () => {
      renderer = create(
        createElement(RpcClientProvider, null, createElement(HomeConnections, { hosts }))
      )
    })

    await act(async () => {
      for (const listener of appStateListeners) {
        listener('background')
        listener('active')
      }
      for (const listener of networkListeners) {
        listener({ isConnected: true })
      }
      await vi.advanceTimersByTimeAsync(5 * 60_000)
    })

    const openedHostIds = new Set(vi.mocked(openHostClientEntry).mock.calls.map((call) => call[1]))
    expect([...openedHostIds]).toEqual(['active'])
  })
})
