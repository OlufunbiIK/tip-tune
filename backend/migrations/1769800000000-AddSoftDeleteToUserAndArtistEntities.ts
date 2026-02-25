import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSoftDeleteToUserAndArtistEntities1670000000000 implements MigrationInterface {
    name = 'AddSoftDeleteToUserAndArtistEntities1670000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "users" ADD "is_deleted" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "artists" ADD "deleted_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "artists" ADD "is_deleted" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "artists" DROP COLUMN "is_deleted"`);
        await queryRunner.query(`ALTER TABLE "artists" DROP COLUMN "deleted_at"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_deleted"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "deleted_at"`);
    }
}
