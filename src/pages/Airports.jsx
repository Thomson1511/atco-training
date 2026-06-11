import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Map, Popup, Marker, config } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

export default function Airports() {
  const [airports, setAirports] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [isReversed, setIsReversed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mistakesPerAirport, setMistakesPerAirport] = useState({});

  const [hintStage, setHintStage] = useState(0);
  const [currentHint, setCurrentHint] = useState('');

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  // Ref-ek
  const currentQuestionRef = useRef(null);
  const shuffledQuestionsRef = useRef([]);
  const isReversedRef = useRef(false);
  const mistakesPerAirportRef = useRef({});
  const currentQuestionIndexRef = useRef(0);

  const mapTilerKey = 'Tx0tJslnlndsHe3hs95w';
  const zoomLevel = 5;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const getMarkerColor = (mistakeCount) => {
    if (mistakeCount === 0) return 'green';
    if (mistakeCount === 1) return 'yellow';
    if (mistakeCount === 2) return 'orange';
    return 'red';
  };

  const generateHalfHint = (answer) => {
    const trimmed = answer.trim();
    const halfLength = Math.ceil(trimmed.length / 2);
    return trimmed.substring(0, halfLength) + '.'.repeat(trimmed.length - halfLength);
  };

  // Repülőterek betöltése
  useEffect(() => {
    let isMounted = true;

    const fetchAirports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Airports'));
        const airportList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (isMounted && airportList.length > 0) {
          const shuffled = shuffleArray(airportList);
          setAirports(airportList);
          setShuffledQuestions(shuffled);
          setCurrentQuestion(shuffled[0]);
          setCurrentQuestionIndex(0);
          setMistakesPerAirport({});
          setHintStage(0);
          setCurrentHint('');
        } else if (isMounted) {
          setError('Nincsenek repülőterek az adatbázisban.');
        }
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('Nem sikerült betölteni a repülőtereket.');
          setLoading(false);
        }
      }
    };

    fetchAirports();
    return () => { isMounted = false; };
  }, []);

  // Ref-ek frissítése
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  useEffect(() => { shuffledQuestionsRef.current = shuffledQuestions; }, [shuffledQuestions]);
  useEffect(() => { isReversedRef.current = isReversed; }, [isReversed]);
  useEffect(() => { mistakesPerAirportRef.current = mistakesPerAirport; }, [mistakesPerAirport]);
  useEffect(() => { currentQuestionIndexRef.current = currentQuestionIndex; }, [currentQuestionIndex]);

  useEffect(() => {
    setHintStage(0);
    setCurrentHint('');
  }, [currentQuestion]);

  // Térkép és markerek
  useEffect(() => {
    if (!mapContainer.current || airports.length === 0) return;

    config.apiKey = mapTilerKey;

    map.current = new Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/01974fe0-7e99-7127-b3bd-efa9385fdb1e/style.json?key=${mapTilerKey}`,
      center: [0, 20],
      zoom: 2,
    });

    markers.current = {};

    airports.forEach(airport => {
      const { Lat, Long, 'ICAO Code': icaoCode, Airport: airportName } = airport;
      if (!Lat || !Long) return;

      const popup = new Popup({ offset: 25 }).setHTML(`<h3>${icaoCode}</h3><p>${airportName}</p>`);

      const markerElement = document.createElement('div');
      markerElement.style.backgroundColor = 'blue';
      markerElement.style.width = '12px';
      markerElement.style.height = '12px';
      markerElement.style.borderRadius = '50%';
      markerElement.style.border = '2px solid white';
      markerElement.style.cursor = 'pointer';

      const marker = new Marker({ element: markerElement })
        .setLngLat([parseFloat(Long), parseFloat(Lat)])
        .setPopup(popup)
        .addTo(map.current);

      markers.current[icaoCode] = { marker, element: markerElement };

      marker.getElement().addEventListener('click', () => {
        const currentQ = currentQuestionRef.current;
        if (!currentQ) return;

        if (icaoCode === currentQ['ICAO Code']) {
          handleCorrectAnswer(airport);
        } else {
          handleWrongMarkerClick();
        }
      });
    });

    return () => {
      if (map.current) map.current.remove();
    };
  }, [airports]);

  const updateMarkerColor = (icaoCode) => {
    const markerData = markers.current[icaoCode];
    const mistakeCount = mistakesPerAirportRef.current[icaoCode] || 0;
    if (markerData) {
      markerData.element.style.backgroundColor = getMarkerColor(mistakeCount);
    }
  };

  // ÚJ: Magenta körvonal kiemelés 3 másodpercre
  const highlightMarker = (icaoCode) => {
    const markerData = markers.current[icaoCode];
    if (!markerData) return;

    // Magenta körvonal
    markerData.element.style.border = '2px solid magenta';

    // 3 másodperc után visszafehéredik
    setTimeout(() => {
      if (markerData.element) {
        markerData.element.style.border = '2px solid white';
      }
    }, 3000);
  };

  const handleCorrectAnswer = useCallback((correctAirport) => {
    const icao = correctAirport['ICAO Code'];
    updateMarkerColor(icao);
    highlightMarker(icao);   // ← ÚJ: magenta kiemelés

    map.current.flyTo({
      center: [
        parseFloat(correctAirport.Long),
        isMobile ? parseFloat(correctAirport.Lat) - 2 : parseFloat(correctAirport.Lat),
      ],
      zoom: zoomLevel,
      duration: 2000,
    });

    map.current.once('moveend', () => {
      const currentIndex = currentQuestionIndexRef.current;
      const shuffled = shuffledQuestionsRef.current;
      const nextIndex = currentIndex + 1;

      if (nextIndex < shuffled.length) {
        setCurrentQuestion(shuffled[nextIndex]);
        setCurrentQuestionIndex(nextIndex);
      } else {
        Object.values(markers.current).forEach(({ element }) => {
          element.style.backgroundColor = 'blue';
          element.style.border = '2px solid white';
        });

        const newShuffled = shuffleArray(airports);
        setShuffledQuestions(newShuffled);
        setCurrentQuestion(newShuffled[0]);
        setCurrentQuestionIndex(0);
        setErrorCount(0);
        setMistakesPerAirport({});
      }
    });
  }, [airports, isMobile]);

  const handleWrongMarkerClick = useCallback(() => {
    if (!currentQuestion) return;

    const icao = currentQuestion['ICAO Code'];
    setMistakesPerAirport(prev => ({
      ...prev,
      [icao]: (prev[icao] || 0) + 1
    }));
    setErrorCount(prev => prev + 1);
  }, [currentQuestion]);

  const handleCheckAnswer = useCallback((e) => {
    e.preventDefault();
    if (!currentQuestion) return;

    const userAnswerCleaned = userAnswer.trim().toLowerCase();
    const correctAnswerCleaned = isReversedRef.current
      ? currentQuestion['ICAO Code'].toLowerCase()
      : currentQuestion.Airport.toLowerCase();

    if (userAnswerCleaned === correctAnswerCleaned) {
      const correctAirport = airports.find(a => a['ICAO Code'] === currentQuestion['ICAO Code']);
      if (correctAirport) handleCorrectAnswer(correctAirport);
      setUserAnswer('');
      setHintStage(0);
      setCurrentHint('');
    } else {
      const icao = currentQuestion['ICAO Code'];
      setMistakesPerAirport(prev => ({
        ...prev,
        [icao]: (prev[icao] || 0) + 1
      }));
      setErrorCount(prev => prev + 1);
    }
  }, [userAnswer, currentQuestion, airports, handleCorrectAnswer]);

  const handleHint = () => {
    if (!currentQuestion) return;

    const correctAnswer = isReversed 
      ? currentQuestion['ICAO Code'] 
      : currentQuestion.Airport;

    if (hintStage === 0) {
      setCurrentHint(generateHalfHint(correctAnswer));
      setHintStage(1);
    } else {
      const icao = currentQuestion['ICAO Code'];
      setUserAnswer(correctAnswer);
      setMistakesPerAirport(prev => ({
        ...prev,
        [icao]: Math.max(prev[icao] || 0, 3)
      }));
      setHintStage(2);
      setCurrentHint('');
    }
  };

  const toggleQuestionOrder = () => setIsReversed(prev => !prev);

  if (loading) return <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100"><p>Betöltés...</p></div>;
  if (error) return <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100"><p className="text-red-500">{error}</p></div>;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="relative w-full p-4 max-w-[1600px]">
        {currentQuestion && (
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white p-6 rounded-xl shadow-xl z-20 flex flex-col items-center gap-3 w-full max-w-md">
            <button onClick={toggleQuestionOrder} className="absolute top-3 left-3 text-gray-500 hover:text-gray-700" title="Kérdés sorrend váltása">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <p className="text-xl font-bold text-center px-8">
              {isReversed ? currentQuestion.Airport : currentQuestion['ICAO Code']}
            </p>

            {currentHint && (
              <p className="text-sm text-amber-600 font-mono bg-amber-50 px-4 py-2 rounded-lg">
                Tipp: {currentHint}
              </p>
            )}

            <form onSubmit={handleCheckAnswer} className="flex gap-2 w-full">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder={isReversed ? 'Írd be az ICAO kódot!' : 'Írd be a repülőtér nevét!'}
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Ellenőrzés
              </button>
            </form>
          </div>
        )}

        {currentQuestion && (
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
            <button
              onClick={handleHint}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-full shadow-lg transition-all active:scale-95 font-medium"
            >
              <span>💡</span>
              <span>{hintStage === 0 ? 'Tipp' : hintStage === 1 ? 'Teljes válasz' : 'Tipp használt'}</span>
            </button>
          </div>
        )}

        <div className="relative w-full h-[95vh] rounded-xl shadow-2xl overflow-hidden">
          <div ref={mapContainer} className="w-full h-full" />

          <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg z-10">
            <p className="text-lg font-bold text-red-600">Hibák: {errorCount}</p>
          </div>

          <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg z-10">
            <p className="text-lg font-bold text-blue-600">
              {currentQuestionIndex + 1} / {airports.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}