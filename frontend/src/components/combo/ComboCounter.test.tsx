import { render, screen } from '@testing-library/react';
import ComboCounter from './ComboCounter';

describe('ComboCounter', () => {
  it('does not render when combo is inactive', () => {
    const { container } = render(
      <ComboCounter comboCount={1} multiplier={1} isActive={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders multiplier and on-fire state', () => {
    render(<ComboCounter comboCount={5} multiplier={5} isActive />);
    expect(screen.getByTestId('combo-counter')).toBeInTheDocument();
    expect(screen.getByText(/x5/i)).toBeInTheDocument();
    expect(screen.getByText(/On Fire/i)).toBeInTheDocument();
  });
});
