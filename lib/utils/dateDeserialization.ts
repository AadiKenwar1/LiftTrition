/**
 * Utility function to deserialize date strings back to Date objects
 * when loading data from AsyncStorage (which serializes Date objects to strings)
 * 
 * @param items - Array of objects that may contain date strings
 * @param dateFields - Array of field names that should be converted from strings to Date objects
 * @returns Array of objects with date fields converted to Date objects
 * 
 * @example
 * const items = [{ id: '1', createdAt: '2024-01-01T00:00:00.000Z', name: 'Item' }];
 * const deserialized = deserializeDates(items, ['createdAt']);
 * // Result: [{ id: '1', createdAt: Date('2024-01-01'), name: 'Item' }]
 */
export function deserializeDates<T extends Record<string, any>>(
    items: T[],
    dateFields: (keyof T)[]
): T[] {
    if (!Array.isArray(items) || items.length === 0) {
        return items;
    }

    return items.map((item: any): T => {
        const deserialized = { ...item } as T;
        dateFields.forEach(field => {
            const fieldValue = deserialized[field];
            // Only convert if the field exists and is a string (from JSON.parse)
            if (fieldValue && typeof fieldValue === 'string') {
                const date = new Date(fieldValue);
                // Only set if it's a valid date
                if (!isNaN(date.getTime())) {
                    (deserialized as any)[field] = date;
                }
            }
        });
        return deserialized;
    });
}

/**
 * Utility function to deserialize a single object's date fields
 * 
 * @param item - Object that may contain date strings
 * @param dateFields - Array of field names that should be converted from strings to Date objects
 * @returns Object with date fields converted to Date objects
 * 
 * @example
 * const item = { id: '1', birthDate: '2024-01-01T00:00:00.000Z', name: 'User' };
 * const deserialized = deserializeDatesSingle(item, ['birthDate']);
 * // Result: { id: '1', birthDate: Date('2024-01-01'), name: 'User' }
 */
export function deserializeDatesSingle<T extends Record<string, any>>(
    item: T,
    dateFields: (keyof T)[]
): T {
    if (!item) {
        return item;
    }

    const deserialized = { ...item } as T;
    dateFields.forEach(field => {
        const fieldValue = deserialized[field];
        // Only convert if the field exists and is a string (from JSON.parse)
        if (fieldValue && typeof fieldValue === 'string') {
            const date = new Date(fieldValue);
            // Only set if it's a valid date
            if (!isNaN(date.getTime())) {
                (deserialized as any)[field] = date;
            }
        }
    });
    return deserialized;
}
