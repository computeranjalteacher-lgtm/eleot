import { useState } from 'react';
import { signInWithGoogle } from '../services/authService';
import { LogIn } from 'lucide-react';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700 mb-2">
            Smart Observation Tool
          </h1>
          <h2 className="text-2xl font-semibold text-primary-600 mb-4" dir="rtl">
            أداة المراقبة الذكية (ELEOT)
          </h2>
          <p className="text-gray-600">
            Sign in to start evaluating classroom observations
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-3 py-3 text-lg"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </>
          )}
        </button>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your observations will be saved securely to your account</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

