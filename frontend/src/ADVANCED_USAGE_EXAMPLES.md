// ADVANCED_USAGE_EXAMPLES.md

# Advanced Usage Examples - Gesture & Haptic APIs

## Table of Contents
1. [Gesture Detection Examples](#gesture-detection-examples)
2. [Haptic Feedback Examples](#haptic-feedback-examples)
3. [Combined Gesture + Haptic](#combined-gesture--haptic)
4. [Real-world Component Examples](#real-world-component-examples)

---

## Gesture Detection Examples

### 1. Swipe Navigation between Screens

```typescript
import { useRef } from 'react';
import { useSwipeGesture } from '@/hooks/useGestures';
import { useHaptic } from '@/hooks/useGestures';

export function SwipeableScreens() {
  const ref = useRef<HTMLDivElement>(null);
  const [currentScreen, setCurrentScreen] = useState(0);
  const { trigger } = useHaptic();

  const handleSwipeLeft = () => {
    trigger('selection');
    setCurrentScreen(prev => prev + 1);
  };

  const handleSwipeRight = () => {
    trigger('selection');
    setCurrentScreen(prev => Math.max(0, prev - 1));
  };

  useSwipeGesture(ref, {
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    swipeThreshold: 50,
  });

  return (
    <div ref={ref} className="screen-container">
      {/* Screen content */}
    </div>
  );
}
```

### 2. Pull-to-Refresh Pattern

```typescript
import { useRef, useState } from 'react';
import { usePullToRefresh } from '@/hooks/useGestures';
import { useHaptic } from '@/hooks/useGestures';

export function RefreshableList() {
  const ref = useRef<HTMLDivElement>(null);
  const { pullOffset, isRefreshing } = usePullToRefresh(ref, {
    onRefresh: async () => {
      await fetchLatestData();
    },
    pullThreshold: 80,
  });

  return (
    <div ref={ref} className="list-container overflow-auto max-h-screen">
      {/* Pull indicator */}
      {pullOffset > 0 && (
        <div
          className="flex justify-center py-4 transition-opacity"
          style={{ opacity: Math.min(1, pullOffset / 80) }}
        >
          <div
            className="inline-block animate-spin"
            style={{ transform: `rotate(${(pullOffset / 80) * 360}deg)` }}
          >
            🔄
          </div>
        </div>
      )}

      {/* Loading state */}
      {isRefreshing && (
        <div className="p-4 text-center text-gray-400">
          Refreshing...
        </div>
      )}

      {/* List items */}
      <div className="list-items">
        {/* ... */}
      </div>
    </div>
  );
}
```

### 3. Carousel with Gesture Navigation

```typescript
import { useRef, useState } from 'react';
import { useSwipeGesture } from '@/hooks/useGestures';
import { useHaptic } from '@/hooks/useGestures';

export function Carousel({ items }: { items: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const { trigger } = useHaptic();

  const goToNext = () => {
    trigger('light');
    setIndex(prev => (prev + 1) % items.length);
  };

  const goToPrev = () => {
    trigger('light');
    setIndex(prev => (prev - 1 + items.length) % items.length);
  };

  useSwipeGesture(ref, {
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
    swipeThreshold: 30,
  });

  return (
    <div ref={ref} className="carousel-container relative overflow-hidden">
      <div
        className="transition-transform duration-300"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {items.map((item, i) => (
          <div key={i} className="carousel-item w-full flex-shrink-0">
            {/* Item content */}
          </div>
        ))}
      </div>

      {/* Indicators */}
      <div className="flex gap-2 justify-center mt-4">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setIndex(i);
              trigger('light');
            }}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === index ? 'bg-blue-primary' : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4. Double-Tap to Like/Favorite

```typescript
import { useRef, useState } from 'react';
import { useDoubleTap } from '@/hooks/useGestures';
import { useHaptic } from '@/hooks/useGestures';
import { Heart } from 'lucide-react';

export function LikeableTrack({ track }) {
  const ref = useRef<HTMLDivElement>(null);
  const { handleTap } = useDoubleTap(ref, {
    onDoubleTap: () => {
      setLiked(!liked);
      trigger('success');
    },
  });
  const [liked, setLiked] = useState(false);
  const { trigger } = useHaptic();

  return (
    <div
      ref={ref}
      onTouchEnd={handleTap}
      className="track-card p-4 rounded-lg cursor-pointer"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{track.title}</h3>
          <p className="text-sm text-gray-400">{track.artist}</p>
        </div>
        <Heart
          className={`w-6 h-6 transition-all ${
            liked
              ? 'fill-red-500 text-red-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        />
      </div>

      {liked && (
        <div className="mt-2 text-xs text-gray-500">
          💖 Added to favorites
        </div>
      )}
    </div>
  );
}
```

---

## Haptic Feedback Examples

### 1. Progress Indication with Haptics

```typescript
import { useHaptic } from '@/hooks/useGestures';
import { useEffect } from 'react';

export function UploadProgressWithHaptics({
  progress,
  onComplete,
}: {
  progress: number;
  onComplete: () => void;
}) {
  const { trigger } = useHaptic();

  useEffect(() => {
    if (progress === 25) {
      trigger('light');
    } else if (progress === 50) {
      trigger('medium');
    } else if (progress === 75) {
      trigger('heavy');
    } else if (progress === 100) {
      trigger('success');
      onComplete();
    }
  }, [progress, trigger, onComplete]);

  return (
    <div className="space-y-2">
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-primary to-ice-blue transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-400">{progress}% Complete</p>
    </div>
  );
}
```

### 2. Form Validation Feedback

```typescript
import { useHaptic } from '@/hooks/useGestures';
import { useState } from 'react';

export function FormWithHapticFeedback() {
  const { trigger } = useHaptic();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleBlur = (field: string, value: string) => {
    const newErrors = { ...errors };

    if (field === 'email' && !value.includes('@')) {
      newErrors.email = 'Invalid email';
      trigger('warning');
    } else if (field === 'password' && value.length < 8) {
      newErrors.password = 'Password too short';
      trigger('warning');
    } else {
      delete newErrors[field];
      trigger('success');
    }

    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.keys(errors).length === 0) {
      trigger('success');
      // Submit form
    } else {
      trigger('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
    </form>
  );
}
```

### 3. Custom Haptic Patterns for Actions

```typescript
import { useHaptic } from '@/hooks/useGestures';

interface ActionHaptics {
  onPressBuy: () => void;
  onPressCancel: () => void;
  onPressDelete: () => void;
}

export function ActionButtonsWithCustomHaptics({
  onPressBuy,
  onPressCancel,
  onPressDelete,
}: ActionHaptics) {
  const { trigger, custom } = useHaptic();

  return (
    <div className="flex gap-2">
      <button
        onClick={() => {
          custom([10, 50, 10]); // Three quick taps
          onPressBuy();
        }}
        className="btn btn-primary"
      >
        Buy Now
      </button>

      <button
        onClick={() => {
          trigger('light'); // Single light tap
          onPressCancel();
        }}
        className="btn btn-secondary"
      >
        Cancel
      </button>

      <button
        onClick={() => {
          custom([100, 100, 100]); // Long, slow haptic
          onPressDelete();
        }}
        className="btn btn-danger"
      >
        Delete
      </button>
    </div>
  );
}
```

---

## Combined Gesture + Haptic

### 1. Shake to Shuffle

```typescript
import { useHaptic } from '@/hooks/useGestures';
import { useState, useRef, useEffect } from 'react';

export function ShakeToShuffle({ onShuffle }: { onShuffle: () => void }) {
  const { trigger } = useHaptic();
  const shakeThresholdRef = useRef(15);
  const lastShakeRef = useRef(0);

  useEffect(() => {
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const x = event.accelerationIncludingGravity.x || 0;
      const y = event.accelerationIncludingGravity.y || 0;
      const z = event.accelerationIncludingGravity.z || 0;

      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      if (
        acceleration > shakeThresholdRef.current &&
        now - lastShakeRef.current > 500
      ) {
        lastShakeRef.current = now;
        trigger('heavy');
        onShuffle();
      }
    };

    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('devicemotion', handleDeviceMotion);
      }
    };
  }, [trigger, onShuffle]);

  return <div>Shake to Shuffle</div>;
}
```

### 2. Long Press with Haptic Warmup

```typescript
import { useRef, useState } from 'react';
import { useHaptic } from '@/hooks/useGestures';

export function LongPressButton({
  onLongPress,
  children,
}: {
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const { trigger } = useHaptic();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pressProgressRef = useRef(0);
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => {
    setIsPressed(true);
    pressProgressRef.current = 0;

    // Haptic feedback every 250ms while pressing
    const interval = setInterval(() => {
      pressProgressRef.current++;
      if (pressProgressRef.current === 1) {
        trigger('light');
      } else if (pressProgressRef.current === 2) {
        trigger('medium');
      } else if (pressProgressRef.current >= 3) {
        trigger('heavy');
      }
    }, 250);

    timeoutRef.current = setTimeout(() => {
      trigger('success');
      onLongPress();
      clearInterval(interval);
    }, 1000);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      className={`relative px-4 py-2 rounded-lg font-medium
        ${
          isPressed
            ? 'bg-blue-primary text-white'
            : 'bg-gray-700 text-gray-300'
        }
      `}
    >
      {isPressed && (
        <div className="absolute inset-0 rounded-lg bg-blue-primary/50 animate-pulse" />
      )}
      {children}
    </button>
  );
}
```

### 3. Drag-to-Vote with Progressive Haptics

```typescript
import { useRef, useState } from 'react';
import { useHaptic } from '@/hooks/useGestures';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export function DragToVote({
  onVote,
}: {
  onVote: (vote: 'up' | 'down') => void;
}) {
  const { trigger } = useHaptic();
  const ref = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [lastHapticThreshold, setLastHapticThreshold] = useState(0);

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const elementRect = ref.current?.getBoundingClientRect();
    if (!elementRect) return;

    const centerX = elementRect.left + elementRect.width / 2;
    const offset = touch.clientX - centerX;

    setDragOffset(offset);

    // Progressive haptics based on drag distance
    const threshold = Math.abs(offset) / 50;
    if (Math.floor(threshold) > lastHapticThreshold) {
      setLastHapticThreshold(Math.floor(threshold));
      trigger('light');
    }
  };

  const handleTouchEnd = () => {
    if (dragOffset > 100) {
      trigger('success');
      onVote('up');
    } else if (dragOffset < -100) {
      trigger('success');
      onVote('down');
    } else {
      trigger('light');
    }
    setDragOffset(0);
    setLastHapticThreshold(0);
  };

  return (
    <div
      ref={ref}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex gap-8 justify-center items-center p-8 bg-navy/30 rounded-lg"
    >
      <ThumbsDown
        className={`w-8 h-8 transition-all ${
          dragOffset < -30 ? 'text-red-500 scale-125' : 'text-gray-500'
        }`}
      />

      <div
        className="w-16 h-16 rounded-full border-2 border-gray-600 flex items-center justify-center transition-all"
        style={{
          transform: `translateX(${dragOffset}px)`,
          borderColor:
            dragOffset > 30
              ? '#22c55e'
              : dragOffset < -30
              ? '#ef4444'
              : '#4b5563',
        }}
      >
        <span className="text-2xl">→</span>
      </div>

      <ThumbsUp
        className={`w-8 h-8 transition-all ${
          dragOffset > 30 ? 'text-green-500 scale-125' : 'text-gray-500'
        }`}
      />
    </div>
  );
}
```

---

## Real-world Component Examples

### 1. Playlist Reordering with Drag & Drop + Haptics

```typescript
import { useRef } from 'react';
import { useHaptic } from '@/hooks/useGestures';
import { GripVertical } from 'lucide-react';

export function ReorderablePlaylist({
  items,
  onReorder,
}: {
  items: PlaylistItem[];
  onReorder: (from: number, to: number) => void;
}) {
  const { trigger } = useHaptic();
  const draggedIndexRef = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index;
    trigger('medium');
  };

  const handleDragOver = (index: number) => {
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== index) {
      trigger('light');
      onReorder(draggedIndexRef.current, index);
      draggedIndexRef.current = index;
    }
  };

  const handleDragEnd = () => {
    trigger('success');
    draggedIndexRef.current = null;
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={() => handleDragOver(index)}
          onDragEnd={handleDragEnd}
          className="flex items-center gap-3 p-3 bg-navy/50 rounded-lg"
        >
          <GripVertical className="w-5 h-5 text-gray-500" />
          <span>{item.title}</span>
        </div>
      ))}
    </div>
  );
}
```

### 2. Rating Component with Haptics

```typescript
import { useHaptic } from '@/hooks/useGestures';
import { Star } from 'lucide-react';
import { useState } from 'react';

export function RatingInput({
  onRate,
}: {
  onRate: (rating: number) => void;
}) {
  const { trigger, custom } = useHaptic();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleRate = (value: number) => {
    setRating(value);
    onRate(value);

    // Different haptics for different ratings
    if (value <= 2) {
      custom([50, 50, 50]); // Negative - multiple vibrations
    } else if (value === 3) {
      trigger('medium'); // Neutral
    } else {
      trigger('success'); // Positive
    }
  };

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          onMouseEnter={() => {
            setHoverRating(star);
            trigger('light');
          }}
          className="text-3xl transition-transform hover:scale-125"
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hoverRating || rating)
                ? 'fill-accent-gold text-accent-gold'
                : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
```

---

## Best Practices

1. **Always check `available` property before using haptics**
   ```typescript
   const { trigger, available } = useHaptic();
   if (available) trigger('light');
   ```

2. **Don't overuse haptic feedback** - Use sparingly for important actions
   ```typescript
   // Good - single haptic on important action
   trigger('success');

   // Bad - haptic on every minor interaction
   items.forEach(item => trigger('light'));
   ```

3. **Match haptics to user action**
   ```typescript
   // Light for selection/navigation
   trigger('light');

   // Medium for form submission
   trigger('medium');

   // Heavy for destructive actions
   trigger('heavy');

   // Success/error for completion feedback
   trigger('success');
   trigger('error');
   ```

4. **Always provide visual feedback too**
   ```typescript
   // Never rely on haptics alone
   const handleAction = () => {
     trigger('success');        // Haptic
     showConfirmation();        // Visual
     playSound('success.mp3');  // Audio
   };
   ```

5. **Test on real devices** - Haptic behavior varies by device
   - iOS: Consistent, strong vibrations
   - Android: Variable depending on device firmware
   - Use fallback UI indicators always

---

Last Updated: February 21, 2026
