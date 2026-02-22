// ARCHITECTURE.md

# Mobile-First Tip Modal - Architecture & Data Flow

## Component Hierarchy

```
TipModal (Main Container)
│
├── Step: Amount
│   ├── AssetToggle (Currency selection)
│   │   ├── Toggle Switch
│   │   ├── Balance Display (XLM & USDC)
│   │   └── Conversion Rate Info
│   │
│   └── AmountSelector
│       ├── Preset Buttons [1, 5, 10, 25, 50]
│       ├── Range Slider (0 to max balance)
│       ├── Custom Input Field
│       └── USD Conversion Display
│
├── Step: Message
│   └── TipMessage
│       ├── Textarea (with auto-resize)
│       ├── Emoji Picker Button
│       │   └── Emoji Grid (18 presets)
│       └── Character Counter (0/280)
│
├── Step: Confirmation
│   └── TipConfirmation
│       ├── Recipient Display
│       ├── Tip Amount Breakdown
│       ├── Network Fee Display
│       ├── Message Summary (if provided)
│       ├── Balance Check Status
│       └── Exchange Rate Info
│
├── Step: Loading
│   └── Spinner Animation
│
└── Step: Success
    └── Success Checkmark & Message
```

## Data Flow Diagram

```
User Interaction
    ↓
┌─────────────────────────────────────┐
│  Gesture Handlers                   │
│  ├── Swipe Down → Dismiss           │
│  ├── Double Tap → Quick Action      │
│  ├── Pull Down → Refresh Balance    │
│  └── Virtual Keyboard Detection     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Haptic Feedback                    │
│  ├── Selection Tap (light)          │
│  ├── Navigation (medium)            │
│  ├── Success Pattern                │
│  └── Error Pattern                  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  State Management (TipModal)        │
│  ├── step: TipModalStep             │
│  ├── tipAmount: number              │
│  ├── currency: 'XLM' | 'USDC'      │
│  ├── message: string                │
│  └── error: string | null           │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  Step Components (UI)               │
│  ├── StepAmount (read props)        │
│  ├── StepMessage (read props)       │
│  ├── StepConfirmation (read props)  │
│  ├── StepLoading                    │
│  └── StepSuccess                    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│  User Callbacks                     │
│  ├── onTipSuccess(amount,currency)  │
│  └── onClose()                      │
└─────────────────────────────────────┘
               ↓
        Backend API Call
```

## State Machine

```
START
  ↓
[AMOUNT STEP] → Continue → [MESSAGE STEP]
  ↑                            ↓
  │                       Back ↓ Next
  │                            ↓
  ├─────← Back ←─ [CONFIRMATION STEP]
  │                  Send Tip ↓
  │                    [LOADING STEP]
  │                      ↓
  │            ┌─────────┴─────────┐
  │            ↓                   ↓
  │        SUCCESS ←→          ERROR
  │        (1.5s)         → back to confirmation
  │            ↓
  │        [CLOSE]
  │            ↓
  └──────────→ END
```

## Gesture Detection Flow

```
User Touch Input
    ↓
┌──────────────────────────┐
│  useSwipeGesture Hook    │
│  ├── Listen: touchstart  │
│  ├── Track: touchmove    │
│  └── Detect: touchend    │
└────────┬─────────────────┘
         ↓
    ┌────────────┐
    │ Calculate: │
    ├─ Distance  │
    ├─ Velocity  │
    ├─ Duration  │
    └────┬───────┘
         ↓
    ┌─────────────┐
    │ Direction?  │
    ├─ UP        │
    ├─ DOWN      │ → Trigger correct handler
    ├─ LEFT      │
    └─ RIGHT     │
         ↓
    [ACTION]
         ↓
    [HAPTIC FEEDBACK]
```

## Haptic Feedback Patterns

```
User Action → Event Handler → useHaptic()
    ↓
[Check Device Support]
    ├─ Supported → navigator.vibrate()
    └─ Not Supported → Graceful fallback
    ↓
[Pattern Type]
├─ Light (10ms) → Selection/Tap
├─ Medium (30ms) → Form input/Navigation
├─ Heavy (50ms) → Important action
├─ Success ([10,20,20]) → Completion
├─ Error ([50,30,50,30,50]) → Failure
├─ Warning ([30,10,30]) → Validation
└─ Selection (5ms) → UI feedback
    ↓
Multiple Patterns Available
└─ Custom([n, n, n...]) → Any pattern
```

## Animation Pipeline

```
User Interaction
    ↓
[React Event Handler]
    ↓
[Update State]
    ↓
┌──────────────────────────────┐
│  React-Spring Animation      │
├──────────────────────────────┤
│ const [spring, api] =        │
│   useSpring({ ... })         │
└────────┬─────────────────────┘
         ↓
   [60fps via transform]
     - translateX
     - translateY
     - scale
     - opacity
         ↓
   [Respect reduced motion]
     - Skip if prefers-reduced-motion
         ↓
[Rendered Output]
```

## Component Integration Points

```
┌─ TipModal ◄──────────┐
│    │                 │
├─ AmountSelector      │
│    │                 │
│    ├─ AssetToggle    │ Bidirectional Data Flow
│    │    │            │ (Props In, Events Out)
│    └─ Slider         │
│         │            │
├─ TipMessage          │
│    │                 │
│    └─ EmojiPicker    │
│         │            │
├─ TipConfirmation     │
│    │                 │
│    └─ BalanceCheck   │
│                      │
└─ Global Hooks ───────┘
     ├─ useSwipeGesture
     ├─ usePullToRefresh
     ├─ useDoubleTap
     ├─ useVirtualKeyboard
     └─ useHaptic
```

