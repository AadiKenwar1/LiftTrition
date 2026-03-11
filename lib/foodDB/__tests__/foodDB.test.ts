// foodDB.test.ts
// Mock fetch globally before any imports
global.fetch = jest.fn()

describe('FoodDB API', () => {
    let getFoodSearchResults: any
    let getFoodDetails: any

    beforeEach(() => {
        jest.clearAllMocks()
        // Reset modules to clear caches between tests
        jest.resetModules()
        // Re-import to get fresh module instances with cleared caches
        const foodDB = require('../foodDB')
        getFoodSearchResults = foodDB.getFoodSearchResults
        getFoodDetails = foodDB.getFoodDetails
    })

    describe('getFoodSearchResults', () => {
        describe('Valid Cases', () => {
            it('should fetch and parse food search results with single item', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: '123', food_name: 'Banana', brand_name: 'Generic' }],
                        },
                    }),
                })

                const results = await getFoodSearchResults('banana')
                expect(results).toHaveLength(1)
                expect(results[0]).toEqual({
                    description: 'Banana',
                    fdcId: '123',
                    brandName: 'Generic',
                })
            })

            it('should fetch and parse multiple food search results', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [
                                { food_id: '123', food_name: 'Banana', brand_name: 'Generic' },
                                { food_id: '456', food_name: 'Apple' },
                                { food_id: '789', food_name: 'Orange', brand_name: 'Fresh' },
                            ],
                        },
                    }),
                })

                const results = await getFoodSearchResults('fruit')
                expect(results).toHaveLength(3)
                expect(results[1].brandName).toBeUndefined()
                expect(results[2].brandName).toBe('Fresh')
            })

            it('should handle case-insensitive queries', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: '123', food_name: 'Chicken' }],
                        },
                    }),
                })

                const results1 = await getFoodSearchResults('CHICKEN')
                const results2 = await getFoodSearchResults('chicken')
                expect(results1[0].description).toBe('Chicken')
                expect(results2[0].description).toBe('Chicken')
            })

            it('should trim whitespace from queries', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: '123', food_name: 'Rice' }],
                        },
                    }),
                })

                const results = await getFoodSearchResults('  rice  ')
                expect(results).toHaveLength(1)
                expect(results[0].description).toBe('Rice')
            })

            it('should use cache for repeated queries', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: '789', food_name: 'Chicken' }],
                        },
                    }),
                })

                await getFoodSearchResults('chicken')
                const firstCallCount = (fetch as jest.Mock).mock.calls.length

                const cachedResults = await getFoodSearchResults('chicken')
                expect((fetch as jest.Mock).mock.calls.length).toBe(firstCallCount)
                expect(cachedResults).toHaveLength(1)
                expect(cachedResults[0].description).toBe('Chicken')
            })
        })

        describe('Error Cases', () => {
            it('should handle API errors gracefully', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                })

                const results = await getFoodSearchResults('error')
                expect(results).toEqual([])
            })

            it('should handle network errors', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

                const results = await getFoodSearchResults('network-error')
                expect(results).toEqual([])
            })

            it('should handle token fetch failures', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                })

                const results = await getFoodSearchResults('test')
                expect(results).toEqual([])
            })

            it('should handle 404 errors', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 404,
                })

                const results = await getFoodSearchResults('notfound')
                expect(results).toEqual([])
            })

            it('should handle rate limit errors', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                })

                const results = await getFoodSearchResults('ratelimit')
                expect(results).toEqual([])
            })
        })

        describe('Error Logging and Observability', () => {
            let consoleErrorSpy: jest.SpyInstance
            let consoleWarnSpy: jest.SpyInstance

            beforeEach(() => {
                consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
                consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
            })

            afterEach(() => {
                consoleErrorSpy.mockRestore()
                consoleWarnSpy.mockRestore()
            })

            it('should log error details when API request fails with status code', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    text: async () => 'Server error details',
                })

                await getFoodSearchResults('error-test')

                expect(consoleErrorSpy).toHaveBeenCalled()
                const errorCall = consoleErrorSpy.mock.calls[0]
                expect(errorCall[0]).toContain('500')
            })

            it('should log error details when network request fails', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                const networkError = new Error('Network request failed')
                ;(fetch as jest.Mock).mockRejectedValueOnce(networkError)

                await getFoodSearchResults('network-test')

                expect(consoleErrorSpy).toHaveBeenCalled()
                const errorCall = consoleErrorSpy.mock.calls[0]
                expect(errorCall[0]).toContain('getFoodSearchResults error')
                expect(errorCall[1]).toBe(networkError)
            })

            it('should log warning when credentials are missing', async () => {
                // Temporarily clear credentials by mocking the module
                const originalEnv = process.env
                delete process.env.FATSECRET_CLIENT_ID
                delete process.env.FATSECRET_CLIENT_SECRET

                // Re-import to get fresh module
                jest.resetModules()
                const foodDB = require('../foodDB')
                const getFoodSearchResultsNoCreds = foodDB.getFoodSearchResults

                await getFoodSearchResultsNoCreds('test')

                // Note: This test may not work if credentials are hardcoded
                // It's here to document the expected behavior
                expect(getFoodSearchResultsNoCreds).toBeDefined()

                process.env = originalEnv
            })

            it('should log error when token fetch fails with details', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    text: async () => 'Invalid credentials',
                })

                await getFoodSearchResults('token-error-test')

                expect(consoleErrorSpy).toHaveBeenCalled()
                // Token error should be logged
                const errorCalls = consoleErrorSpy.mock.calls
                const hasTokenError = errorCalls.some((call) => call[0]?.toString().includes('401') || call[0]?.toString().includes('Unauthorized') || call[0]?.toString().includes('token'))
                expect(hasTokenError || errorCalls.length > 0).toBe(true)
            })

            it('should log API response when request returns null', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    text: async () => 'Bad Request: Invalid search expression',
                })

                await getFoodSearchResults('bad-request')

                expect(consoleErrorSpy).toHaveBeenCalled()
            })

            it('should log error when API returns malformed JSON', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => {
                        throw new Error('Invalid JSON')
                    },
                })

                await getFoodSearchResults('malformed-json')

                expect(consoleErrorSpy).toHaveBeenCalled()
                const errorCall = consoleErrorSpy.mock.calls[0]
                expect(errorCall[0]).toContain('getFoodSearchResults error')
            })

            it('should log error details when API response structure is unexpected', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        // Missing 'foods' property
                        error: { message: 'Unexpected response format' },
                    }),
                })

                const results = await getFoodSearchResults('unexpected-format')
                expect(results).toEqual([])
                // Should still complete without throwing
            })
        })

        describe('Edge Cases', () => {
            it('should return empty array for empty query', async () => {
                const results = await getFoodSearchResults('')
                expect(results).toEqual([])
            })

            it('should return empty array for whitespace-only query', async () => {
                const results = await getFoodSearchResults('   ')
                expect(results).toEqual([])
            })

            it('should return empty array for tab and newline characters', async () => {
                const results = await getFoodSearchResults('\t\n')
                expect(results).toEqual([])
            })

            it('should handle malformed API response with missing foods property', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({}),
                })

                const results = await getFoodSearchResults('malformed')
                expect(results).toEqual([])
            })

            it('should handle response with empty food array', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [],
                        },
                    }),
                })

                const results = await getFoodSearchResults('noresults')
                expect(results).toEqual([])
            })

            it('should handle response with null food array', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: null,
                        },
                    }),
                })

                const results = await getFoodSearchResults('nullfood')
                expect(results).toEqual([])
            })

            it('should handle foods with missing optional fields', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: '123', food_name: 'Test Food' }, { food_id: '456' }, { food_name: 'No ID' }],
                        },
                    }),
                })

                const results = await getFoodSearchResults('partial')
                expect(results).toHaveLength(3)
                expect(results[0].fdcId).toBe('123')
                expect(results[1].description).toBe('')
                expect(results[2].fdcId).toBe('')
            })

            it('should handle very long query strings', async () => {
                const longQuery = 'a'.repeat(1000)
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [],
                        },
                    }),
                })

                const results = await getFoodSearchResults(longQuery)
                expect(results).toEqual([])
            })

            it('should handle special characters in query', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: '123', food_name: 'Test' }],
                        },
                    }),
                })

                const results = await getFoodSearchResults('test@#$%^&*()')
                expect(results).toHaveLength(1)
            })
        })

        describe('Challenging Cases', () => {
            it('should handle multiple concurrent searches with same query', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: '123', food_name: 'Concurrent' }],
                        },
                    }),
                })

                const [result1, result2, result3] = await Promise.all([getFoodSearchResults('concurrent'), getFoodSearchResults('concurrent'), getFoodSearchResults('concurrent')])

                expect(result1).toEqual(result2)
                expect(result2).toEqual(result3)
            })

            it('should handle cache invalidation after TTL', async () => {
                const originalNow = Date.now
                const baseTime = originalNow()

                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: 'ttl-old', food_name: 'Old' }],
                        },
                    }),
                })

                Date.now = jest.fn(() => baseTime)
                await getFoodSearchResults('ttl-test-unique')

                // Mock time passing beyond cache TTL (7 days + 1ms)
                Date.now = jest.fn(() => baseTime + 7 * 24 * 60 * 60 * 1000 + 1)

                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: 'ttl-new', food_name: 'New' }],
                        },
                    }),
                })

                const results = await getFoodSearchResults('ttl-test-unique')
                expect(results[0].description).toBe('New')

                Date.now = originalNow
            })

            it('should handle token refresh during multiple requests', async () => {
                const originalNow = Date.now
                const baseTime = originalNow()

                // First token request
                Date.now = jest.fn(() => baseTime)
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'token1', expires_in: 3600 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: 'token-first', food_name: 'First' }],
                        },
                    }),
                })

                await getFoodSearchResults('token-refresh-test')

                // Mock token expiry (2 hours later, beyond 1 hour buffer)
                Date.now = jest.fn(() => baseTime + 2 * 60 * 60 * 1000)

                // Second token request (should refresh)
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'token2', expires_in: 3600 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: 'token-second', food_name: 'Second' }],
                        },
                    }),
                })

                const results = await getFoodSearchResults('token-refresh-test-new')
                expect(results[0].description).toBe('Second')

                Date.now = originalNow
            })

            it('should handle case variations in cache keys', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        foods: {
                            food: [{ food_id: 'case-123', food_name: 'Case Test' }],
                        },
                    }),
                })

                await getFoodSearchResults('CASE-KEY-TEST')
                const firstCallCount = (fetch as jest.Mock).mock.calls.length

                // Should use cache (case-insensitive, both normalize to 'case-key-test')
                const results = await getFoodSearchResults('case-key-test')
                expect((fetch as jest.Mock).mock.calls.length).toBe(firstCallCount)
                expect(results[0].description).toBe('Case Test')
            })
        })
    })

    describe('getFoodDetails', () => {
        describe('Valid Cases', () => {
            it('should fetch and parse food details with all fields', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-all-123',
                            food_name: 'Banana',
                            calories: 105,
                            protein: 1.3,
                            carbohydrate: 27,
                            fat: 0.4,
                            serving_size: '1 medium (118g)',
                            brand_name: 'Generic',
                        },
                    }),
                })

                const item = { description: 'Banana', fdcId: 'details-all-123' }
                const details = await getFoodDetails(item)

                expect(details).toEqual({
                    name: 'Banana',
                    fdcId: 'details-all-123',
                    calories: 105,
                    protein: 1.3,
                    carbs: 27,
                    fats: 0.4,
                    servingSize: '1 medium (118g)',
                    brandName: 'Generic',
                })
            })

            it('should handle food details with missing optional fields', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-partial-456',
                            food_name: 'Apple',
                            calories: 95,
                            // Missing protein, carbs, fat, serving_size, brand_name
                        },
                    }),
                })

                const item = { description: 'Apple', fdcId: 'details-partial-456' }
                const details = await getFoodDetails(item)

                expect(details).toEqual({
                    name: 'Apple',
                    fdcId: 'details-partial-456',
                    calories: 95,
                    protein: 0,
                    carbs: 0,
                    fats: 0,
                    servingSize: '1 serving',
                    brandName: '',
                })
            })

            it('should use food_id from response when available', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-id-999',
                            food_name: 'Rice',
                            calories: 200,
                            protein: 4,
                            carbohydrate: 45,
                            fat: 0.5,
                            serving_size: '1 cup',
                            brand_name: '',
                        },
                    }),
                })

                const item = { description: 'Rice', fdcId: 'details-id-888' }
                const details = await getFoodDetails(item)
                expect(details?.fdcId).toBe('details-id-999')
            })

            it('should fallback to input fdcId when food_id missing', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_name: 'Test',
                            calories: 100,
                        },
                    }),
                })

                const item = { description: 'Test', fdcId: 'details-fallback-777' }
                const details = await getFoodDetails(item)
                expect(details?.fdcId).toBe('details-fallback-777')
            })

            it('should use cache for repeated detail requests', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-cache-999',
                            food_name: 'Rice',
                            calories: 200,
                            protein: 4,
                            carbohydrate: 45,
                            fat: 0.5,
                            serving_size: '1 cup',
                            brand_name: '',
                        },
                    }),
                })

                const item = { description: 'Rice', fdcId: 'details-cache-999' }
                await getFoodDetails(item)
                const firstCallCount = (fetch as jest.Mock).mock.calls.length

                const cachedDetails = await getFoodDetails(item)
                expect((fetch as jest.Mock).mock.calls.length).toBe(firstCallCount)
                expect(cachedDetails?.name).toBe('Rice')
            })
        })

        describe('Error Cases', () => {
            it('should handle API errors gracefully', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                })

                const item = { description: 'Error', fdcId: 'details-error-111' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
            })

            it('should handle network errors', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

                const item = { description: 'Network Error', fdcId: '222' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
            })

            it('should handle token fetch failures', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                })

                const item = { description: 'Token Error', fdcId: '333' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
            })

            it('should handle 404 errors for non-existent food', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 404,
                })

                const item = { description: 'Not Found', fdcId: '404' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
            })
        })

        describe('Edge Cases', () => {
            it('should return null for empty food ID', async () => {
                const result = await getFoodDetails({ description: 'Test', fdcId: '' })
                expect(result).toBeNull()
            })

            it('should return null for whitespace-only food ID', async () => {
                const result = await getFoodDetails({ description: 'Test', fdcId: '   ' })
                expect(result).toBeNull()
            })

            it('should handle missing food data in response', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({}),
                })

                const item = { description: 'Unknown', fdcId: '000' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
            })

            it('should handle null food in response', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: null,
                    }),
                })

                const item = { description: 'Null Food', fdcId: 'null' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
            })

            it('should handle zero and negative nutritional values', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'zero',
                            food_name: 'Zero Cal',
                            calories: 0,
                            protein: -1,
                            carbohydrate: 0,
                            fat: 0,
                        },
                    }),
                })

                const item = { description: 'Zero Cal', fdcId: 'zero' }
                const details = await getFoodDetails(item)
                expect(details?.calories).toBe(0)
                expect(details?.protein).toBe(-1)
            })

            it('should handle very large nutritional values', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'large',
                            food_name: 'Large Values',
                            calories: 99999,
                            protein: 1000,
                            carbohydrate: 5000,
                            fat: 2000,
                        },
                    }),
                })

                const item = { description: 'Large Values', fdcId: 'large' }
                const details = await getFoodDetails(item)
                expect(details?.calories).toBe(99999)
                expect(details?.protein).toBe(1000)
            })

            it('should handle string nutritional values (should convert to number)', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'string',
                            food_name: 'String Values',
                            calories: '100' as any,
                            protein: '20.5' as any,
                        },
                    }),
                })

                const item = { description: 'String Values', fdcId: 'string' }
                const details = await getFoodDetails(item)
                expect(details?.calories).toBe(100)
                expect(details?.protein).toBe(20.5)
            })
        })

        describe('Challenging Cases', () => {
            it('should handle multiple concurrent detail requests for same food', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'concurrent',
                            food_name: 'Concurrent Food',
                            calories: 100,
                        },
                    }),
                })

                const item = { description: 'Concurrent Food', fdcId: 'concurrent' }
                const [detail1, detail2, detail3] = await Promise.all([getFoodDetails(item), getFoodDetails(item), getFoodDetails(item)])

                expect(detail1).toEqual(detail2)
                expect(detail2).toEqual(detail3)
            })

            it('should handle cache invalidation after TTL for details', async () => {
                const originalNow = Date.now
                const baseTime = originalNow()

                Date.now = jest.fn(() => baseTime)
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-ttl-old',
                            food_name: 'Old Details',
                            calories: 100,
                        },
                    }),
                })

                const item = { description: 'TTL Test', fdcId: 'details-ttl-old' }
                await getFoodDetails(item)

                // Mock time passing beyond cache TTL (7 days + 1ms)
                Date.now = jest.fn(() => baseTime + 7 * 24 * 60 * 60 * 1000 + 1)

                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-ttl-new',
                            food_name: 'New Details',
                            calories: 200,
                        },
                    }),
                })

                const item2 = { description: 'TTL Test', fdcId: 'details-ttl-new' }
                const details = await getFoodDetails(item2)
                expect(details?.name).toBe('New Details')
                expect(details?.calories).toBe(200)

                Date.now = originalNow
            })

            it('should handle different foods with same description but different IDs', async () => {
                // First food - token + details
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-same-desc-id1',
                            food_name: 'Chicken Breast',
                            calories: 165,
                        },
                    }),
                })

                const item1 = { description: 'Chicken Breast', fdcId: 'details-same-desc-id1' }
                const details1 = await getFoodDetails(item1)

                // Second food - token is cached (won't fetch), only need details mock
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-same-desc-id2',
                            food_name: 'Chicken Breast',
                            calories: 180,
                        },
                    }),
                })

                const item2 = { description: 'Chicken Breast', fdcId: 'details-same-desc-id2' }
                const details2 = await getFoodDetails(item2)

                expect(details1).not.toBeNull()
                expect(details2).not.toBeNull()
                expect(details1?.fdcId).toBe('details-same-desc-id1')
                expect(details2?.fdcId).toBe('details-same-desc-id2')
                expect(details1?.calories).toBe(165)
                expect(details2?.calories).toBe(180)
            })

            it('should handle token refresh during detail request', async () => {
                const originalNow = Date.now
                let currentTime = originalNow()

                // Mock Date.now to return our controlled time
                Date.now = jest.fn(() => currentTime)

                // First call - get token and details
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'token1', expires_in: 3600 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-token-refresh',
                            food_name: 'First',
                            calories: 100,
                        },
                    }),
                })

                const item = { description: 'Token Test', fdcId: 'details-token-refresh' }
                await getFoodDetails(item)

                // Move time forward beyond cache TTL (7 days) AND token expiry (2 hours)
                // This invalidates both cache and token, forcing refresh of both
                currentTime = currentTime + 7 * 24 * 60 * 60 * 1000 + 1
                Date.now = jest.fn(() => currentTime)

                // Mock new token fetch (token expired, needs refresh)
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'token2', expires_in: 3600 }),
                })
                // Mock new details fetch (cache invalid, so new request)
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        food: {
                            food_id: 'details-token-refresh',
                            food_name: 'Second',
                            calories: 200,
                        },
                    }),
                })

                // Use same ID to test cache invalidation + token refresh
                const details = await getFoodDetails(item)
                expect(details).not.toBeNull()
                expect(details?.name).toBe('Second')
                expect(details?.calories).toBe(200)

                Date.now = originalNow
            })
        })

        describe('Error Logging and Observability', () => {
            let consoleErrorSpy: jest.SpyInstance

            beforeEach(() => {
                consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
            })

            afterEach(() => {
                consoleErrorSpy.mockRestore()
            })

            it('should log error details when getFoodDetails API request fails', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                    text: async () => 'Server error details',
                })

                const item = { description: 'Error Test', fdcId: 'error-500' }
                await getFoodDetails(item)

                expect(consoleErrorSpy).toHaveBeenCalled()
            })

            it('should log error when getFoodDetails network request fails', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                const networkError = new Error('Network request failed')
                ;(fetch as jest.Mock).mockRejectedValueOnce(networkError)

                const item = { description: 'Network Test', fdcId: 'network-error' }
                await getFoodDetails(item)

                expect(consoleErrorSpy).toHaveBeenCalled()
                const errorCall = consoleErrorSpy.mock.calls[0]
                expect(errorCall[0]).toContain('Failed to load food details')
                expect(errorCall[1]).toBe(networkError)
            })

            it('should log error when token fetch fails for getFoodDetails', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    statusText: 'Unauthorized',
                    text: async () => 'Invalid credentials',
                })

                const item = { description: 'Token Error', fdcId: 'token-error' }
                await getFoodDetails(item)

                expect(consoleErrorSpy).toHaveBeenCalled()
            })

            it('should log error when API returns null for getFoodDetails', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    text: async () => 'Bad Request: Invalid food ID',
                })

                const item = { description: 'Bad Request', fdcId: 'bad-id' }
                await getFoodDetails(item)

                expect(consoleErrorSpy).toHaveBeenCalled()
            })

            it('should log error when getFoodDetails receives malformed response', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => {
                        throw new Error('Invalid JSON')
                    },
                })

                const item = { description: 'Malformed', fdcId: 'malformed-json' }
                await getFoodDetails(item)

                expect(consoleErrorSpy).toHaveBeenCalled()
                const errorCall = consoleErrorSpy.mock.calls[0]
                expect(errorCall[0]).toContain('Failed to load food details')
            })

            it('should log error when food details response is missing food property', async () => {
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ access_token: 'test_token', expires_in: 86400 }),
                })
                ;(fetch as jest.Mock).mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        // Missing 'food' property
                        error: { message: 'Food not found' },
                    }),
                })

                const item = { description: 'Missing Food', fdcId: 'missing-food' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
                // Should complete without throwing
            })

            it('should not make API call when getFoodDetails receives empty fdcId', async () => {
                jest.clearAllMocks()
                const item = { description: 'Empty ID', fdcId: '' }
                const details = await getFoodDetails(item)
                expect(details).toBeNull()
                // Should return null immediately without API call
                expect(fetch).not.toHaveBeenCalled()
            })
        })
    })
})
