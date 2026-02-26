import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import BalanceToggle from '../BalanceToggle';

describe('BalanceToggle', () => {
  it('calls onChange when toggling modes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(<BalanceToggle mode="XLM" onChange={handleChange} />);

    await user.click(screen.getByRole('tab', { name: 'USD' }));
    expect(handleChange).toHaveBeenCalledWith('USD');

    await user.click(screen.getByRole('tab', { name: 'XLM' }));
    expect(handleChange).toHaveBeenCalledWith('XLM');
  });
});

