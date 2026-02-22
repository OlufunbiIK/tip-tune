import { Tip } from '../entities/tip.entity';

export class TipVerifiedEvent {
    public readonly tipId: string;
    public readonly artistId: string;
    public readonly amount: number;
    public readonly asset: string;

    constructor(public readonly tip: Tip, public readonly senderId: string) {
        this.tipId = tip.id;
        this.artistId = tip.artistId;
        this.amount = tip.amount;
        this.asset = tip.assetCode;
    }
}
