export type MerchStatus = 'available' | 'limited' | 'soldout';

export interface MerchItem {
  id: string;
  artistId: string;
  name: string;
  imageUrl: string;
  price: string; // display price, e.g., "$24.99"
  externalUrl: string; // purchase link
  status: MerchStatus;
  createdAt: number;
  updatedAt: number;
}

export interface MerchInput {
  name: string;
  imageUrl: string;
  price: string;
  externalUrl: string;
  status: MerchStatus;
}
