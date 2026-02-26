/**
 * Tests for GiftTag component
 */
import { render, screen } from '@testing-library/react';
import GiftTag from '../GiftTag';
import type { GiftMeta } from '../../../types';

const baseMeta: GiftMeta = {
  id: 'gift-1',
  recipient: { id: 'u2', username: 'music_lover', displayName: 'Music Lover' },
  giver: { id: 'u1', username: 'stellar_fan', displayName: 'Stellar Fan' },
  isAnonymous: false,
  status: 'delivered',
  createdAt: new Date().toISOString(),
};

describe('GiftTag', () => {
  it('renders with artist variant and shows recipient and giver', () => {
    render(<GiftTag gift={baseMeta} variant="artist" />);
    const tag = screen.getByTestId('gift-tag');
    expect(tag).toBeTruthy();
    expect(tag.textContent).toContain('Music Lover');
    expect(tag.textContent).toContain('Stellar Fan');
  });

  it('renders "given" variant label', () => {
    render(<GiftTag gift={baseMeta} variant="given" />);
    const tag = screen.getByTestId('gift-tag');
    expect(tag.textContent).toContain('You gifted this to');
  });

  it('renders "received" variant label', () => {
    render(<GiftTag gift={baseMeta} variant="received" />);
    const tag = screen.getByTestId('gift-tag');
    expect(tag.textContent).toContain('sent this gift for you');
  });

  it('hides giver name when isAnonymous=true', () => {
    const anonymousMeta: GiftMeta = { ...baseMeta, isAnonymous: true };
    render(<GiftTag gift={anonymousMeta} variant="received" />);
    const tag = screen.getByTestId('gift-tag');
    expect(tag.textContent).not.toContain('Stellar Fan');
    expect(tag.textContent).toContain('Someone gifted');
  });

  it('falls back to @username when displayName is undefined', () => {
    const meta: GiftMeta = {
      ...baseMeta,
      recipient: { id: 'u2', username: 'music_lover' },
    };
    render(<GiftTag gift={meta} variant="artist" />);
    const tag = screen.getByTestId('gift-tag');
    expect(tag.textContent).toContain('@music_lover');
  });
});
