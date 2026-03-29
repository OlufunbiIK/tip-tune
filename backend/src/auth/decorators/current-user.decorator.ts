import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  userId: string;
  walletAddress: string;
  isArtist: boolean;
}

type CurrentUserField = keyof CurrentUserData | 'id';

export const CurrentUser = createParamDecorator(
  (
    data: CurrentUserField | undefined,
    ctx: ExecutionContext,
  ): CurrentUserData | CurrentUserData[keyof CurrentUserData] | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData | undefined;

    if (!data) {
      return user;
    }

    if (data === 'id') {
      return user?.userId;
    }

    return user?.[data];
  },
);
