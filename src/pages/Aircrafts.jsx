import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync } from '@fortawesome/free-solid-svg-icons';

export default function Aircrafts() {
  const [aircrafts, setAircrafts] = useState([]);
  const [shuffledAircrafts, setShuffledAircrafts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedWTC, setSelectedWTC] = useState('');
  const [maxLevelInput, setMaxLevelInput] = useState('');
  const [cruisingSpeedInput, setCruisingSpeedInput] = useState('');
  const [isExtraFieldsEnabled, setIsExtraFieldsEnabled] = useState(false); // New state for optional fields
  const [errors, setErrors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isIcaoQuestion, setIsIcaoQuestion] = useState(true);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Fetch aircraft data and initialize
  useEffect(() => {
    const fetchAircrafts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Aircrafts'));
        const aircraftList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAircrafts(aircraftList);
        setShuffledAircrafts(shuffleArray(aircraftList));
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch aircrafts: ' + err.message);
        setLoading(false);
      }
    };
    fetchAircrafts();
  }, []);

  // Handle question type toggle
  const handleToggleQuestion = () => {
    setIsIcaoQuestion(!isIcaoQuestion);
    setUserAnswer('');
    setSelectedWTC('');
    setMaxLevelInput(''); // Reset Max Level
    setCruisingSpeedInput(''); // Reset Cruising Speed
    setCurrentIndex(0);
    setErrors(0);
    setShuffledAircrafts(shuffleArray(aircrafts));
  };

    // Handle next question
    const handleNext = (e) => {
      e.preventDefault();
      const currentAircraft = shuffledAircrafts[currentIndex];
      // Normalize inputs for comparison
      const userAnswerCleaned = userAnswer.trim().replace(/\s/g, '').toLowerCase();
      const correctAnswerCleaned = isIcaoQuestion
          ? currentAircraft.Name.replace(/\s/g, '').toLowerCase()
          : currentAircraft['ICAO Code'].replace(/\s/g, '').toLowerCase();
      const correctWTCCleaned = currentAircraft.WTC.trim().toUpperCase();

      let isCorrect = userAnswerCleaned === correctAnswerCleaned && selectedWTC === correctWTCCleaned;

      if (isExtraFieldsEnabled) {
          const correctMaxLevel = String(currentAircraft['Max Level']).trim();
          const correctCruisingSpeed = String(currentAircraft['Cruising Speed']).trim();
          isCorrect = isCorrect &&
              maxLevelInput.trim() === correctMaxLevel &&
              cruisingSpeedInput.trim() === correctCruisingSpeed;
      }

      if (isCorrect) {
          // All required answers correct
          if (currentIndex + 1 < shuffledAircrafts.length) {
              setCurrentIndex(currentIndex + 1);
              setUserAnswer('');
              setSelectedWTC('');
              setMaxLevelInput('');
              setCruisingSpeedInput('');
          } else {
              // End of quiz, reshuffle and reset
              setShuffledAircrafts(shuffleArray(aircrafts));
              setCurrentIndex(0);
              setErrors(0);
              setUserAnswer('');
              setSelectedWTC('');
              setMaxLevelInput('');
              setCruisingSpeedInput('');
          }
      } else {
          // Incorrect answer
          setErrors(errors + 1);
      }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Aircraft Quiz</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Aircraft Quiz</h1>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (aircrafts.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <h1 className="text-2xl font-bold mb-4">Aircraft Quiz</h1>
        <p>No aircrafts found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow max-w-md w-full flex flex-col gap-4 relative">
        <input
          type="checkbox"
          checked={isExtraFieldsEnabled}
          onChange={(e) => setIsExtraFieldsEnabled(e.target.checked)}
          className="absolute top-2 left-2 h-5 w-5"
        />
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
              ? shuffledAircrafts[currentIndex]['ICAO Code']
              : shuffledAircrafts[currentIndex].Name}
          </p>
        </div>
        <form onSubmit={handleNext} className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={isIcaoQuestion ? 'Enter Aircraft Name' : 'Enter ICAO Code'}
              className="p-2 border rounded flex-grow basis-4/5"
              autoFocus
            />
            <select
              value={selectedWTC}
              onChange={(e) => setSelectedWTC(e.target.value)}
              className="p-2 border rounded basis-1/5"
            >
              <option value="" disabled>Select WTC</option>
              <option value="L">L</option>
              <option value="M">M</option>
              <option value="H">H</option>
              <option value="J">J</option>
            </select>
          </div>
          <div className="flex flex-row gap-2">
            <input
              type="text"
              value={maxLevelInput}
              onChange={(e) => setMaxLevelInput(e.target.value)}
              placeholder="Enter Max Level"
              className={`p-2 border rounded flex-1 ${isExtraFieldsEnabled ? '' : 'bg-gray-200'}`}
              disabled={!isExtraFieldsEnabled}
            />
            <input
              type="text"
              value={cruisingSpeedInput}
              onChange={(e) => setCruisingSpeedInput(e.target.value)}
              placeholder="Enter Cruising Speed"
              className={`p-2 border rounded flex-1 ${isExtraFieldsEnabled ? '' : 'bg-gray-200'}`}
              disabled={!isExtraFieldsEnabled}
            />
          </div>
          <button
            type="submit"
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next Aircraft
          </button>
        </form>
        <div className="flex justify-between">
          <p className="text-lg font-bold text-gray-500">Errors: {errors}</p>
          <p className="text-lg font-bold text-gray-500">
            Question: {currentIndex + 1}/{shuffledAircrafts.length}
          </p>
        </div>
      </div>
    </div>
  );
}