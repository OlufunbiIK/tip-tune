import React from "react";
import { ArtistSocialLinks } from "@/types";

interface ArtistBioProps {
  bio: string;
  socialLinks: ArtistSocialLinks;
}

const linkEntries = (socialLinks: ArtistSocialLinks) =>
  Object.entries(socialLinks).filter((entry): entry is [string, string] =>
    Boolean(entry[1]),
  );

const ArtistBio: React.FC<ArtistBioProps> = ({ bio, socialLinks }) => {
  const links = linkEntries(socialLinks);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">About</h2>
      <p className="mt-3 text-sm leading-6 text-gray-700">{bio}</p>

      {links.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900">Social Link</h3>
          <ul className="mt-2 space-y-2">
            {links.map(([key, url]) => (
              <li key={key}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {key}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};

export default ArtistBio;
