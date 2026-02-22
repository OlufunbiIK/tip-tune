import { useState } from 'react';
import {
  Trash2,
  Download,
  AlertTriangle,
  Loader2,
  Check,
  X,
  FileDown,
  Shield,
} from 'lucide-react';
import { userService } from '../../services/userService';
import { useWallet } from '../../hooks/useWallet';

const AccountActions = () => {
  const { isConnected, disconnect } = useWallet();

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExportData = async () => {
    setIsExporting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const blob = await userService.exportUserData();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiptune-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccessMessage('Your data has been exported');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setErrorMessage('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await userService.deleteAccount();
      await disconnect();
      // Redirect to home page after deletion
      window.location.href = '/';
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Please connect your wallet to manage account actions</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-deep-slate mb-2">Account Actions</h2>
      <p className="text-gray-600 mb-6">
        Export your data or delete your account
      </p>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500" />
          <span className="text-green-400">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <X className="w-5 h-5 text-red-500" />
          <span className="text-red-400">{errorMessage}</span>
        </div>
      )}

      {/* Export Data */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <FileDown className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-deep-slate mb-1">Export Your Data</h3>
            <p className="text-gray-600 text-sm mb-4">
              Download a copy of all your data including profile information, tip history, and activity logs.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-sm font-medium rounded-lg border border-blue-500/30 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-deep-slate mb-1">Security Notice</h3>
            <p className="text-gray-600 text-sm">
              Your wallet and any cryptocurrency holdings are not affected by account deletion. 
              Only your TipTune profile, settings, and activity history will be removed.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="bg-red-50 rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-deep-slate mb-1">Delete Account</h3>
            <p className="text-gray-600 text-sm mb-4">
              Permanently delete your TipTune account and all associated data. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-300 text-sm mb-3">
                    <strong>Warning:</strong> This will permanently delete:
                  </p>
                  <ul className="text-red-300/80 text-sm list-disc list-inside space-y-1">
                    <li>Your profile and settings</li>
                    <li>Your tip history and activity</li>
                    <li>Your uploaded tracks (if artist)</li>
                    <li>All followers and following relationships</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Type <span className="text-red-500 font-mono">DELETE</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full px-4 py-2 bg-white border border-red-300 rounded-lg text-deep-slate placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete My Account
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                      setErrorMessage(null);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-deep-slate text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountActions;
