import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import TipsLineChart from '../TipsLineChart';
import '@testing-library/jest-dom';

// Mock Recharts since it uses ResizeObserver which might not be available in JSDOM
jest.mock('recharts', () => {
    const OriginalModule = jest.requireActual('recharts');
    return {
        ...OriginalModule,
        ResponsiveContainer: ({ children }: any) => (
            <div style={{ width: '800px', height: '400px' }}>{children}</div>
        ),
    };
});

describe('TipsLineChart', () => {
    const mockData = [
        { date: '2024-01-01', amount: 100 },
        { date: '2024-01-02', amount: 200 },
    ];

    it('renders without crashing', () => {
        render(<TipsLineChart data={mockData} />);
        expect(screen.getByText(/Tips Over Time/i)).toBeInTheDocument();
    });

    it('displays the chart title', () => {
        render(<TipsLineChart data={mockData} />);
        expect(screen.getByText('Tips Over Time')).toBeInTheDocument();
    });
});
