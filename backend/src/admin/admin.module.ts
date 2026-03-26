import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRole } from './entities/admin-role.entity';
import { AdminAuditLog } from './entities/admin-audit-log.entity';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { User } from '../users/entities/user.entity';
import { Artist } from '../artists/entities/artist.entity';
import { Track } from '../tracks/entities/track.entity';
import { Report } from '../reports/entities/report.entity';
import { AuthModule } from '../auth/auth.module';
import { ArtistBalance } from '../artiste-payout/artist-balance.entity';
import { PayoutRequest } from '../artiste-payout/payout-request.entity';
import { Tip } from '../tips/entities/tip.entity';
import { PayoutReconciliationService } from '../artiste-payout/payout-reconciliation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminRole,
      AdminAuditLog,
      User,
      Artist,
      Track,
      Report,
      ArtistBalance,
      PayoutRequest,
      Tip,
    ]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminRoleGuard, PayoutReconciliationService],
  exports: [AdminService, AdminRoleGuard],
})
export class AdminModule {}