## Network Request Flow

```
User clicks "Send Tip"
    ↓
[TipConfirmation Component]
    ↓
[handleConfirmTip()]
    ├─ Validate amount > 0
    ├─ Check balance
    └─ Prepare data
    ↓
[onTipSuccess() callback]
    ↓
[Parent Component]
    ├─ Build transaction
    ├─ Sign transaction
    └─ Send to backend
    ↓
[POST /api/tips]
    ├─ Validate server-side
    ├─ Process transaction
    └─ Store in database
    ↓
Response
    ├─ Success → Show success screen
    │   ├─ Haptic: 'success'
    │   ├─ Animation: success-pop
    │   └─ Close after 1.5s
    │
    └─ Error → Show error message
        ├─ Haptic: 'error'
        ├─ Display error text
        └─ Allow retry
```

## Testing Architecture

```
┌─────────────────────┐
│   Unit Tests        │ ← Individual functions
├─────────────────────┤
│ ├─ gestures.test.ts │ (GestureHandler, utils)
│ └─ haptics.test.ts  │ (HapticFeedback class)
└─────────────────────┘
         ↓
┌─────────────────────┐
│ Component Tests     │ ← React components
├─────────────────────┤
│ ├─ TipModal.test.tsx         │
│ ├─ AmountSelector.test.tsx   │
│ ├─ AssetToggle.test.tsx      │
│ ├─ TipMessage.test.tsx       │
│ └─ TipConfirmation.test.tsx  │
└─────────────────────┘
         ↓
┌─────────────────────┐
│ Integration Tests   │ ← Full flows
├─────────────────────┤
│ ├─ Multi-step flow  │
│ ├─ Gesture tracking │
│ └─ Error handling   │
└─────────────────────┘
         ↓
      Coverage Report
```

## Mobile-Specific Features

```
┌───────────────────────────────────────┐
│  Platform Detection & Adaptation      │
├───────────────────────────────────────┤
│                                       │
│  isTouchDevice() ──→ Enable Gestures │
│                                       │
│  HapticFeedback.available ──→         │
│    ├─ iOS: Strong, consistent         │
│    ├─ Android: Variable               │
│    └─ Fallback: Visual feedback       │
│                                       │
│  Virtual Keyboard ──→ Reposition      │
│    └─ Adjust padding                  │
│                                       │
│  Safe Area Insets ──→ Notch/Island   │
│    ├─ env(safe-area-inset-*)         │
│    └─ Apply to bottom padding         │
│                                       │
│  Reduced Motion ──→ Skip Animations   │
│    └─ prefers-reduced-motion          │
│                                       │
└───────────────────────────────────────┘
```

## Performance Optimization Strategy

```
┌─────────────────┐
│ Rendering       │
├─────────────────┤
│ • Memoization   │
│ • Lazy loading  │
│ • Code splitting│
└────────┬────────┘
         ↓
┌─────────────────┐
│ Animation       │
├─────────────────┤
│ • transform only│
│ • opacity only  │
│ • GPU accel     │
│ • 60fps target  │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Events          │
├─────────────────┤
│ • Debounce      │
│ • Throttle      │
│ • Passive       │
│ • Cleanup       │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Memory          │
├─────────────────┤
│ • <5MB total    │
│ • No leaks      │
│ • Clean unmount │
│ • Refs cleanup  │
└─────────────────┘
```

## File Structure & Dependencies

```
TipModal.tsx
├─ AmountSelector.tsx
│  ├─ AssetToggle.tsx
│  │  └─ react-spring
│  ├─ react-spring
│  └─ animationUtils
├─ TipMessage.tsx
│  ├─ lucide-react (Smile icon)
│  └─ CSS animations
├─ TipConfirmation.tsx
│  ├─ lucide-react (AlertCircle, CheckCircle)
│  └─ formatting utils
├─ useGestures.ts (custom hook)
│  └─ gestures.ts (utilities)
├─ haptics.ts  (utilities)
└─ animationUtils.ts

Dependencies:
├─ React 18+
├─ react-spring 9+
├─ lucide-react
├─ Tailwind CSS
└─ TypeScript
```

## Accessibility Architecture

```
┌──────────────────────┐
│  Screen Readers      │
├──────────────────────┤
│ ├─ role="dialog"     │
│ ├─ aria-modal=true   │
│ ├─ aria-labelledby   │
│ └─ aria-label        │
└────────┬─────────────┘
         ↓
┌──────────────────────┐
│  Keyboard Nav        │
├──────────────────────┤
│ ├─ Tab order         │
│ ├─ Enter to activate │
│ └─ Escape to close   │
└────────┬─────────────┘
         ↓
┌──────────────────────┐
│  Visual Design       │
├──────────────────────┤
│ ├─ 44px+ targets     │
│ ├─ WCAG AA contrast  │
│ └─ Color not only    │
└────────┬─────────────┘
         ↓
┌──────────────────────┐
│  Motion             │
├──────────────────────┤
│ ├─ Reduced motion    │
│ ├─ Sanitized         │
│ └─ Optional          │
└──────────────────────┘
```

---

**Legend:**
- `→` = Flow direction
- `├` = Connection
- `└` = Final connection
- `↓` = Process forward

This architecture ensures:
✅ Scalability - Easy to extend
✅ Performance - Optimized rendering
✅ Maintainability - Clear component boundaries
✅ Testability - Isolated units
✅ Accessibility - WCAG AA compliant
✅ Mobile-first - Responsive design
