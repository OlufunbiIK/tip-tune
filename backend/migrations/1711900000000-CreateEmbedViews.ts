import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmbedViews1711900000000 implements MigrationInterface {
  name = 'CreateEmbedViews1711900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "embed_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "trackId" uuid NOT NULL,
        "referrerDomain" varchar,
        "viewedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_embed_views" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_embed_views_trackId" ON "embed_views" ("trackId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_embed_views_referrerDomain" ON "embed_views" ("referrerDomain")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_embed_views_viewedAt" ON "embed_views" ("viewedAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_embed_views_viewedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_embed_views_referrerDomain"`);
    await queryRunner.query(`DROP INDEX "IDX_embed_views_trackId"`);
    await queryRunner.query(`DROP TABLE "embed_views"`);
  }
}
