import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Map, Popup, Marker, config } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

export default function IntPoints() {
  const [intPoints, setIntPoints] = useState([]);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [errorCount, setErrorCount] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  // MapTiler API kulcs
  const mapTilerKey = 'Tx0tJslnlndsHe3hs95w';

  // Fisher-Yates shuffle algoritmus
  const shuffleArray = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // DMS (fok, perc, másodperc) konvertálása tizedes fokokká
  const dmsToDecimal = (dms) => {
    const regex = /(\d+)°\s*(\d+)?'?\s*(\d*\.?\d*)"?\s*([NSEW]?)/i;
    const match = dms.match(regex);
    if (!match) return null;

    const degrees = parseFloat(match[1]);
    const minutes = match[2] ? parseFloat(match[2]) : 0;
    const seconds = match[3] ? parseFloat(match[3]) : 0;
    const direction = match[4] ? match[4].toUpperCase() : '';

    let decimal = degrees + minutes / 60 + seconds / 3600;
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }
    return decimal;
  };

  // Adatbázis formátumú koordináta konvertálása tizedes fokokká (pl. "47.5359" → 47° 53' 59" → tizedes fok)
  const databaseCoordToDecimal = (coord) => {
    const num = parseFloat(coord);
    if (isNaN(num)) return null;

    const degrees = Math.floor(num); // Fok: egész rész
    const decimalPart = num - degrees; // Tizedes rész
    const minutes = Math.floor(decimalPart * 100); // Perc: első két tizedesjegy
    const seconds = (decimalPart * 100 - minutes) * 100; // Másodperc: további tizedesjegyek

    return degrees + minutes / 60 + seconds / 3600;
  };

  // Útvonal hozzáadása a térképhez
  const addRouteToMap = (map, sourceId, coordinates, color = '#34bdeb') => {
    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      },
    });

    map.addLayer({
      id: sourceId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': color,
        'line-width': 4,
      },
    });
  };

  // Internal Points lekérése Firestore-ból
  useEffect(() => {
    let isMounted = true;
    const fetchIntPoints = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'IntPoints'));
        const intPointsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (isMounted) {
          setIntPoints(intPointsList);
          if (intPointsList.length > 0) {
            const shuffled = shuffleArray(intPointsList);
            setShuffledQuestions(shuffled);
            setCurrentQuestion(shuffled[0]);
            setCurrentQuestionIndex(1);
          } else {
            console.warn('Nincsenek belső pontok az adatbázisban.');
            setError('Nincsenek belső pontok az adatbázisban.');
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Hiba a belső pontok betöltésekor:', err);
          setError('Nem sikerült betölteni a belső pontokat: ' + err.message);
          setLoading(false);
        }
      }
    };
    fetchIntPoints();
    return () => {
      isMounted = false;
    };
  }, []);

  // MapTiler térkép inicializálása és vonal rajzolása
  useEffect(() => {
    if (!mapContainer.current || intPoints.length === 0) return;

    config.apiKey = mapTilerKey;

    map.current = new Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/01975acb-95b7-7a6b-beb9-fae86429fd18/style.json?key=Tx0tJslnlndsHe3hs95w',
      center: [19.6, 47.2], // Módosított középpont
      zoom: 6.8, // Módosított nagyítás
    });

    // GeoJSON vonal hozzáadása DMS koordinátákkal
    map.current.on('load', () => {
      const TMAcoordinates = [
        [dmsToDecimal("20° 03' 25\" E"), dmsToDecimal("48° 10' 29\" N")], 
        [dmsToDecimal("20° 13' 59\" E"), dmsToDecimal("48° 06' 05\" N")],
        [dmsToDecimal("20° 13' 58\" E"), dmsToDecimal("47° 32' 00\" N")],
        [dmsToDecimal("20° 13' 55\" E"), dmsToDecimal("47° 15' 29\" N")],
        [dmsToDecimal("20° 13' 53\" E"), dmsToDecimal("47° 09' 13\" N")],
        [dmsToDecimal("19° 51' 36\" E"), dmsToDecimal("46° 52' 48\" N")],
        [dmsToDecimal("19° 23' 49\" E"), dmsToDecimal("46° 48' 19\" N")],
        [dmsToDecimal("19° 00' 31\" E"), dmsToDecimal("46° 53' 37\" N")],
        [dmsToDecimal("18° 22' 12\" E"), dmsToDecimal("47° 02' 20\" N")],
        [dmsToDecimal("18° 17' 44\" E"), dmsToDecimal("47° 20' 11\" N")],
        [dmsToDecimal("18° 15' 30\" E"), dmsToDecimal("47° 44' 19\" N")],
      ];

      const lhbpctrCoordinates = [
        [dmsToDecimal("19° 05' 23\" E"), dmsToDecimal("47° 35' 46\" N")], 
        [dmsToDecimal("19° 08' 56\" E"), dmsToDecimal("47° 34' 57\" N")],
        [dmsToDecimal("19° 19' 30\" E"), dmsToDecimal("47° 32' 30\" N")],

        [dmsToDecimal("19° 34' 00\" E"), dmsToDecimal("47° 24' 00\" N")],
        [dmsToDecimal("19° 32' 47\" E"), dmsToDecimal("47° 23' 07\" N")],
        [dmsToDecimal("19° 23' 47\" E"), dmsToDecimal("47° 16' 32\" N")],
        [dmsToDecimal("19° 21' 38\" E"), dmsToDecimal("47° 14' 57\" N")],
        [dmsToDecimal("19° 06' 42\" E"), dmsToDecimal("47° 24' 10\" N")],
        [dmsToDecimal("19° 06' 19\" E"), dmsToDecimal("47° 26' 13\" N")],
        [dmsToDecimal("19° 03' 36\" E"), dmsToDecimal("47° 29' 41\" N")],
        [dmsToDecimal("19° 03' 25\" E"), dmsToDecimal("47° 30' 22\" N")],
        [dmsToDecimal("19° 03' 21\" E"), dmsToDecimal("47° 30' 38\" N")],
        [dmsToDecimal("19° 05' 23\" E"), dmsToDecimal("47° 35' 46\" N")],
      ];

      // Útvonalak hozzáadása a térképhez
      addRouteToMap(map.current, 'route', TMAcoordinates, '#34bdeb');
      addRouteToMap(map.current, 'lhbpctr', lhbpctrCoordinates, '#34bdeb');
    });

    // Markerek hozzáadása az adatbázis koordinátáival
    intPoints.forEach(point => {
      const { Name, Lat, Long } = point;
      if (Lat && Long) {
        // Konvertálás adatbázis formátumból tizedes fokokká
        const latDecimal = databaseCoordToDecimal(Lat);
        const longDecimal = databaseCoordToDecimal(Long);

        if (latDecimal !== null && longDecimal !== null) {
          const popup = new Popup({ offset: 25 }).setHTML(
            `<h3>${Name}</h3>`
          );

          // SVG háromszög marker zöld körvonallal és fehér kitöltéssel
          const markerElement = document.createElement('div');
          markerElement.style.width = '20px';
          markerElement.style.height = '20px';
          markerElement.style.cursor = 'pointer';
          markerElement.style.position = 'absolute';
          markerElement.style.transform = 'translate(-50%, -50%)';
          
          // SVG elem létrehozása
          markerElement.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,2 2,18 18,18" fill="white" stroke="green" stroke-width="2" />
            </svg>
          `;

          const marker = new Marker({ element: markerElement, anchor: 'center' })
            .setLngLat([longDecimal, latDecimal])
            .setPopup(popup)
            .addTo(map.current);

          markers.current[Name] = { marker, element: markerElement };
        }
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [intPoints]);

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
        <div className="relative w-full h-[800px] rounded-lg shadow">
          <div
            ref={mapContainer}
            className="w-full h-full"
          ></div>
          <div className="absolute bottom-4 left-4 bg-white p-2 rounded-lg shadow z-10">
            <p className="text-lg font-bold text-red-600">
              Hibák: {errorCount}
            </p>
          </div>
          <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow z-10">
            <p className="text-lg font-bold text-blue-600">
              {currentQuestionIndex}/{intPoints.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}