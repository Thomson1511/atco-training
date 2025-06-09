import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Map, Popup, Marker, config } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

export default function Airports() {
  const [airports, setAirports] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]); // Kevert kérdéslista
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [errorCount, setErrorCount] = useState(0); // Helytelen válaszok számláló
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Jelenlegi kérdés sorszáma
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({}); // Ref a markerek tárolására

  // MapTiler API kulcs
  const mapTilerKey = 'Tx0tJslnlndsHe3hs95w';

  // Zoom szint a helyes válasz utáni animációhoz (állítható)
  const zoomLevel = 5; // Alapértelmezett zoom szint, módosítható

  // Fisher-Yates shuffle algoritmus
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Repülőterek lekérése Firestore-ból
  useEffect(() => {
    let isMounted = true; // Megakadályozza a dupla logolást Strict Mode-ban
    const fetchAirports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Airports'));
        const airportList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (isMounted) {
          // Konzolra írás: minden repülőtér adatai
          console.log('Betöltött repülőterek:');
          airportList.forEach(airport => {
            console.log(`ICAO Code: ${airport['ICAO Code']}, Airport: ${airport.Airport}`);
          });
          setAirports(airportList);
          // Kevert kérdéslista inicializálása
          if (airportList.length > 0) {
            const shuffled = shuffleArray(airportList);
            setShuffledQuestions(shuffled);
            setCurrentQuestion(shuffled[0]);
            setCurrentQuestionIndex(1); // Kezdeti kérdés sorszáma
          } else {
            console.warn('Nincsenek repülőterek az adatbázisban.');
            setError('Nincsenek repülőterek az adatbázisban.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Hiba a repülőterek betöltésekor:', err);
          setError('Nem sikerült betölteni a repülőtereket: ' + err.message);
          setLoading(false);
        }
      }
    };
    fetchAirports();
    return () => {
      isMounted = false; // Cleanup Strict Mode-hoz
    };
  }, []);

  // MapTiler térkép inicializálása
  useEffect(() => {
    if (!mapContainer.current || airports.length === 0) return;

    // API kulcs beállítása
    config.apiKey = mapTilerKey;

    // Térkép inicializálása
    map.current = new Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/01974fe0-7e99-7127-b3bd-efa9385fdb1e/style.json?key=Tx0tJslnlndsHe3hs95w',
      center: [0, 20], // Kezdeti középpont (hosszúság, szélesség)
      zoom: 2, // Kezdeti nagyítási szint
    });

    // Markerek hozzáadása a repülőterekhez piros pöttyökként
    airports.forEach(airport => {
      const { Lat, Long, 'ICAO Code': icaoCode, Airport: airportName } = airport;
      if (Lat && Long) {
        const popup = new Popup({ offset: 25 }).setHTML(
          `<h3>${icaoCode}</h3><p>${airportName}</p>`
        );

        // Egyéni piros pötty marker
        const markerElement = document.createElement('div');
        markerElement.style.backgroundColor = 'red';
        markerElement.style.width = '12px';
        markerElement.style.height = '12px';
        markerElement.style.borderRadius = '50%';
        markerElement.style.border = '2px solid white';
        markerElement.style.cursor = 'pointer';

        const marker = new Marker({ element: markerElement })
          .setLngLat([parseFloat(Long), parseFloat(Lat)])
          .setPopup(popup)
          .addTo(map.current);

        // Marker tárolása a ref-ben az ICAO Code alapján
        markers.current[icaoCode] = { marker, element: markerElement };

        marker.getElement().addEventListener('click', () => {
          // Ellenőrzi, hogy a kiválasztott marker helyes-e
          if (currentQuestion && icaoCode === currentQuestion['ICAO Code']) {
            // Marker színének megváltoztatása zöldre
            markerElement.style.backgroundColor = 'green';
            // Zoom animáció a helyes markerre
            map.current.flyTo({
              center: [parseFloat(Long), parseFloat(Lat)],
              zoom: zoomLevel,
              duration: 2000, // Animáció időtartama (ms)
            });
            // Kérdés váltás az animáció befejezése után
            map.current.once('moveend', () => {
              // Következő kérdés kiválasztása
              const nextIndex = currentQuestionIndex;
              if (nextIndex < shuffledQuestions.length) {
                setCurrentQuestion(shuffledQuestions[nextIndex]);
                setCurrentQuestionIndex(prev => prev + 1);
              } else {
                // Ha vége a listának, újrakeverés
                const newShuffled = shuffleArray(airports);
                setShuffledQuestions(newShuffled);
                setCurrentQuestion(newShuffled[0]);
                setCurrentQuestionIndex(1);
              }
            });
          }
        });
      }
    });

    // Térkép eltávolítása komponens leszerelésekor
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [airports]);

  // Válasz ellenőrzése az input mezőből
  const handleCheckAnswer = (e) => {
    e.preventDefault();
    const userAnswerCleaned = userAnswer.trim().toLowerCase();
    const correctAnswerCleaned = currentQuestion?.Airport.toLowerCase();
    if (userAnswerCleaned === correctAnswerCleaned) {
      // Helyes válasz esetén zoom a megfelelő markerre
      const correctAirport = airports.find(
        airport => airport['ICAO Code'] === currentQuestion['ICAO Code']
      );
      if (correctAirport && correctAirport.Lat && correctAirport.Long) {
        // Marker színének megváltoztatása zöldre
        const markerElement = markers.current[correctAirport['ICAO Code']]?.element;
        if (markerElement) {
          markerElement.style.backgroundColor = 'green';
        }
        map.current.flyTo({
          center: [parseFloat(correctAirport.Long), parseFloat(correctAirport.Lat)],
          zoom: zoomLevel,
          duration: 2000, // Animáció időtartama (ms)
        });
        // Kérdés váltás az animáció befejezése után
        map.current.once('moveend', () => {
          // Következő kérdés kiválasztása
          const nextIndex = currentQuestionIndex;
          if (nextIndex < shuffledQuestions.length) {
            setCurrentQuestion(shuffledQuestions[nextIndex]);
            setCurrentQuestionIndex(prev => prev + 1);
          } else {
            // Ha vége a listának, újrakeverés és markerek visszaállítása pirosra
            Object.values(markers.current).forEach(({ element }) => {
              element.style.backgroundColor = 'red';
            });
            const newShuffled = shuffleArray(airports);
            setShuffledQuestions(newShuffled);
            setCurrentQuestion(newShuffled[0]);
            setCurrentQuestionIndex(1);
            setErrorCount(0); // Hibaszámláló visszaállítása
          }
        });
      }
    } else {
      // Helytelen válasz esetén növeljük a hibaszámlálót
      setErrorCount(prev => prev + 1);
    }
    // Mindig töröljük az input mezőt
    setUserAnswer('');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <p>Betöltés...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="relative w-full max-w-7xl p-4">
        {currentQuestion && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow z-10 flex flex-col items-center gap-2">
            <p className="text-lg font-bold text-center">
              Keresd meg a térképen: {currentQuestion['ICAO Code']}
            </p>
            <form onSubmit={handleCheckAnswer} className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Írd be a repülőtér nevét"
                className="p-2 border rounded"
                autoFocus
              />
              <button
                type="submit"
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Ellenőrzés
              </button>
            </form>
          </div>
        )}
        <div className="relative w-full h-[800px] rounded-lg shadow">
          <div
            ref={mapContainer}
            className="w-full h-full"
          ></div>
          {/* Errors számláló a bal alsó sarokban */}
          <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow z-10">
            <p className="text-lg font-bold text-red-600">
              Hibák: {errorCount}
            </p>
          </div>
          {/* Kérdés számláló a jobb alsó sarokban */}
          <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow z-10">
            <p className="text-lg font-bold text-blue-600">
              {currentQuestionIndex}/{airports.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}