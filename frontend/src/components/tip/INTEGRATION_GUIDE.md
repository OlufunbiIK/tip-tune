// INTEGRATION_GUIDE.md

# TipModal Integration Guide

## Quick Start

### 1. Basic Usage

```typescript
import { useState } from 'react';
import { TipModal } from '@/components/tip';

export function PlayerControls() {
  const [showTipModal, setShowTipModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowTipModal(true)} className="flex items-center gap-2">
        💰 Tip Artist
      </button>

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        artistId="artist-123"
        artistName="Artist Name"
        onTipSuccess={async (amount, currency, message) => {
          await sendTipToBackend(amount, currency, message);
        }}
      />
    </>
  );
}
```

### 2. With Context (Recommended)

```typescript
// contexts/TipContext.ts
import { createContext, useState, ReactNode } from 'react';

interface TipContextType {
  showTipModal: (artistId: string, artistName: string, image?: string) => void;
  hideTipModal: () => void;
  currentArtist: { id: string; name: string; image?: string } | null;
  isOpen: boolean;
}

export const TipContext = createContext<TipContextType | null>(null);

export function TipProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentArtist, setCurrentArtist] = useState<any>(null);

  const showTipModal = (id: string, name: string, image?: string) => {
    setCurrentArtist({ id, name, image });
    setIsOpen(true);
  };

  const hideTipModal = () => {
    setIsOpen(false);
    setTimeout(() => setCurrentArtist(null), 300);
  };

  return (
    <TipContext.Provider
      value={{
        showTipModal,
        hideTipModal,
        currentArtist,
        isOpen,
      }}
    >
      {children}
      {currentArtist && (
        <TipModal
          isOpen={isOpen}
          onClose={hideTipModal}
          artistId={currentArtist.id}
          artistName={currentArtist.name}
          artistImage={currentArtist.image}
          onTipSuccess={handleTipSuccess}
          walletBalance={{ xlm: 1000, usdc: 100 }}
          xlmUsdRate={0.11}
        />
      )}
    </TipContext.Provider>
  );
}

// useHookToUseTipContext.ts
import { useContext } from 'react';

export function useTipModal() {
  const context = useContext(TipContext);
  if (!context) {
    throw new Error('useTipModal must be used within TipProvider');
  }
  return context;
}
```

### 3. Integration with App.tsx

```typescript
import { TipProvider } from '@/contexts/TipContext';

function App() {
  return (
    <TipProvider>
      {/* Rest of your app */}
      <Router>
        <Routes>
          {/* ... */}
        </Routes>
      </Router>
    </TipProvider>
  );
}
```

### 4. Usage in Components

```typescript
import { useTipModal } from '@/hooks/useTipModal';

export function ArtistCard({ artist }) {
  const { showTipModal } = useTipModal();

  return (
    <div className="artist-card">
      <img src={artist.image} alt={artist.name} />
      <h3>{artist.name}</h3>
      <button
        onClick={() => showTipModal(artist.id, artist.name, artist.image)}
        className="btn-tip"
      >
        Tip
      </button>
    </div>
  );
}
```

## Backend Integration

### API Endpoint Structure

```typescript
// POST /api/tips
interface CreateTipRequest {
  artistId: string;
  amount: number;
  currency: 'XLM' | 'USDC';
  message?: string;
  senderPublicKey: string;  // From wallet
}

interface CreateTipResponse {
  id: string;
  transactionHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}
```

### Example Backend Implementation (NestJS)

```typescript
// tips.controller.ts
@Post()
@UseGuards(AuthGuard)
async createTip(
  @Body() createTipDto: CreateTipDto,
  @Request() req: AuthenticatedRequest,
) {
  return this.tipsService.createTip(
    createTipDto,
    req.user.publicKey,
  );
}

// tips.service.ts
async createTip(
  dto: CreateTipDto,
  senderPublicKey: string,
): Promise<CreateTipResponse> {
  // 1. Validate sender balance
  // 2. Create tip record in database
  // 3. Initiate blockchain transaction
  // 4. Store message if provided
  // 5. Send notifications to artist
  // 6. Return response
}
```

## Wallet Integration

### Freighter Wallet Integration

```typescript
import { useFetchCall, useWallet } from '@stellar/freighter-react';

export function TipModalWrapper() {
  const { publicKey, signTransaction } = useWallet();

  const handleTipSuccess = async (
    amount: number,
    currency: string,
    message?: string,
  ) => {
    // 1. Build transaction
    const account = await server.getAccount(publicKey);
    const transaction = new SorobanRpc.Operation.invokeContractFunction({
      contractId: CONTRACT_ID,
      method: 'transfer',
      args: [
        nativeToScVal(publicKey),
        nativeToScVal(amount),
        nativeToScVal(currency),
      ],
    });

    // 2. Sign transaction
    const signed = await signTransaction(transaction.toXDR());

    // 3. Submit to backend
    const response = await fetch('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        currency,
        message,
        signedXdr: signed,
        publicKey,
      }),
    });

    return response.json();
  };

  return (
    <TipModal
      {...props}
      onTipSuccess={handleTipSuccess}
    />
  );
}
```

