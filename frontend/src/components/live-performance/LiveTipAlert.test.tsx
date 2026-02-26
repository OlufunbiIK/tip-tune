import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LiveTipAlert from './LiveTipAlert';

const baseTip = {
  id: 'tip-1',
  tipperName: 'GABC...1234',
  amount: 12.5,
  asset: 'XLM',
  createdAt: '2026-02-23T10:00:00.000Z',
  isLargeTip: false,
};

describe('LiveTipAlert', () => {
  it('renders tipper and amount when privacy mode is off', () => {
    render(<LiveTipAlert tip={baseTip} privacyMode={false} />);

    expect(screen.getByText('GABC...1234')).toBeInTheDocument();
    expect(screen.getByText('12.50 XLM')).toBeInTheDocument();
  });

  it('hides sensitive details when privacy mode is on', () => {
    render(<LiveTipAlert tip={baseTip} privacyMode={true} />);

    expect(screen.getByText('Hidden supporter')).toBeInTheDocument();
    expect(screen.getByText('Hidden amount')).toBeInTheDocument();
  });
});
