import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom';
import TipStats from '../TipStats';

describe('TipStats', () => {
  it('renders total sent and total received', () => {
    render(<TipStats totalSent={100} totalReceived={250} />);
    expect(screen.getByText('Total Sent')).toBeInTheDocument();
    expect(screen.getByText('Total Received')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<TipStats totalSent={0} totalReceived={0} isLoading />);
    expect(screen.getByTestId('tip-stats')).toBeInTheDocument();
    expect(screen.queryByText('Total Sent')).not.toBeInTheDocument();
  });

  it('has tip-stats test id', () => {
    render(<TipStats totalSent={0} totalReceived={0} />);
    expect(screen.getByTestId('tip-stats')).toBeInTheDocument();
  });
});
