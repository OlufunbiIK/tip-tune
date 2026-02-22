import { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { gamificationService } from '../services/gamificationService';
import { userService } from '../services/userService';
import { Badge, UserBadge, BadgeCategory, BadgeTier } from '../types';

const BadgesPage = () => {
    const { isConnected, publicKey } = useWallet();
    const [badges, setBadges] = useState<Badge[]>([]);
    const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        fetchBadges();
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            if (isConnected && publicKey) {
                try {
                    const user = await userService.searchByWallet(publicKey);
                    // setUserId(user.id);
                    fetchUserBadges(user.id);
                } catch (error) {
                    console.error("User not found or error fetching user", error);
                }
            } else {
                // setUserId(null);
                setUserBadges([]);
            }
        };
        fetchUser();
    }, [isConnected, publicKey]);

    const fetchBadges = async () => {
        try {
            const allBadges = await gamificationService.getAllBadges();
            setBadges(allBadges);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load badges", error);
            setLoading(false);
        }
    };

    const fetchUserBadges = async (uid: string) => {
        try {
            const earned = await gamificationService.getUserBadges(uid);
            setUserBadges(earned);
        } catch (error) {
            console.error("Failed to load user badges", error);
        }
    };

    const isEarned = (badgeId: string) => userBadges.some((ub: UserBadge) => ub.badgeId === badgeId);
    const getEarnedDetails = (badgeId: string) => userBadges.find((ub: UserBadge) => ub.badgeId === badgeId);

    const renderBadgeCard = (badge: Badge) => {
        const earned = isEarned(badge.id);
        const details = getEarnedDetails(badge.id);

        return (
            <div
                key={badge.id}
                className={`p-6 rounded-lg border flex flex-col items-center text-center transition-all ${earned
                    ? 'bg-navy-light border-gold shadow-lg shadow-gold/20'
                    : 'bg-navy-light/50 border-gray-700 opacity-70 grayscale'
                    }`}
            >
                <div className={`w-24 h-24 mb-4 rounded-full flex items-center justify-center text-3xl font-bold border-4 ${badge.tier === BadgeTier.BRONZE ? 'border-amber-700 text-amber-700 bg-amber-900/20' :
                    badge.tier === BadgeTier.SILVER ? 'border-slate-400 text-slate-400 bg-slate-800/20' :
                        badge.tier === BadgeTier.GOLD ? 'border-yellow-400 text-yellow-400 bg-yellow-900/20' :
                            'border-cyan-400 text-cyan-400 bg-cyan-900/20'
                    }`}>
                    {/* Placeholder for Image or initials */}
                    {badge.imageUrl ? <img src={badge.imageUrl} alt={badge.name} className="w-full h-full rounded-full object-cover" /> : badge.name.charAt(0)}
                </div>

                <h3 className="text-xl font-bold mb-2">{badge.name}</h3>
                <span className={`text-xs uppercase tracking-wider mb-2 px-2 py-1 rounded ${badge.category === BadgeCategory.TIPPER ? 'bg-purple-900 text-purple-200' :
                    badge.category === BadgeCategory.ARTIST ? 'bg-indigo-900 text-indigo-200' :
                        'bg-pink-900 text-pink-200'
                    }`}>
                    {badge.category}
                </span>

                <p className="text-sm text-gray-300 mb-4">{badge.description}</p>

                {earned && details && (
                    <div className="mt-auto pt-4 border-t border-gray-700 w-full text-xs text-green-400">
                        <div>Earned: {new Date(details.earnedAt).toLocaleDateString()}</div>
                        {details.nftTxHash && (
                            <a
                                href={`https://stellar.expert/explorer/testnet/tx/${details.nftTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block mt-1 text-blue-400 hover:text-blue-300 underline"
                            >
                                View NFT
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const categories = Object.values(BadgeCategory);

    return (
        <div className="min-h-screen bg-navy text-white">
            <header className="border-b border-gray-700 bg-navy-light">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="text-xl font-bold">TipTune Badges</div>
                    <div className="flex items-center gap-4">
                        <a href="/" className="text-gray-300 hover:text-white">Home</a>
                        <button
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        >
                            {isConnected ? `Connected` : 'Connect Wallet'}
                        </button>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold mb-4">Achievements Gallery</h1>
                    <p className="text-ice-blue">Unlock badges by supporting artists and exploring music.</p>
                </div>

                {loading ? (
                    <div className="text-center py-20">Loading...</div>
                ) : (
                    categories.map((cat: string) => {
                        const catBadges = badges.filter(b => b.category === cat);
                        if (catBadges.length === 0) return null;

                        return (
                            <div key={cat} className="mb-12">
                                <h2 className="text-2xl font-bold mb-6 capitalize border-l-4 border-blue-500 pl-4">{cat} Badges</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {catBadges.map(renderBadgeCard)}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default BadgesPage;
