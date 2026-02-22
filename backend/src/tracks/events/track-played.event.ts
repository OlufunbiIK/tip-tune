export class TrackPlayedEvent {
    constructor(
        public readonly trackId: string,
        public readonly artistId: string,
        public readonly listenerId: string | null, // might be anonymous
    ) { }
}
