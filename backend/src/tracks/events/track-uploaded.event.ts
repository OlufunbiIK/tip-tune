export class TrackUploadedEvent {
    constructor(
        public readonly trackId: string,
        public readonly artistId: string,
    ) { }
}
