export class UserFollowedEvent {
    constructor(
        public readonly followerId: string,
        public readonly followingId: string,
    ) { }
}
