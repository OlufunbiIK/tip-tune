interface TrackInfoProps {
  title: string;
  artist: {
    artistName: string;
    id: string;
  };
  albumArt?: string;
 
}

const TrackInfo = ({ title, artist, albumArt }: TrackInfoProps) => {
  return (
    <div className="flex gap-x-3  ">
      <div className="h-[100px] w-[100px] object-cover rounded-2xl overflow-hidden relative shadow-lg border border-white/5">
        {albumArt ? (
          <img
            src={albumArt }
            alt="Album Art"
            className="w-full h-full object-cover rounded-2xl  "
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-2/5 h-2/5"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        
      </div>

      <div className="mt-2">
        <h2 className="text-lg font-semibold text-white mb-.5">{title}</h2>
        <p className="text-base text-ice-blue">{artist.artistName}</p>
      </div>
    </div>
  );
};

export default TrackInfo;
