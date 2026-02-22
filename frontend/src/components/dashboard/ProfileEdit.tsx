
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from '../../types';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';
import { updateUserProfile } from '../../services/artistService';
import { toast } from 'react-toastify';

interface ProfileSectionProps {
  profile?: UserProfile;
  isLoading: boolean;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ profile, isLoading }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | undefined>(profile);

  useEffect(() => {
    setEditedProfile(profile);
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!editedProfile) return;
    setEditedProfile({ ...editedProfile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!editedProfile) return;
    setIsSaving(true);
    try {
         const saved = await updateUserProfile(editedProfile);
        setEditedProfile(saved);
        setIsEditing(false);
          } 
          catch (err) {
        console.error(err);
        toast.error('Failed to update profile');
      } finally {
        setIsSaving(false);
    }
  };

  if (isLoading || !editedProfile) {
    return (
      <Card className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col items-center text-center">
            <Skeleton className="w-32 h-32 rounded-full mb-4"/>
            <Skeleton className="h-6 w-3/4 mb-2"/>
            <Skeleton className="h-4 w-1/2"/>
        </div>
        <div className="md:col-span-2 space-y-4">
             <Skeleton className="h-4 w-1/4 mb-1"/>
             <Skeleton className="h-10 w-full"/>
             <Skeleton className="h-4 w-1/4 mb-1"/>
             <Skeleton className="h-24 w-full"/>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold mb-4">Profile & Wallet</h2>
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-sm font-medium text-primary-blue hover:text-secondary-indigo">Edit</button>
        ) : (
          <div className="space-x-2">
            <button onClick={() => { setIsEditing(false); setEditedProfile(profile); }} className="text-sm font-medium text-gray-600 hover:text-gray-900">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="text-sm font-medium text-primary-blue hover:text-secondary-indigo disabled:opacity-50">{isSaving ? 'Saving...' : 'Save'}</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1 flex flex-col items-center text-center">
          <img src={editedProfile.avatar} alt={editedProfile.name} className="w-32 h-32 rounded-full mb-4 object-cover" />
          {!isEditing ? (
            <>
              <h3 className="text-lg font-bold">{editedProfile.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{editedProfile.bio}</p>
            </>
          ) : (
            <>
                <input type="text" name="name" value={editedProfile.name} onChange={handleInputChange} className="w-full text-center text-lg font-bold border rounded-md p-1" />
            </>
          )}
        </div>
        <div className="md:col-span-2">
            {isEditing ? (
                 <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
                    <textarea name="bio" id="bio" rows={3} value={editedProfile.bio} onChange={handleInputChange} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"/>
                </div>
            ) : null}

          <div className="mt-6">
            <h4 className="font-semibold">Wallet Address</h4>
            <div className="mt-2 flex items-center bg-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-700 font-mono break-all flex-1">{editedProfile.walletAddress}</p>
              <div className="ml-4 flex-shrink-0">
                <QRCodeSVG 
                  value={editedProfile.walletAddress} 
                  size={80}
                  level="M"
                  includeMargin={false}
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProfileSection;
