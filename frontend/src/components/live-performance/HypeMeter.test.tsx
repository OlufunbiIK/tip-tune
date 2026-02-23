import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HypeMeter from './HypeMeter';

describe('HypeMeter', () => {
  it('renders meter value and applies width', () => {
    render(<HypeMeter value={72} />);

    expect(screen.getByText('72%')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Crowd hype meter' });
    expect(meter).toHaveStyle({ width: '72%' });
  });

  it('clamps out-of-range values', () => {
    render(<HypeMeter value={180} />);

    expect(screen.getByText('100%')).toBeInTheDocument();
    const meter = screen.getByRole('meter', { name: 'Crowd hype meter' });
    expect(meter).toHaveStyle({ width: '100%' });
  });
});
