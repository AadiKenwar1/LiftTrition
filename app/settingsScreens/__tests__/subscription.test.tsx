// react-test-renderer ships no bundled types (@types/react-test-renderer not
// installed); suppress the missing-declaration error (test-only runtime dep).
// @ts-ignore
import { act, create } from 'react-test-renderer'
import { Alert, Text, TouchableOpacity } from 'react-native'
import { ThemeProvider } from '@/context/ThemeContext'
import SubscriptionScreen from '../subscription'

/**
 * The screen-level halves of the billing guarantees: the purchase/restore CTAs disable until
 * the store identity is proven, and a payment survives the screen closing under it. The screen
 * holds no navigation lock, so leaving mid-purchase is reachable and must stay harmless.
 */

// identityGuard imports react-native-purchases at module scope; stub it so the real
// message constant below can be required without the native module.
jest.mock('react-native-purchases', () => ({ __esModule: true, default: {} }))

// Reassigned per test, read by the mocked useBilling below (mock prefix: factories hoist)
let mockBillingState: Record<string, unknown>

jest.mock('@/context/BillingContext', () => ({
    useBilling: () => mockBillingState,
    hasActiveEntitlement: (info: unknown) => Boolean((info as { entitlements?: { active?: Record<string, unknown> } })?.entitlements?.active?.['LiftTrition Pro']),
    // Pass the REAL constant through the mock so the screen renders the actual copy and
    // the literal assertions below pin it — a drift in the real string fails these tests.
    BILLING_IDENTITY_ERROR_MESSAGE: jest.requireActual('@/context/BillingContext/functions/identityGuard').BILLING_IDENTITY_ERROR_MESSAGE,
}))

// Visual-only deps that drag in native modules the renderer cannot host
jest.mock('expo-linear-gradient', () => ({
    LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('lucide-react-native', () => ({
    BarChart3: () => null,
    Database: () => null,
    Sparkles: () => null,
    Zap: () => null,
}))
jest.mock('@/components/NeutralComponents/PressableScale', () => ({ children }: { children: React.ReactNode }) => children)
jest.mock('@/components/NeutralComponents/TermsAndPrivacyModal', () => () => null)
jest.mock('@/lib/hooks/useScreenBottomPad', () => ({ useScreenBottomPad: () => 0 }))

const A_PACKAGE = { identifier: 'annual' }
// Literal on purpose (not imported): pins the user-visible copy for every not-purchasable
// state — identity unproven, packages missing, no RevenueCat key.
const UNAVAILABLE_NOTE = "Purchases aren't available right now. Please try again later."

// A promise whose settlement the test controls, to hold a purchase/restore in flight
function deferred<T>() {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

type Root = ReturnType<typeof create>

async function mountScreen(): Promise<Root> {
    let root: Root
    await act(async () => {
        root = create(
            <ThemeProvider>
                <SubscriptionScreen />
            </ThemeProvider>,
        )
    })
    return root!
}

// Finds the TouchableOpacity whose subtree renders the given label
function findButtonByText(root: Root, text: string) {
    const match = root.root.findAllByType(TouchableOpacity).find((node) => node.findAllByType(Text).some((t) => t.props.children === text))
    if (!match) throw new Error(`no button labeled "${text}"`)
    return match
}

function hasText(root: Root, text: string): boolean {
    return root.root.findAllByType(Text).some((t) => t.props.children === text)
}

describe('SubscriptionScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockBillingState = {
            loading: false,
            restoring: false,
            error: null,
            identityReady: true,
            hasPremium: false,
            monthlyPackage: { identifier: 'monthly' },
            annualPackage: A_PACKAGE,
            priceInfo: { price: '$6.99', period: 'month' },
            annualPriceInfo: { price: '$39.99', period: 'year' },
            annualSavingsPercent: 52,
            purchasePackage: jest.fn().mockResolvedValue({}),
            restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
        }
    })

    it('still reports success when a purchase settles after the screen has closed', async () => {
        // Nothing vetoes the back button any more, so the payment can outlive the screen.
        // purchasePackage settles against BillingProvider (which outlives it) and Alert is
        // global, so closing mid-payment must neither cancel the purchase nor throw.
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
        const purchase = deferred<Record<string, unknown>>()
        mockBillingState.purchasePackage = jest.fn().mockReturnValue(purchase.promise)
        const root = await mountScreen()

        await act(async () => {
            findButtonByText(root, 'Subscribe Now').props.onPress()
        })
        await act(async () => {
            root.unmount()
        })
        await act(async () => {
            purchase.resolve({})
            await Promise.resolve()
        })

        expect(mockBillingState.purchasePackage).toHaveBeenCalledWith(A_PACKAGE)
        expect(alertSpy).toHaveBeenCalledWith('Success', 'Your subscription is now active!')
        alertSpy.mockRestore()
    })

    it('disables purchase and restore and shows the unavailable note until identity is proven', async () => {
        mockBillingState.identityReady = false
        const root = await mountScreen()

        expect(findButtonByText(root, 'Subscribe Now').props.disabled).toBe(true)
        expect(findButtonByText(root, 'Restore Purchases').props.disabled).toBe(true)
        expect(hasText(root, UNAVAILABLE_NOTE)).toBe(true)
    })

    it('enables the CTAs and hides the note once identity is proven and packages are loaded', async () => {
        // Positive control: a wiring that disables everything must fail this
        const root = await mountScreen()

        expect(findButtonByText(root, 'Subscribe Now').props.disabled).toBe(false)
        expect(findButtonByText(root, 'Restore Purchases').props.disabled).toBe(false)
        expect(hasText(root, UNAVAILABLE_NOTE)).toBe(false)
    })

    it('shows the unavailable note and disables the CTA when identity is proven but packages never loaded', async () => {
        // The silently-dead-button case: identityReady is true, so without this note the
        // disabled CTA would give no explanation at all (offerings fetch failed / no RC key)
        mockBillingState.monthlyPackage = null
        mockBillingState.annualPackage = null
        mockBillingState.priceInfo = null
        mockBillingState.annualPriceInfo = null
        const root = await mountScreen()

        expect(findButtonByText(root, 'Subscribe Now').props.disabled).toBe(true)
        expect(hasText(root, UNAVAILABLE_NOTE)).toBe(true)
        // Restore needs no package — it must stay usable so an existing subscriber can recover
        expect(findButtonByText(root, 'Restore Purchases').props.disabled).toBe(false)
    })
})
