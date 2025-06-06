import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

export default function Callsigns() {
  const [callsigns, setCallsigns] = useState([]);
  const [shuffledCallsigns, setShuffledCallsigns] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [errors, setErrors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isIcaoQuestion, setIsIcaoQuestion] = useState(true); // Új state a kérdés típusához

  // Fisher-Yates shuffle algoritmus
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Adatok lekérése és inicializálás
  useEffect(() => {
    const fetchCallsigns = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Callsigns'));
        const callsignList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCallsigns(callsignList);
        setShuffledCallsigns(shuffleArray(callsignList));
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch callsigns: ' + err.message);
        setLoading(false);
      }
    };
    fetchCallsigns();
  }, []);

  // Kérdés-válasz csere kezelése
  const handleToggleQuestion = () => {
    setIsIcaoQuestion(!isIcaoQuestion);
    setUserAnswer('');
    setCurrentIndex(0);
    setErrors(0);
    setShuffledCallsigns(shuffleArray(callsigns)); // Újra keveri a listát
  };

  // Következő kérdés kezelése
  const handleNext = (e) => {
    e.preventDefault();
    const currentCallsign = shuffledCallsigns[currentIndex];
    // Szóközök eltávolítása az összehasonlításhoz
    const userAnswerCleaned = userAnswer.trim().replace(/\s/g, '').toLowerCase();
    const correctAnswerCleaned = isIcaoQuestion
      ? currentCallsign.Callsign.replace(/\s/g, '').toLowerCase()
      : currentCallsign['ICAO Code'].replace(/\s/g, '').toLowerCase();

    if (userAnswerCleaned === correctAnswerCleaned) {
      // Helyes válasz
      if (currentIndex + 1 < shuffledCallsigns.length) {
        setCurrentIndex(currentIndex + 1);
        setUserAnswer('');
      } else {
        // Kvíz vége, újrakeverés és reset
        setShuffledCallsigns(shuffleArray(callsigns));
        setCurrentIndex(0);
        setErrors(0);
        setUserAnswer('');
      }
    } else {
      // Helytelen válasz
      setErrors(errors + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Callsign Quiz</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Callsign Quiz</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (callsigns.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Callsign Quiz</h1>
        <p>No callsigns found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow max-w-md w-full flex flex-col gap-4 relative">
        <button
          onClick={handleToggleQuestion}
          title="Toggle Question Type"
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <FontAwesomeIcon icon={faSync} />
        </button>
        <div>
          <p className="text-lg font-bold flex justify-center">
            {isIcaoQuestion
              ? shuffledCallsigns[currentIndex]['ICAO Code']
              : shuffledCallsigns[currentIndex].Callsign}
          </p>
        </div>
        <form onSubmit={handleNext} className="flex flex-col gap-4">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder={isIcaoQuestion ? 'Enter Callsign' : 'Enter ICAO Code'}
            className="p-2 border rounded"
            autoFocus
          />
          <button
            type="submit"
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next Callsign
          </button>
        </form>
        <div className="flex justify-between">
          <p className="text-lg font-bold text-gray-500">Errors: {errors}</p>
          <p className="text-lg font-bold text-gray-500">
            Question: {currentIndex + 1}/{shuffledCallsigns.length}
          </p>
        </div>
      </div>
    </div>
  );
}