import { AppLoadingScreen } from '@/components/GuardComponents/AppLoadingScreen'
import { fonts, radius, useColors, type Colors } from '@/context/ThemeContext'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'
import { Field, Segmented } from './DevControls'
import MockupShell from './mockups/MockupShell'
import { SpinnerArc, SpinnerBarbell, SpinnerBreathe, SpinnerLogoDots, SpinnerOrbit, SpinnerOrbitBreathe, SpinnerPlate, SpinnerRefined, SpinnerWordmark, type BreatheLevel, type SpinnerProps, type TextTreatment } from './SpinnerVariants'

const MESSAGES = {
    profile: 'Loading your profile...',
    sync: 'Syncing data...',
    warm: 'Warming up',
    long: 'Hang tight — getting everything ready for your first workout...',
} as const

type MessageKey = keyof typeof MESSAGES
type VariantKey = 'current' | 'arc' | 'breathe' | 'plate' | 'refined' | 'barbell' | 'logoDots' | 'wordmark' | 'orbit' | 'orbitBreathe'

const VARIANTS: Record<VariantKey, (props: SpinnerProps) => React.JSX.Element> = {
    current: AppLoadingScreen,
    arc: SpinnerArc,
    breathe: SpinnerBreathe,
    plate: SpinnerPlate,
    refined: SpinnerRefined,
    barbell: SpinnerBarbell,
    logoDots: SpinnerLogoDots,
    wordmark: SpinnerWordmark,
    orbit: SpinnerOrbit,
    orbitBreathe: SpinnerOrbitBreathe,
}

export default function SpinnerLabTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [variant, setVariant] = useState<VariantKey>('orbitBreathe')
    const [messageKey, setMessageKey] = useState<MessageKey>('profile')
    const [treatment, setTreatment] = useState<TextTreatment>('tracked')
    const [breatheLevel, setBreatheLevel] = useState<BreatheLevel>('subtle')
    const [runId, setRunId] = useState(0)

    const Variant = VARIANTS[variant]

    const controls = (
        <>
            <Field label="Variant">
                <Segmented
                    value={variant}
                    onChange={setVariant}
                    options={[
                        { label: 'Current', value: 'current' },
                        { label: 'Arc ring', value: 'arc' },
                        { label: 'Breathe', value: 'breathe' },
                        { label: 'Plate', value: 'plate' },
                        { label: 'Refined', value: 'refined' },
                        { label: 'Barbell', value: 'barbell' },
                        { label: 'Logo + dots', value: 'logoDots' },
                        { label: 'Wordmark', value: 'wordmark' },
                        { label: 'Orbit', value: 'orbit' },
                        { label: 'Orbit + breathe', value: 'orbitBreathe' },
                    ]}
                />
            </Field>
            <Field label="Breathe depth (Orbit + breathe)">
                <Segmented
                    value={breatheLevel}
                    onChange={setBreatheLevel}
                    options={[
                        { label: 'Off', value: 'off' },
                        { label: 'Subtle', value: 'subtle' },
                        { label: 'Visible', value: 'visible' },
                        { label: 'Strong', value: 'strong' },
                    ]}
                />
            </Field>
            <Field label="Text style">
                <Segmented
                    value={treatment}
                    onChange={setTreatment}
                    options={[
                        { label: 'Current', value: 'current' },
                        { label: 'Tracked caps', value: 'tracked' },
                        { label: 'Delayed', value: 'hidden' },
                    ]}
                />
            </Field>
            <Field label="Message">
                <Segmented
                    value={messageKey}
                    onChange={setMessageKey}
                    options={[
                        { label: 'Profile', value: 'profile' },
                        { label: 'Syncing', value: 'sync' },
                        { label: 'Warm', value: 'warm' },
                        { label: 'Long copy', value: 'long' },
                    ]}
                />
            </Field>
            <Field label="Entrance">
                <TouchableOpacity style={styles.replayChip} onPress={() => setRunId((id) => id + 1)} activeOpacity={0.7}>
                    <Text style={styles.replayText}>Replay</Text>
                </TouchableOpacity>
            </Field>
        </>
    )

    return (
        <MockupShell controls={controls}>
            <Variant key={`${variant}-${messageKey}-${treatment}-${breatheLevel}-${runId}`} message={MESSAGES[messageKey]} textTreatment={treatment} breatheLevel={breatheLevel} />
        </MockupShell>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        replayChip: {
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: radius.chip,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.hairline,
            backgroundColor: colors.surface,
        },
        replayText: {
            fontFamily: fonts.semibold,
            fontSize: 13,
            color: colors.textSecondary,
        },
    })
}
