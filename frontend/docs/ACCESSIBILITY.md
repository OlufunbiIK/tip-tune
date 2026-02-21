# Accessibility Documentation (WCAG 2.1 AA)

TipTune is committed to providing an inclusive experience for all users, including those with disabilities. This document outlines the accessibility features implemented and guidelines for maintaining WCAG 2.1 Level AA compliance.

## Table of Contents

1. [Overview](#overview)
2. [Keyboard Navigation](#keyboard-navigation)
3. [Screen Reader Support](#screen-reader-support)
4. [Visual Accessibility](#visual-accessibility)
5. [Forms](#forms)
6. [Media](#media)
7. [Testing](#testing)
8. [Components](#components)

## Overview

TipTune implements WCAG 2.1 Level AA accessibility standards, ensuring:

- All interactive elements are keyboard accessible
- Screen readers can navigate and understand content
- Color contrast meets minimum ratios (4.5:1 for normal text, 3:1 for large text)
- Animations respect user preferences for reduced motion
- Forms have proper labels and error associations

## Keyboard Navigation

### Global Shortcuts

| Key | Action |
|-----|--------|
| `?` | Open keyboard shortcuts help |
| `Tab` | Navigate to next element |
| `Shift + Tab` | Navigate to previous element |
| `Escape` | Close modals |

### Player Controls

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` | Previous track |
| `→` | Next track |
| `↑` | Increase volume |
| `↓` | Decrease volume |
| `M` | Mute/Unmute |

### Focus Management

- **Skip Link**: Press `Tab` on page load to access "Skip to main content" link
- **Focus Trap**: Modals trap focus within the dialog
- **Focus Restoration**: Focus returns to trigger element when modals close
- **Visible Focus**: All interactive elements show visible focus indicators

## Screen Reader Support

### ARIA Live Regions

The app uses ARIA live regions to announce dynamic content changes:

- **Polite announcements**: Track changes, volume adjustments
- **Assertive announcements**: Critical errors, important state changes

### Semantic HTML

- Proper heading hierarchy (h1 → h2 → h3)
- Landmark regions (`main`, `nav`, `header`, `footer`)
- Lists use semantic `<ul>` and `<li>` elements
- Forms use proper `<label>` associations

### ARIA Attributes Used

- `aria-label`: Provides accessible names for icon buttons
- `aria-labelledby`: References visible labels
- `aria-describedby`: Links descriptions to elements
- `aria-expanded`: Indicates expandable state
- `aria-pressed`: Indicates toggle button state
- `aria-current`: Indicates current page/item
- `aria-live`: Announces dynamic content
- `aria-busy`: Indicates loading state
- `role="slider"`: For progress/volume bars
- `role="dialog"`: For modals
- `aria-modal`: For modal dialogs

## Visual Accessibility

### Color Contrast

All text meets WCAG AA contrast requirements:
- Primary text on dark backgrounds: #FFFFFF on #0B1C2D
- Primary text on light backgrounds: #1E293B on #FFFFFF
- Accent colors maintain 4.5:1 ratio

### Reduced Motion

Users who prefer reduced motion will have:
- All animations disabled
- Transitions set to instant
- Scroll behavior set to auto

This is controlled via CSS `@media (prefers-reduced-motion: reduce)`.

### High Contrast Mode

The app supports `prefers-contrast: more` media query for users who need higher contrast.

### Text Resizing

- Text scales up to 200% without horizontal scrolling
- No text truncation or overlap at larger sizes
- Units use relative values (rem, em) where appropriate

## Forms

### Labels

- All form fields have associated `<label>` elements
- Labels are visible and positioned close to their fields
- Required fields are marked with visual and programmatic indicators

### Error Messages

- Error messages are associated with fields via `aria-describedby`
- Errors are announced to screen readers
- Inline validation provides immediate feedback

## Media

### Images

- All meaningful images have descriptive `alt` text
- Decorative images use `alt=""` or `aria-hidden="true"`
- Album art includes artist and track information

### Audio Player

- Custom controls are fully keyboard accessible
- Progress and volume sliders use `role="slider"` with appropriate ARIA attributes
- State changes (play/pause) are announced

## Testing

### Automated Testing

The following tools are integrated:

1. **eslint-plugin-jsx-a11y**: Linting rules for accessibility
2. **@axe-core/react**: Runtime accessibility testing

### Manual Testing

Test with:
- Screen readers: NVDA (Windows), VoiceOver (macOS/iOS), JAWS
- Keyboard-only navigation
- Browser zoom at 100%, 150%, 200%
- High contrast mode

### Running Accessibility Tests

```bash
# Run ESLint with a11y rules
npm run lint

# axe-core runs automatically in development mode
npm run dev
```

## Components

### Button (`components/common/Button.tsx`)

- Native `<button>` element
- Visible focus indicators
- Loading state with `aria-busy`
- Disabled state communicated to assistive tech

### Modal (`components/common/Modal.tsx`)

- Focus trap implementation
- Escape key closes modal
- Focus restoration on close
- Proper `role="dialog"` and `aria-modal`
- Backdrop click closes modal

### MusicPlayer (`components/player/MusicPlayer.tsx`)

- Full keyboard navigation
- Screen reader announcements for state changes
- Accessible sliders for progress and volume
- ARIA labels for all controls

### Accessibility Utilities (`utils/accessibility.ts`)

Utility functions for:
- Focus management
- Screen reader announcements
- Focus trapping
- Reduced motion detection
- Time/number formatting for screen readers

## Best Practices for Developers

1. **Always test with keyboard**: Navigate using Tab, Enter, Space, Arrow keys
2. **Use semantic HTML**: Prefer native elements over custom implementations
3. **Provide text alternatives**: All non-text content needs alternatives
4. **Don't rely on color alone**: Use icons, text, or patterns in addition to color
5. **Test with screen readers**: Regular testing with actual assistive technology
6. **Run automated tests**: Fix all a11y linting errors before committing
7. **Document accessibility features**: Update this doc when adding new features

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [React Accessibility](https://react.dev/learn/accessibility)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Reporting Accessibility Issues

If you encounter accessibility barriers, please report them by creating an issue on GitHub with the label `accessibility`.

---

Last updated: February 2026
