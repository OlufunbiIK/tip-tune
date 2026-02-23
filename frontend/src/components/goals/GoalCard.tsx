import React from 'react';
import { TipGoal, GoalStatus } from '../../types/goal.types';
import Button from '../common/Button';
import { formatCurrency } from '../../utils/formatter';

interface GoalCardProps {
    goal: TipGoal;
    onTip: (goalId: string) => void;
    isOwner?: boolean;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onTip, isOwner }) => {
    const percent = Math.min((goal.currentAmount / goal.goalAmount) * 100, 100);
    const isCompleted = goal.status === GoalStatus.COMPLETED || percent === 100;

    return (
        <div className="bg-navy-800 rounded-xl p-5 border border-navy-700 hover:border-blue-500/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{goal.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{goal.description}</p>
                </div>
                {isCompleted && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                        Completed
                    </span>
                )}
            </div>

            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-blue-400 font-medium">{formatCurrency(goal.currentAmount)} raised</span>
                    <span className="text-gray-500">of {formatCurrency(goal.goalAmount)}</span>
                </div>
                <div className="h-2 bg-navy-950 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>

            {!isOwner && goal.status === GoalStatus.ACTIVE && (
                <Button
                    variant="primary"

                    onClick={() => onTip(goal.id)}
                    className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
                >
                    Support Goal
                </Button>
            )}

            {goal.deadline && (
                <div className="mt-3 text-xs text-gray-500 text-center">
                    Ends {new Date(goal.deadline).toLocaleDateString()}
                </div>
            )}
        </div>
    );
};

export default GoalCard;
