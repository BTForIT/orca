import { useState } from 'react'
import { MobileSwitch } from '../../components/controls/MobileSwitch'
import { ListRow } from '../../components/list/ListGroup'
import type { HostProfile } from '../../host-catalog/host-profile'
import { setHostAutoConnect } from '../../host-catalog/host-store'
import { useMobileTranslation } from '../../i18n/use-mobile-translation'
import { SettingsNote, SettingsSection } from '../../settings/settings-screen-frame'

/** Whether Home connects to this host on its own; off leaves it paired but disconnected. */
export function HostAutoConnectSection({
  host,
  disabled
}: {
  host: HostProfile
  disabled: boolean
}) {
  const t = useMobileTranslation()
  const [autoConnect, setAutoConnect] = useState(host.autoConnect !== false)
  const [error, setError] = useState<string | null>(null)
  const label = t('host.edit.autoConnect', 'Connect automatically')

  async function handleChange(next: boolean) {
    setAutoConnect(next)
    setError(null)
    try {
      await setHostAutoConnect(host.id, next)
    } catch (err) {
      setAutoConnect(!next)
      setError(
        err instanceof Error ? err.message : t('host.edit.saveFailed', 'Failed to save host.')
      )
    }
  }

  return (
    <SettingsSection
      footer={
        error ? (
          <SettingsNote error>{error}</SettingsNote>
        ) : (
          t(
            'host.edit.autoConnectFooter',
            'When off, Home leaves this host disconnected until you choose Connect.'
          )
        )
      }
    >
      <ListRow
        key="autoConnect"
        title={label}
        accessory={
          <MobileSwitch
            value={autoConnect}
            accessibilityLabel={label}
            disabled={disabled}
            onValueChange={(next) => void handleChange(next)}
          />
        }
      />
    </SettingsSection>
  )
}
