import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MerchCard from '../../merch/MerchCard';
import { MerchItem } from '../../../types/merch';
import MerchShowcase from '../../merch/MerchShowcase';

const baseItem: MerchItem = {
  id: '1',
  artistId: 'a1',
  name: 'Band Tee',
  imageUrl: '/assets/logo1.svg',
  price: '$24.99',
  externalUrl: 'https://shop.example.com/tee',
  status: 'available',
  createdAt: 1,
  updatedAt: 1,
};

describe('MerchCard', () => {
  beforeEach(() => {
    // @ts-ignore
    global.navigator.share = undefined;
    // @ts-ignore
    global.navigator.clipboard = { writeText: vi.fn() };
  });

  it('renders image, name, and price', () => {
    render(<MerchCard item={baseItem} />);
    expect(screen.getByText('Band Tee')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    const img = screen.getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('/assets/logo1.svg');
  });

  it('adds UTM params to external links', () => {
    render(<MerchCard item={baseItem} artistSlug="artist-x" />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('utm_source=tip-tune');
    expect(link.getAttribute('href')).toContain('utm_medium=artist_merch');
    expect(link.getAttribute('href')).toContain('utm_campaign=artist-x');
  });

  it('shows badges correctly', () => {
    const limited = { ...baseItem, id: '2', status: 'limited' as const };
    const soldout = { ...baseItem, id: '3', status: 'soldout' as const };
    const { rerender } = render(<MerchCard item={limited} />);
    expect(screen.getByText('Limited')).toBeInTheDocument();
    rerender(<MerchCard item={soldout} />);
    expect(screen.getByText('Sold Out')).toBeInTheDocument();
  });

  it('wishlist toggles', () => {
    const toggle = vi.fn();
    render(<MerchCard item={baseItem} onSaveToggle={toggle} isSaved={false} />);
    fireEvent.click(screen.getByLabelText('Save to wishlist'));
    expect(toggle).toHaveBeenCalledWith('1');
  });

  it('tip instead triggers callback', () => {
    const onTip = vi.fn();
    render(<MerchCard item={baseItem} onTipInstead={onTip} />);
    fireEvent.click(screen.getByText('Tip instead'));
    expect(onTip).toHaveBeenCalled();
  });
});

describe('MerchShowcase', () => {
  it('renders horizontal container when items exist', () => {
    // Inject localStorage data for items
    const key = 'tt_merch_items';
    const data = { a1: [baseItem] };
    localStorage.setItem(key, JSON.stringify(data));

    render(<MerchShowcase artistId="a1" />);
    expect(screen.getByText('Band Tee')).toBeInTheDocument();
  });
});
