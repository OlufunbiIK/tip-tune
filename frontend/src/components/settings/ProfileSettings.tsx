import { useState, useRef, useEffect } from 'react';
import { User, Camera, Save, Loader2, Check, X } from 'lucide-react';
import { userService, UpdateProfileData } from '../../services/userService';
import { useWallet } from '../../hooks/useWallet';

interface ProfileData {
  username: string;
  email: string;
  bio: string;
  profileImage: string;
}

interface ValidationErrors {
  username?: string;
  email?: string;
  bio?: string;
}

const ProfileSettings = () => {
  const { publicKey, isConnected } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const [formData, setFormData] = useState<ProfileData>({
    username: '',
    email: '',
    bio: '',
    profileImage: '',
  });

  const [originalData, setOriginalData] = useState<ProfileData>({
    username: '',
    email: '',
    bio: '',
    profileImage: '',
  });

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      if (!publicKey) {
        setIsLoading(false);
        return;
      }

      try {
        const user = await userService.searchByWallet(publicKey);
        setUserId(user.id);
        const profileData: ProfileData = {
          username: user.username || '',
          email: user.email || '',
          bio: '',
          profileImage: '',
        };
        setFormData(profileData);
        setOriginalData(profileData);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setErrorMessage('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [publicKey]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (formData.username && formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    if (formData.username && formData.username.length > 30) {
      newErrors.username = 'Username must be less than 30 characters';
    }
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const { url } = await userService.uploadProfileImage(file);
      setFormData((prev) => ({ ...prev, profileImage: url }));
      setSuccessMessage('Profile image uploaded');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!validateForm()) return;
    if (!userId) {
      setErrorMessage('User not found. Please reconnect your wallet.');
      return;
    }

    setIsSaving(true);
    try {
      const updateData: UpdateProfileData = {};

      // Only include changed fields
      if (formData.username !== originalData.username) {
        updateData.username = formData.username;
      }
      if (formData.email !== originalData.email) {
        updateData.email = formData.email;
      }
      if (formData.bio !== originalData.bio) {
        updateData.bio = formData.bio;
      }
      if (formData.profileImage !== originalData.profileImage) {
        updateData.profileImage = formData.profileImage;
      }

      // Only make request if there are changes
      if (Object.keys(updateData).length === 0) {
        setSuccessMessage('No changes to save');
        setIsSaving(false);
        return;
      }

      await userService.updateProfile(userId, updateData);
      setOriginalData(formData);
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-blue animate-spin" />
      </div>
    );
  }

  if (!isConnected || !publicKey) {
    return (
      <div className="text-center py-12">
        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Please connect your wallet to view profile settings</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-deep-slate mb-6">Profile Settings</h2>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-700">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <X className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Image */}
        <div className="flex items-center gap-6">
          <div
            onClick={handleImageClick}
            className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden cursor-pointer group"
          >
            {formData.profileImage ? (
              <img
                src={formData.profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-deep-slate font-medium">Profile Picture</h3>
            <p className="text-gray-500 text-sm">Click to upload a new image</p>
            <p className="text-gray-400 text-xs mt-1">JPG, PNG, or GIF. Max 5MB.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Enter your username"
            className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-deep-slate placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all ${
              errors.username ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter your email"
            className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-deep-slate placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all ${
              errors.email ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us about yourself..."
            rows={4}
            className={`w-full px-4 py-3 bg-gray-50 border rounded-lg text-deep-slate placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition-all resize-none ${
              errors.bio ? 'border-red-500' : 'border-gray-200'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.bio ? (
              <p className="text-sm text-red-600">{errors.bio}</p>
            ) : (
              <span />
            )}
            <span className={`text-xs ${formData.bio.length > 450 ? 'text-yellow-600' : 'text-gray-500'}`}>
              {formData.bio.length}/500
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              hasChanges
                ? 'bg-primary-blue hover:bg-secondary-indigo text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileSettings;
