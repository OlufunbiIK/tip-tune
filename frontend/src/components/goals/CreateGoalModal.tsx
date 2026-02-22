import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { goalService } from '../../services/goalService';

interface CreateGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CreateGoalModal: React.FC<CreateGoalModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        goalAmount: '',
        deadline: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await goalService.createGoal({
                ...formData,
                goalAmount: parseFloat(formData.goalAmount),
            });
            onSuccess();
            onClose();
            setFormData({ title: '', description: '', goalAmount: '', deadline: '' });
        } catch (error) {
            console.error('Failed to create goal:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Goal">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Goal Title
                    </label>
                    <input
                        type="text"
                        required
                        className="w-full bg-navy-950 border border-navy-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. New Album Recording"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Description
                    </label>
                    <textarea
                        required
                        rows={3}
                        className="w-full bg-navy-950 border border-navy-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        placeholder="Explain what this goal is for..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Amount (XLM)
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            className="w-full bg-navy-950 border border-navy-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="1000"
                            value={formData.goalAmount}
                            onChange={(e) => setFormData({ ...formData, goalAmount: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Deadline
                        </label>
                        <input
                            type="date"
                            required
                            className="w-full bg-navy-950 border border-navy-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                    <Button variant="outline" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Creating...' : 'Create Goal'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateGoalModal;
