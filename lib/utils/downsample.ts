export function downsampleData(data: Array<{ day: string; value: number }>, bucketSize: number, precision = 0): Array<{ day: string; value: number }> {
    if (bucketSize === 1) return data

    // If we don't have enough data to form even 1 complete bucket, return original data
    if (data.length < bucketSize) return data

    const result: Array<{ day: string; value: number }> = []

    const factor = Math.pow(10, precision)
    const averageValue = (values: number[]) => Math.round(values.reduce((a, v) => a + v, 0) / values.length * factor) / factor

    for (let i = 0; i < data.length; i += bucketSize) {
        const bucket = data.slice(i, i + bucketSize)
        if (bucket.length === 0) continue

        const firstDate = bucket[0].day
        const lastDate = bucket[bucket.length - 1].day
        const values = bucket.map((point) => point.value)
        const dateLabel = bucket.length === 1 ? firstDate : `${firstDate}-${lastDate}`

        result.push({
            day: dateLabel,
            value: averageValue(values),
        })
    }

    return result
}
