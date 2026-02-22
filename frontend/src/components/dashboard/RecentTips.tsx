
import React, { useState, useEffect } from 'react';
import { Tip, Track } from '../../types';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { formatCurrency, formatDate, exportTipsToCSV } from '../../utils/formatter';

interface RecentTipsProps {
  tips: Tip[];
  tracks: Track[];
  isLoading: boolean;
}

const TIPS_PER_PAGE = 5;

const RecentTips: React.FC<RecentTipsProps> = ({ tips, tracks, isLoading }) => {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(tips.length / TIPS_PER_PAGE);
    const paginatedTips = tips.slice((currentPage - 1) * TIPS_PER_PAGE, currentPage * TIPS_PER_PAGE);
    
    useEffect(() => {
        if (totalPages === 0) {
            if (currentPage !== 1) setCurrentPage(1);
        } else if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const isEmpty = tips.length === 0;
    const startIndex = isEmpty ? 0 : (currentPage - 1) * TIPS_PER_PAGE + 1;
    const endIndex = isEmpty ? 0 : Math.min(currentPage * TIPS_PER_PAGE, tips.length);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };
    
    const getTrackTitle = (trackId?: string) => {
        if (!trackId) return 'General Support';
        return tracks.find(t => t.id === trackId)?.title || 'Unknown Track';
    }

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Recent Tips</h2>
        <button 
            onClick={() => exportTipsToCSV(tips)}
            disabled={isLoading || tips.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-blue rounded-lg hover:bg-secondary-indigo focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-indigo disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipper</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
                Array.from({length: TIPS_PER_PAGE}).map((_, index) => (
                    <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><Skeleton className="h-10 w-10 rounded-full mr-4" /><Skeleton className="h-4 w-24" /></div></td>
                        <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-16" /></td>
                        <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-28" /></td>
                    </tr>
                ))
            ) : (
                paginatedTips.map(tip => (
              <tr key={tip.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img className="h-10 w-10 rounded-full" src={tip.tipperAvatar} alt="" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{tip.tipperName}</div>
                      <div className="text-sm text-gray-500">{getTrackTitle(tip.trackId)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(tip.amount)}</td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{tip.message}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(tip.timestamp)}</td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
       <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex}</span> to <span className="font-medium">{endIndex}</span> of <span className="font-medium">{tips.length}</span> results
        </p>
        <div className="space-x-2">
            <button onClick={handlePrevPage} disabled={currentPage <= 1 || isLoading || totalPages === 0} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                Previous
            </button>
            <button onClick={handleNextPage} disabled={currentPage >= totalPages || isLoading || totalPages === 0} className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                Next
            </button>
        </div>
      </div>
    </Card>
  );
};

export default RecentTips;
