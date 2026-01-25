import { DataSource } from "typeorm";
import { Genre } from "../entities/genre.entity";

/**
 * Seed predefined genres for TipTune
 * Run this after migrations are applied
 */
export async function seedGenres(dataSource: DataSource): Promise<void> {
  const genreRepository = dataSource.getRepository(Genre);

  // Check if genres already exist
  const existingCount = await genreRepository.count();
  if (existingCount > 0) {
    console.log("Genres already seeded. Skipping...");
    return;
  }

  // Root genres
  const rootGenres = [
    { name: "Electronic", description: "Electronic music and EDM" },
    { name: "Hip-Hop", description: "Hip-hop and rap music" },
    { name: "Rock", description: "Rock music in all its forms" },
    { name: "Jazz", description: "Jazz and improvisational music" },
    { name: "Classical", description: "Classical and orchestral music" },
    { name: "Pop", description: "Popular music" },
    { name: "R&B", description: "Rhythm and blues" },
    { name: "Country", description: "Country and western music" },
    { name: "Indie", description: "Independent and alternative music" },
    { name: "Blues", description: "Blues music" },
    { name: "Folk", description: "Folk and acoustic music" },
    { name: "Reggae", description: "Reggae and Caribbean music" },
    { name: "Metal", description: "Heavy metal and hard rock" },
    { name: "Punk", description: "Punk rock music" },
    { name: "Latin", description: "Latin and Spanish music" },
    { name: "World", description: "World music from various cultures" },
    { name: "Ambient", description: "Ambient and atmospheric music" },
    { name: "Gospel", description: "Gospel and Christian music" },
    { name: "Soul", description: "Soul music" },
    { name: "Funk", description: "Funk music" },
  ];

  // Helper function to generate slug (same as in GenresService)
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Create root genres
  const createdRootGenres: Genre[] = [];
  for (const genreData of rootGenres) {
    const slug = generateSlug(genreData.name);
    const genre = genreRepository.create({
      name: genreData.name,
      slug,
      description: genreData.description,
      parentGenreId: null,
      trackCount: 0,
    });
    const saved = await genreRepository.save(genre);
    createdRootGenres.push(saved);
    console.log(`Created root genre: ${genreData.name}`);
  }

  // Create sub-genres (examples)
  const subGenres = [
    // Electronic sub-genres
    { name: "House", parent: "Electronic", description: "House music" },
    { name: "Techno", parent: "Electronic", description: "Techno music" },
    { name: "Trance", parent: "Electronic", description: "Trance music" },
    { name: "Dubstep", parent: "Electronic", description: "Dubstep music" },
    { name: "Drum & Bass", parent: "Electronic", description: "Drum and bass" },
    {
      name: "Ambient Electronic",
      parent: "Electronic",
      description: "Ambient electronic music",
    },

    // Hip-Hop sub-genres
    { name: "Trap", parent: "Hip-Hop", description: "Trap music" },
    {
      name: "Old School",
      parent: "Hip-Hop",
      description: "Old school hip-hop",
    },
    {
      name: "East Coast",
      parent: "Hip-Hop",
      description: "East Coast hip-hop",
    },
    {
      name: "West Coast",
      parent: "Hip-Hop",
      description: "West Coast hip-hop",
    },
    { name: "Southern", parent: "Hip-Hop", description: "Southern hip-hop" },

    // Rock sub-genres
    {
      name: "Alternative Rock",
      parent: "Rock",
      description: "Alternative rock",
    },
    { name: "Indie Rock", parent: "Rock", description: "Indie rock" },
    { name: "Classic Rock", parent: "Rock", description: "Classic rock" },
    { name: "Hard Rock", parent: "Rock", description: "Hard rock" },
    {
      name: "Progressive Rock",
      parent: "Rock",
      description: "Progressive rock",
    },

    // Jazz sub-genres
    { name: "Bebop", parent: "Jazz", description: "Bebop jazz" },
    { name: "Smooth Jazz", parent: "Jazz", description: "Smooth jazz" },
    { name: "Fusion", parent: "Jazz", description: "Jazz fusion" },
    { name: "Latin Jazz", parent: "Jazz", description: "Latin jazz" },

    // Pop sub-genres
    { name: "Pop Rock", parent: "Pop", description: "Pop rock" },
    { name: "Dance Pop", parent: "Pop", description: "Dance pop" },
    { name: "Indie Pop", parent: "Pop", description: "Indie pop" },

    // R&B sub-genres
    {
      name: "Contemporary R&B",
      parent: "R&B",
      description: "Contemporary R&B",
    },
    { name: "Neo Soul", parent: "R&B", description: "Neo soul" },

    // Country sub-genres
    { name: "Country Pop", parent: "Country", description: "Country pop" },
    { name: "Bluegrass", parent: "Country", description: "Bluegrass" },
    {
      name: "Outlaw Country",
      parent: "Country",
      description: "Outlaw country",
    },
  ];

  // Create sub-genres
  for (const subGenreData of subGenres) {
    const parent = createdRootGenres.find(
      (g) => g.name === subGenreData.parent,
    );
    if (!parent) {
      console.warn(
        `Parent genre "${subGenreData.parent}" not found for "${subGenreData.name}"`,
      );
      continue;
    }

    const slug = generateSlug(subGenreData.name);
    const genre = genreRepository.create({
      name: subGenreData.name,
      slug,
      description: subGenreData.description,
      parentGenreId: parent.id,
      trackCount: 0,
    });
    await genreRepository.save(genre);
    console.log(
      `Created sub-genre: ${subGenreData.name} (parent: ${subGenreData.parent})`,
    );
  }

  console.log("Genre seeding completed!");
}

/**
 * Standalone seed function (can be run with ts-node)
 */
export async function runSeed(): Promise<void> {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "tiptune",
    entities: [__dirname + "/../entities/*.entity{.ts,.js}"],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log("Database connection established");
    await seedGenres(dataSource);
    await dataSource.destroy();
    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Error seeding genres:", error);
    await dataSource.destroy();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runSeed();
}
