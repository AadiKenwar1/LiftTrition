import LogHistoryList from '@/components/WorkoutComponents/LogHistoryList'
import { fonts, useColors, type Colors } from '@/context/ThemeContext'
import type { Log } from '@/context/WorkoutContext/types'
import { useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { Field, Segmented } from './DevControls'

function makeLogs(n: number): Log[] {
    const today = new Date()
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(today)
        d.setDate(d.getDate() - Math.floor(i / 3))
        return { id: `log-${i}`, userID: 'dev', workoutID: 'w1', exerciseID: 'e1', date: d, time: i, weight: 100 + i * 5, reps: 8, rpe: 7, createdAt: d, updatedAt: d }
    })
}

export default function LogHistoryListTest() {
    const colors = useColors()
    const styles = useMemo(() => makeStyles(colors), [colors])
    const [count, setCount] = useState<number>(6)
    const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs')
    const [logs, setLogs] = useState<Log[]>(() => makeLogs(6))
    const flatListRef = useRef<FlatList<Log> | null>(null)

    const reset = (n: number) => { setCount(n); setLogs(makeLogs(n)) }

    return (
        <View style={styles.screen}>
            <View style={styles.controls}>
                <Field label="Reset with N logs">
                    <Segmented value={count} onChange={reset} options={[{ label: '3', value: 3 }, { label: '6', value: 6 }, { label: '12', value: 12 }]} />
                </Field>
                <Field label="Unit">
                    <Segmented value={weightUnit} onChange={setWeightUnit} options={[{ label: 'lbs', value: 'lbs' }, { label: 'kg', value: 'kg' }]} />
                </Field>
                <Text style={styles.hint}>Tap a trash → confirm dialog (Issue 9). Delete two rows back-to-back → both stay gone (Issue 12). {logs.length} left.</Text>
            </View>
            <View style={styles.listCard}>
                <LogHistoryList logs={logs} weightUnit={weightUnit} lastAddedLogId={null} onDeleteConfirmed={(id) => setLogs((prev) => prev.filter((l) => l.id !== id))} flatListRef={flatListRef} />
            </View>
        </View>
    )
}

function makeStyles(colors: Colors) {
    return StyleSheet.create({
        screen: { flex: 1, backgroundColor: colors.background },
        controls: { padding: 16 },
        hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.labelMuted, marginTop: 4 },
        listCard: { flex: 1, paddingHorizontal: 16 },
    })
}
