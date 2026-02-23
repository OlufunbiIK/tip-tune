import React, { useEffect, useState } from 'react';
import { TipGoal } from '../../types/goal.types';
import { goalService } from '../../services/goalService';
import GoalCard from './GoalCard';
import LoadingSkeleton from '../common/LoadingSkeleton';

interface GoalListProps {
    artistId: string;
    onTip: (goalId: string) => void;
    isOwner?: boolean;
    refreshKey?: number;
}

const GoalList: React.FC<GoalListProps> = ({ artistId, onTip, isOwner, refreshKey }) => {
    const [goals, setGoals] = useState<TipGoal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const data = await goalService.getArtistGoals(artistId);
                setGoals(data);
            } catch (error) {
                console.error('Failed to fetch goals:', error);
            } finally {
                setLoading(false);
            }
        };

        if (artistId) {
            fetchGoals();
        }
    }, [artistId, refreshKey]); // Added refreshKey to dependency array

    if (loading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton className="h-40 w-full rounded-xl" />
                <LoadingSkeleton className="h-40 w-full rounded-xl" />
            </div>
        );
    }

    if (goals.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Active Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((goal) => (
                    <GoalCard
                        key={goal.id}
                        goal={goal}
                        onTip={onTip}
                        isOwner={isOwner}
                    />
                ))}
            </div>
        </div>
    );
};

export default GoalList;
