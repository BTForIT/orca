import AsyncStorage from '@react-native-async-storage/async-storage'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn() }
}))

import { loadStoredHostProfiles } from '../../host-catalog/host-metadata-store'
import { selectHomeAutoConnectHostIds } from './home-host-auto-connect'

describe('Home auto-connect', () => {
  it('skips a saved host with Connect automatically off and gives its slot to the next one', async () => {
    const saved = [
      { id: 'quiet', lastConnected: 40, autoConnect: false },
      { id: 'a', lastConnected: 30 },
      { id: 'b', lastConnected: 20, autoConnect: true },
      { id: 'c', lastConnected: 10 }
    ].map((host) => ({
      ...host,
      name: `Host ${host.id}`,
      endpoint: `ws://${host.id}.local:6768`,
      publicKeyB64: 'key'
    }))
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(saved))

    const hosts = (await loadStoredHostProfiles())!.map((host) => ({
      ...host,
      deviceToken: 'token'
    }))

    expect(selectHomeAutoConnectHostIds(hosts)).toEqual(['a', 'b', 'c'])
  })
})
