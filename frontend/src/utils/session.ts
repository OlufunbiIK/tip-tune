/**
 * Session utility for managing participant directory fallbacks
 * Provides local caching and resolution of participant names when API data is unavailable
 */

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  walletAddress?: string;
}

class SessionManager {
  private participantDirectory: Map<string, Participant> = new Map();
  private storageKey = 'tiptune_participant_directory';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load participant directory from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([id, participant]) => {
          this.participantDirectory.set(id, participant as Participant);
        });
      }
    } catch (error) {
      console.warn('Failed to load participant directory from storage:', error);
    }
  }

  /**
   * Save participant directory to localStorage
   */
  private saveToStorage(): void {
    try {
      const data = Object.fromEntries(this.participantDirectory);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save participant directory to storage:', error);
    }
  }

  /**
   * Add or update a participant in the directory
   */
  upsertParticipant(participant: Participant): void {
    this.participantDirectory.set(participant.id, participant);
    this.saveToStorage();
  }

  /**
   * Get a participant by ID
   */
  getParticipant(id: string): Participant | undefined {
    return this.participantDirectory.get(id);
  }

  /**
   * Get participant name with fallback
   */
  getParticipantName(id: string, fallback?: string): string {
    const participant = this.participantDirectory.get(id);
    return participant?.name || fallback || 'Unknown';
  }

  /**
   * Resolve multiple participant names
   */
  resolveParticipantNames(ids: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    ids.forEach(id => {
      result[id] = this.getParticipantName(id);
    });
    return result;
  }

  /**
   * Clear the participant directory
   */
  clear(): void {
    this.participantDirectory.clear();
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Get all participants
   */
  getAllParticipants(): Participant[] {
    return Array.from(this.participantDirectory.values());
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

// Export types
export type { Participant };
