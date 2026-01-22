import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-navy text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl mb-8">Page not found</p>
        <Link
          to="/"
          className="text-blue-primary hover:text-ice-blue underline"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