## State Management Integration

### Redux Integration (if using Redux)

```typescript
// slices/tipsSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const sendTip = createAsyncThunk(
  'tips/send',
  async (tipData: TipData, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tipData),
      });
      return response.json();
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const tipsSlice = createSlice({
  name: 'tips',
  initialState: {
    loading: false,
    error: null,
    lastTip: null,
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendTip.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendTip.fulfilled, (state, action) => {
        state.loading = false;
        state.lastTip = action.payload;
      })
      .addCase(sendTip.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});
```

## Advanced Features

### Custom Presets per Artist

```typescript
interface ArtistSettings {
  tipPresets?: number[];
  minTipAmount?: number;
  acceptedCurrencies?: ('XLM' | 'USDC')[];
}

export function TipModalWithCustomPresets({ 
  artist,
}: {
  artist: Artist & ArtistSettings;
}) {
  return (
    <AmountSelector
      presets={artist.tipPresets || [1, 5, 10, 25, 50]}
      currency="XLM"
      onChange={(amount) => {
        // Custom logic
      }}
    />
  );
}
```

### Tip History Integration

```typescript
export function TipModalWithHistory() {
  const [tipHistory, setTipHistory] = useState([]);

  const handleTipSuccess = async (...) => {
    // ... tip logic
    // Add to history
    setTipHistory(prev => [newTip, ...prev]);
  };

  return (
    <>
      <TipModal onTipSuccess={handleTipSuccess} />
      <TipHistory tips={tipHistory} />
    </>
  );
}
```

### Analytics Integration

```typescript
import { trackEvent } from '@/services/analytics';

const handleTipSuccess = async (amount, currency, message) => {
  try {
    await sendTipToBackend(amount, currency, message);

    // Track success
    trackEvent('tip_sent', {
      amount,
      currency,
      hasMessage: !!message,
      artistId,
    });
  } catch (error) {
    // Track error
    trackEvent('tip_failed', {
      error: error.message,
      artistId,
    });
    throw error;
  }
};
```

## Testing Integration

### E2E Testing with Cypress

```typescript
describe('Tip Modal Flow', () => {
  it('should complete tip flow successfully', () => {
    cy.visit('/artist-profile/123');
    cy.contains('button', 'Tip').click();

    // Amount step
    cy.contains('button', '10').click();
    cy.contains('button', 'Continue').click();

    // Message step
    cy.get('textarea').type('Great performance!');
    cy.contains('button', 'Review').click();

    // Confirmation
    cy.contains('button', 'Send Tip').click();
    cy.contains('Tip sent!').should('be.visible');
  });

  it('should dismiss on swipe (mobile)', () => {
    cy.viewport('iphone-x');
    cy.visit('/artist-profile/123');
    cy.contains('button', 'Tip').click();

    // Simulate swipe down
    cy.get('[role="dialog"]')
      .trigger('touchstart', { touches: [{ clientY: 100 }] })
      .trigger('touchend', { changedTouches: [{ clientY: 300 }] });

    cy.get('[role="dialog"]').should('not.exist');
  });
});
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load TipModal
const TipModal = lazy(() => import('@/components/tip/TipModal'));

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TipModal {...props} />
    </Suspense>
  );
}
```

### Image Optimization

```typescript
export function OptimizedArtistImage({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt="Artist"
      className="w-10 h-10 rounded-full object-cover"
      loading="lazy"
      decoding="async"
    />
  );
}
```

## Troubleshooting Common Issues

### Issue: Modal doesn't open
```typescript
// Check state
useEffect(() => {
  console.log('Modal open state:', isOpen);
}, [isOpen]);
```

### Issue: Gestures not working
```typescript
// Verify touch events
useSwipeGesture(ref, {
  enabled: true,  // Must be true
  onSwipeDown: () => console.log('Swiped down!'),
});
```

### Issue: Haptics not triggering
```typescript
// Check haptic availability
const { available } = useHaptic();
console.log('Haptics available:', available);
```

## Next Steps

1. ✅ Copy the component files to your project
2. ✅ Configure environment variables (API endpoints, XLM rate)
3. ✅ Set up wallet integration
4. ✅ Configure backend API endpoints
5. ✅ Add to your routing/state management
6. ✅ Test on mobile devices
7. ✅ Enable analytics tracking
8. ✅ Deploy to production

## Support

For issues or questions:
1. Check TIP_MODAL_README.md for detailed documentation
2. Review test files for usage examples
3. Check browser console for error messages
4. Test on actual mobile devices

---

Last Updated: February 2026
