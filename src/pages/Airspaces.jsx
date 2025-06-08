import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Map, Popup, Marker, config } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

export default function Airports() {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);

  // MapTiler API kulcs
  const mapTilerKey = 'Tx0tJslnlndsHe3hs95w';

  // Repülőterek lekérése Firestore-ból
  useEffect(() => {
    const fetchAirports = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Airports'));
        const airportList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAirports(airportList);
        setLoading(false);
      } catch (err) {
        setError('Nem sikerült betölteni a repülőtereket: ' + err.message);
        setLoading(false);
      }
    };
    fetchAirports();
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

        new Marker({ element: markerElement })
          .setLngLat([parseFloat(Long), parseFloat(Lat)])
          .setPopup(popup)
          .addTo(map.current);
      }
    });

    // Térkép eltávolítása komponens leszerelésekor
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [airports]);

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
    <div className="container mx-auto p-4">
      <div
        ref={mapContainer}
        className="w-full h-[800px] rounded-lg shadow"
      ></div>
    </div>
  );
}