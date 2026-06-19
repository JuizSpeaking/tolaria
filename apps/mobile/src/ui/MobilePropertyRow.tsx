import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../components/ui/text'
import { probeProps, type MobileLayoutProbe } from '../qa/mobileLayoutProbe'
import { desktopPropertyParity } from './desktopParity'
import { mobileColors, mobileSpace, mobileType } from './tokens'

export function MobilePropertyRow({
  label,
  layoutProbe,
  layoutProbeId,
  testID,
  value,
}: {
  label: string
  layoutProbe?: MobileLayoutProbe
  layoutProbeId?: string
  testID?: string
  value: ReactNode
}) {
  const metricId = layoutProbeId ?? testID

  return (
    <View {...propertyProbe(layoutProbe, metricId, 'row')} style={styles.row} testID={testID}>
      <Text {...propertyProbe(layoutProbe, metricId, 'label')} style={styles.label} testID={testID ? `${testID}-label` : undefined}>{label}</Text>
      <View {...propertyProbe(layoutProbe, metricId, 'value')} style={styles.value} testID={testID ? `${testID}-value` : undefined}>
        {typeof value === 'string' ? <Text style={styles.valueText}>{value}</Text> : value}
      </View>
    </View>
  )
}

function propertyProbe(layoutProbe: MobileLayoutProbe | undefined, metricId: string | undefined, part: string) {
  return metricId ? probeProps(layoutProbe, `${metricId}.${part}`) : {}
}

const styles = StyleSheet.create({
  label: {
    width: 86,
    color: mobileColors.textMuted,
    fontSize: desktopPropertyParity.labelTextSize,
  },
  row: {
    minHeight: desktopPropertyParity.rowMinHeight,
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileSpace.sm,
    borderBottomColor: mobileColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
  },
  value: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  valueText: {
    color: mobileColors.text,
    fontSize: mobileType.caption,
    fontWeight: '400',
    textAlign: 'right',
  },
})
