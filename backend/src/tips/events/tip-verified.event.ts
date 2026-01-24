export class TipVerifiedEvent {
    constructor(
        public readonly tipId: string,
        public readonly senderId: string, // User ID of tipper
        public readonly artistId: string, // Artist ID (UUID referencing Artist entity)
        public readonly amount: number,
        public readonly asset: string,
    ) { }
}
