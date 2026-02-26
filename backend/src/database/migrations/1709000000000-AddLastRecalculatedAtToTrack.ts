import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastRecalculatedAtToTrack1709000000000 implements MigrationInterface {
    name = 'AddLastRecalculatedAtToTrack1709000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracks" ADD "lastRecalculatedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tracks" DROP COLUMN "lastRecalculatedAt"`);
    }
}
