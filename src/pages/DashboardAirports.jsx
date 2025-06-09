import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DashboardAirports() {
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newIcaoCode, setNewIcaoCode] = useState('');
  const [newAirport, setNewAirport] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLong, setNewLong] = useState('');
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editIcaoCode, setEditIcaoCode] = useState('');
  const [editAirport, setEditAirport] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLong, setEditLong] = useState('');

  // Felhasználói szerepkör és repterek lista lekérése
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Szerepkör ellenőrzése
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setIsSupervisor(userDoc.data().role === 'Supervisor');
          }
        }

        // Repterek lista lekérése
        const q = query(collection(db, 'Airports'), orderBy('Airport', 'asc'));
        const querySnapshot = await getDocs(q);
        const airportList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAirports(airportList);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Új reptér mentése
  const handleAddAirport = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedIcaoCode = newIcaoCode.trim().toUpperCase();
    if (trimmedIcaoCode.length !== 4) {
      setError('ICAO Code must be exactly 4 characters.');
      return;
    }
    if (!newAirport.trim()) {
      setError('Airport name is required.');
      return;
    }
    if (!newLat.trim() || isNaN(parseFloat(newLat))) {
      setError('Valid latitude is required.');
      return;
    }
    if (!newLong.trim() || isNaN(parseFloat(newLong))) {
      setError('Valid longitude is required.');
      return;
    }
    if (!isSupervisor) {
      setError('Only Supervisors can add airports.');
      return;
    }

    try {
      const newDoc = await addDoc(collection(db, 'Airports'), {
        'ICAO Code': trimmedIcaoCode,
        Airport: newAirport.trim(),
        Lat: parseFloat(newLat),
        Long: parseFloat(newLong),
      });

      // Lista frissítése
      setAirports(prev => {
        const updatedList = [
          ...prev,
          {
            id: newDoc.id,
            'ICAO Code': trimmedIcaoCode,
            Airport: newAirport.trim(),
            Lat: parseFloat(newLat),
            Long: parseFloat(newLong),
          },
        ].sort((a, b) => a.Airport.localeCompare(b.Airport));
        return updatedList;
      });

      // Input mezők törlése
      setNewIcaoCode('');
      setNewAirport('');
      setNewLat('');
      setNewLong('');
      setError(null);
    } catch (err) {
      setError('Failed to add airport: ' + err.message);
    }
  };

  // Reptér szerkesztésének kezdete
  const handleEdit = (airport) => {
    if (!isSupervisor) {
      setError('Only Supervisors can edit airports.');
      return;
    }
    setEditingId(airport.id);
    setEditIcaoCode(airport['ICAO Code']);
    setEditAirport(airport.Airport);
    setEditLat(airport.Lat.toString());
    setEditLong(airport.Long.toString());
  };

  // Reptér szerkesztésének mentése
  const handleUpdate = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedIcaoCode = editIcaoCode.trim().toUpperCase();
    if (trimmedIcaoCode.length !== 4) {
      setError('ICAO Code must be exactly 4 characters.');
      return;
    }
    if (!editAirport.trim()) {
      setError('Airport name is required.');
      return;
    }
    if (!editLat.trim() || isNaN(parseFloat(editLat))) {
      setError('Valid latitude is required.');
      return;
    }
    if (!editLong.trim() || isNaN(parseFloat(editLong))) {
      setError('Valid longitude is required.');
      return;
    }

    try {
      const docRef = doc(db, 'Airports', editingId);
      await updateDoc(docRef, {
        'ICAO Code': trimmedIcaoCode,
        Airport: editAirport.trim(),
        Lat: parseFloat(editLat),
        Long: parseFloat(editLong),
      });

      // Lista frissítése
      setAirports(prev => {
        const updatedList = prev
          .map(item =>
            item.id === editingId
              ? {
                  ...item,
                  'ICAO Code': trimmedIcaoCode,
                  Airport: editAirport.trim(),
                  Lat: parseFloat(editLat),
                  Long: parseFloat(editLong),
                }
              : item
          )
          .sort((a, b) => a.Airport.localeCompare(b.Airport));
        return updatedList;
      });

      // Szerkesztés befejezése
      setEditingId(null);
      setEditIcaoCode('');
      setEditAirport('');
      setEditLat('');
      setEditLong('');
      setError(null);
    } catch (err) {
      setError('Failed to update airport: ' + err.message);
    }
  };

  // Reptér törlése
  const handleDelete = async (id) => {
    if (!isSupervisor) {
      setError('Only Supervisors can delete airports.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'Airports', id));
      setAirports(prev => prev.filter(item => item.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete airport: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Airports</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Airports</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Dashboard Airports</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-100">
              <th className="py-2 px-3 border-b text-left">ID</th>
              <th className="py-2 px-3 border-b text-left">ICAO Code</th>
              <th className="py-2 px-3 border-b text-left">Airport</th>
              <th className="py-2 px-3 border-b text-left">Latitude</th>
              <th className="py-2 px-3 border-b text-left">Longitude</th>
              <th className="py-2 px-3 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {airports.map((airport, index) => (
              <tr key={airport.id} className="hover:bg-gray-50">
                <td className="py-2 px-3 border-b">{index + 1}</td>
                <td className="py-2 px-3 border-b">
                  {editingId === airport.id ? (
                    <input
                      type="text"
                      value={editIcaoCode}
                      onChange={(e) => setEditIcaoCode(e.target.value)}
                      onKeyDown={handleUpdate}
                      maxLength={4}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    airport['ICAO Code']
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === airport.id ? (
                    <input
                      type="text"
                      value={editAirport}
                      onChange={(e) => setEditAirport(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    airport.Airport
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === airport.id ? (
                    <input
                      type="text"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    airport.Lat
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === airport.id ? (
                    <input
                      type="text"
                      value={editLong}
                      onChange={(e) => setEditLong(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    airport.Long
                  )}
                </td>
                <td className="py-2 px-3 border-b flex space-x-2">
                  {isSupervisor && (
                    <>
                      <button
                        onClick={() => handleEdit(airport)}
                        title="Edit"
                        className="text-yellow-500 hover:text-yellow-700 mr-2"
                        disabled={editingId !== null}
                      >
                        <FontAwesomeIcon icon={faPencilAlt} />
                      </button>
                      <button
                        onClick={() => handleDelete(airport.id)}
                        title="Delete"
                        className="text-red-500 hover:text-red-700"
                        disabled={editingId !== null}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {/* Üres sor új reptér hozzáadásához */}
            <tr>
              <td className="py-2 px-3 border-b">{airports.length + 1}</td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newIcaoCode}
                  onChange={(e) => setNewIcaoCode(e.target.value)}
                  onKeyDown={handleAddAirport}
                  placeholder="Enter ICAO Code"
                  maxLength={4}
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newAirport}
                  onChange={(e) => setNewAirport(e.target.value)}
                  onKeyDown={handleAddAirport}
                  placeholder="Enter Airport Name"
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newLat}
                  onChange={(e) => setNewLat(e.target.value)}
                  onKeyDown={handleAddAirport}
                  placeholder="Enter Latitude"
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newLong}
                  onChange={(e) => setNewLong(e.target.value)}
                  onKeyDown={handleAddAirport}
                  placeholder="Enter Longitude"
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b"></td>
            </tr>
          </tbody>
        </table>
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}