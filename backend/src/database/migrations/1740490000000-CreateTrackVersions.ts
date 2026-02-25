import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateTrackVersions1740490000000 implements MigrationInterface {
  name = "CreateTrackVersions1740490000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "track_versions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "trackId",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "versionNumber",
            type: "int",
            isNullable: false,
          },
          {
            name: "audioUrl",
            type: "varchar",
            length: "500",
            isNullable: false,
          },
          {
            name: "fileSize",
            type: "bigint",
            isNullable: false,
          },
          {
            name: "duration",
            type: "int",
            isNullable: false,
          },
          {
            name: "changeNote",
            type: "text",
            isNullable: true,
          },
          {
            name: "isActive",
            type: "boolean",
            default: false,
          },
          {
            name: "uploadedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "uploadedBy",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ["trackId"],
            referencedTableName: "tracks",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "track_versions",
      new TableIndex({
        name: "IDX_track_versions_trackId_versionNumber",
        columnNames: ["trackId", "versionNumber"],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "track_versions",
      new TableIndex({
        name: "IDX_track_versions_trackId_isActive",
        columnNames: ["trackId", "isActive"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      "track_versions",
      "IDX_track_versions_trackId_isActive",
    );
    await queryRunner.dropIndex(
      "track_versions",
      "IDX_track_versions_trackId_versionNumber",
    );
    await queryRunner.dropTable("track_versions");
  }
}
