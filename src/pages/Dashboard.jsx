import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(null);
  const [error, setError] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Szerepkör lekérése a users kollekcióból
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userRole = userDoc.data().role;
            setRole(userRole);
          } else {
            setRole(null);
          }
        } catch (err) {
          setError(err.message);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError(null);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        role: 'ATCO', // Alapértelmezett szerepkör
      });
      setRole('ATCO'); // Azonnal frissítjük a role állapotot
      setError(null);
      setEmail('');
      setPassword('');
      setIsRegistering(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRole(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!auth.currentUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
        <div className="bg-white p-6 rounded-lg shadow max-w-md w-full">
          <h2 className="text-xl font-semibold mb-4">{isRegistering ? 'Register' : 'Login'}</h2>
          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="flex flex-col gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="p-2 border rounded"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="p-2 border rounded"
            />
            <button
              type="submit"
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="mt-4 text-blue-500 hover:underline"
          >
            {isRegistering ? 'Switch to Login' : 'Switch to Register'}
          </button>
          {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-8 text-center">Dashboard</h1>
      {role === 'Supervisor' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/dashboard/aircrafts"
            className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition duration-200"
          >
            <h3 className="text-lg font-semibold text-center">Aircrafts</h3>
          </Link>
          <Link
            to="/dashboard/Airports"
            className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition duration-200"
          >
            <h3 className="text-lg font-semibold text-center">Airports</h3>
          </Link>
          <Link
            to="/dashboard/callsigns"
            className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition duration-200"
          >
            <h3 className="text-lg font-semibold text-center">Callsigns</h3>
          </Link>
          <Link
            to="/dashboard/constraints"
            className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition duration-200"
          >
            <h3 className="text-lg font-semibold text-center">Constraints</h3>
          </Link>
          <Link
            to="/dashboard/ext_points"
            className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition duration-200"
          >
            <h3 className="text-lg font-semibold text-center">External Points</h3>
          </Link>
          <Link
            to="/dashboard/int_points"
            className="bg-white p-6 rounded-lg shadow hover:bg-gray-50 transition duration-200"
          >
            <h3 className="text-lg font-semibold text-center">Internal Points</h3>
          </Link>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow max-w-md w-full mx-auto">
          <p className="text-lg mb-4 text-center">Nincs jogosultságod módosítani az adatbázist</p>
        </div>
      )}
      <div className="flex justify-center mt-6">
        <button
          onClick={handleLogout}
          className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
    </div>
  );
}