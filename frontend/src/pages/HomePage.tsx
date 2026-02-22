import { NotificationCenter } from '../components/NotificationCenter';
import { useWallet } from '../hooks/useWallet';

const HomePage = () => {
  const { isConnected, connect, publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-navy text-white">
      <header className="border-b border-gray-700 bg-navy-light">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-xl font-bold">TipTune</div>
          <div className="flex items-center gap-4">
            {isConnected && <NotificationCenter />}

            <button
              onClick={() => !isConnected && connect()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              {isConnected ? `Connected: ${publicKey?.slice(0, 4)}...${publicKey?.slice(-4)}` : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-4">Welcome to TipTune</h1>
        <p className="text-lg text-ice-blue">
          Real-time music tips powered by Stellar
        </p>
      </div>

    </div>
  );
};


export default HomePage;


