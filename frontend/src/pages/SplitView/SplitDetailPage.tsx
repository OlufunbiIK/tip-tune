import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Users,
  PieChart,
  Activity,
  Receipt,
} from 'lucide-react';
import { splitDetailRepository, SplitDetailViewModel } from '../../services/splitDetailRepository';

/**
 * SplitDetailPage
 * 
 * This page displays detailed information about a collaboration split.
 * It consumes a single normalized view model from the splitDetailRepository,
 * which hides the complexity of profile hydration, receipt lookup, activity mapping,
 * and participant directory fallbacks.
 * 
 * The page no longer coordinates raw API fan-out or session fallback rules directly.
 */
const SplitDetailPage: React.FC = () => {
  const { splitId } = useParams<{ splitId: string }>();
  const navigate = useNavigate();

  // State for the normalized view model
  const [viewModel, setViewModel] = useState<SplitDetailViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch split detail using the repository
  const fetchSplitDetail = useCallback(async () => {
    if (!splitId) {
      setError('No split ID provided.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Single call to repository - all data composition happens inside
      const data = await splitDetailRepository.getSplitDetail(splitId, {
        includeActivities: true,
        includeReceipts: true,
        includeSignedUrls: false,
        useSessionFallback: true,
      });

      setViewModel(data);

      // Log metadata for debugging
      if (data.meta.hasMissingProfiles) {
        console.warn('Some profiles are missing, session fallback was used');
      }
      if (data.meta.hasMissingReceipts) {
        console.warn('Some receipts failed to load');
      }
      if (data.meta.activityFetchFailed) {
        console.warn('Activity feed failed to load');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { status?: number }; message?: string })?.response?.status === 404
        ? 'Split not found. It may have been removed or the ID is invalid.'
        : (err as { message?: string })?.message ?? 'Failed to load split detail.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [splitId]);

  useEffect(() => {
    fetchSplitDetail();
  }, [fetchSplitDetail]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading split detail…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !viewModel) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-800">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h2 className="mb-2 text-lg font-display font-semibold text-gray-900 dark:text-white">
            Split Unavailable
          </h2>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={fetchSplitDetail}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { split, profiles, receipts, activities, meta } = viewModel;

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <button
          onClick={fetchSplitDetail}
          className="rounded-lg border border-gray-300 p-1.5 text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          aria-label="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Page heading */}
      <header className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white sm:text-3xl">
          Split Details
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Split ID:{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono dark:bg-gray-700">
            {split.id}
          </code>
        </p>
      </header>

      {/* Metadata warnings */}
      {(meta.hasMissingProfiles || meta.hasMissingReceipts || meta.activityFetchFailed) && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Partial Data Loaded</p>
              <ul className="mt-1 list-disc list-inside text-yellow-700 dark:text-yellow-300">
                {meta.hasMissingProfiles && <li>Some profiles are missing (session fallback used)</li>}
                {meta.hasMissingReceipts && <li>Some receipts failed to load</li>}
                {meta.activityFetchFailed && <li>Activity feed failed to load</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Split overview */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <PieChart className="h-5 w-5 text-primary-blue" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Split Overview</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Split</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {split.totalSplitPercentage.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {split.remainingSplitPercentage.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Collaborators</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {split.collaborators.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {new Date(split.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Collaborators */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary-blue" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Collaborators</h2>
        </div>

        <div className="space-y-3">
          {split.collaborators.map((collab) => {
            const profile = profiles[collab.artistId];
            return (
              <div
                key={collab.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  {profile?.avatar ? (
                    <img
                      src={profile.avatar}
                      alt={profile.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profile?.name || collab.artistName || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {collab.role} • {collab.approvalStatus}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {collab.splitPercentage.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity feed */}
      {activities.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-5 w-5 text-primary-blue" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity</h2>
          </div>

          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.actorName || 'Unknown'}</span>
                    <span className="mx-1 text-gray-500">•</span>
                    <span>{activity.description}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipts */}
      {receipts && Object.keys(receipts).length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <Receipt className="h-5 w-5 text-primary-blue" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Receipts</h2>
          </div>

          <div className="space-y-3">
            {Object.values(receipts).map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {receipt.amount} {receipt.assetCode}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {receipt.status}
                  </p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(receipt.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link back */}
      <div className="text-center">
        <Link
          to="/collaborations"
          className="text-sm font-medium text-primary-blue hover:underline"
        >
          ← View all collaborations
        </Link>
      </div>
    </div>
  );
};

export default SplitDetailPage;
