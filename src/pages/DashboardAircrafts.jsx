import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DashboardAircrafts() {
  const [aircrafts, setAircrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newIcaoCode, setNewIcaoCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newWTC, setNewWTC] = useState('');
  const [newMaxLevel, setNewMaxLevel] = useState('');
  const [newCruisingSpeed, setNewCruisingSpeed] = useState('');
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editIcaoCode, setEditIcaoCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editWTC, setEditWTC] = useState('');
  const [editMaxLevel, setEditMaxLevel] = useState('');
  const [editCruisingSpeed, setEditCruisingSpeed] = useState('');

  // Felhasználói szerepkör és aircraft lista lekérése
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

        // Aircraft lista lekérése
        const q = query(collection(db, 'Aircrafts'), orderBy('ICAO Code', 'asc'));
        const querySnapshot = await getDocs(q);
        const aircraftList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAircrafts(aircraftList);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Új aircraft mentése
  const handleAddAircraft = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedIcaoCode = newIcaoCode.trim().toUpperCase();
    if (trimmedIcaoCode.length !== 3 && trimmedIcaoCode.length !== 4) {
      setError('ICAO Code must be 3 or 4 characters.');
      return;
    }
    if (!newName.trim()) {
      setError('Name is required.');
      return;
    }
    if (!['L', 'M', 'H', 'J'].includes(newWTC.trim().toUpperCase())) {
      setError('WTC must be L, M, H, or J.');
      return;
    }
    if (!newMaxLevel.trim()) {
      setError('Max Level is required.');
      return;
    }
    if (!newCruisingSpeed.trim()) {
      setError('Cruising Speed is required.');
      return;
    }
    if (!isSupervisor) {
      setError('Only Supervisors can add aircrafts.');
      return;
    }

    try {
      const newDoc = await addDoc(collection(db, 'Aircrafts'), {
        'ICAO Code': trimmedIcaoCode,
        Name: newName.trim(),
        WTC: newWTC.trim().toUpperCase(),
        'Max Level': newMaxLevel.trim(),
        'Cruising Speed': newCruisingSpeed.trim(),
      });

      // Lista frissítése
      setAircrafts(prev => {
        const updatedList = [
          ...prev,
          {
            id: newDoc.id,
            'ICAO Code': trimmedIcaoCode,
            Name: newName.trim(),
            WTC: newWTC.trim().toUpperCase(),
            'Max Level': newMaxLevel.trim(),
            'Cruising Speed': newCruisingSpeed.trim(),
          },
        ].sort((a, b) => a.Name.localeCompare(b.Name));
        return updatedList;
      });

      // Input mezők törlése
      setNewIcaoCode('');
      setNewName('');
      setNewWTC('');
      setNewMaxLevel('');
      setNewCruisingSpeed('');
      setError(null);
    } catch (err) {
      setError('Failed to add aircraft: ' + err.message);
    }
  };

  // Aircraft szerkesztésének kezdete
  const handleEdit = (aircraft) => {
    if (!isSupervisor) {
      setError('Only Supervisors can edit aircrafts.');
      return;
    }
    setEditingId(aircraft.id);
    setEditIcaoCode(aircraft['ICAO Code']);
    setEditName(aircraft.Name);
    setEditWTC(aircraft.WTC);
    setEditMaxLevel(aircraft['Max Level']);
    setEditCruisingSpeed(aircraft['Cruising Speed']);
  };

  // Aircraft szerkesztésének mentése
  const handleUpdate = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedIcaoCode = editIcaoCode.trim().toUpperCase();
    if (trimmedIcaoCode.length !== 3 && trimmedIcaoCode.length !== 4) {
      setError('ICAO Code must be 3 or 4 characters.');
      return;
    }
    if (!editName.trim()) {
      setError('Name is required.');
      return;
    }
    if (!['L', 'M', 'H', 'J'].includes(editWTC.trim().toUpperCase())) {
      setError('WTC must be L, M, H, or J.');
      return;
    }
    if (!editMaxLevel.trim()) {
      setError('Max Level is required.');
      return;
    }
    if (!editCruisingSpeed.trim()) {
      setError('Cruising Speed is required.');
      return;
    }

    try {
      const docRef = doc(db, 'Aircrafts', editingId);
      await updateDoc(docRef, {
        'ICAO Code': trimmedIcaoCode,
        Name: editName.trim(),
        WTC: editWTC.trim().toUpperCase(),
        'Max Level': editMaxLevel.trim(),
        'Cruising Speed': editCruisingSpeed.trim(),
      });

      // Lista frissítése
      setAircrafts(prev => {
        const updatedList = prev
          .map(item =>
            item.id === editingId
              ? {
                  ...item,
                  'ICAO Code': trimmedIcaoCode,
                  Name: editName.trim(),
                  WTC: editWTC.trim().toUpperCase(),
                  'Max Level': editMaxLevel.trim(),
                  'Cruising Speed': editCruisingSpeed.trim(),
                }
              : item
          )
          .sort((a, b) => a.Name.localeCompare(b.Name));
        return updatedList;
      });

      // Szerkesztés befejezése
      setEditingId(null);
      setEditIcaoCode('');
      setEditName('');
      setEditWTC('');
      setEditMaxLevel('');
      setEditCruisingSpeed('');
      setError(null);
    } catch (err) {
      setError('Failed to update aircraft: ' + err.message);
    }
  };

  // Aircraft törlése
  const handleDelete = async (id) => {
    if (!isSupervisor) {
      setError('Only Supervisors can delete aircrafts.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'Aircrafts', id));
      setAircrafts(prev => prev.filter(item => item.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete aircraft: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Aircrafts</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Aircrafts</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Dashboard Aircrafts</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-100">
              <th className="py-2 px-3 border-b text-left">ID</th>
              <th className="py-2 px-3 border-b text-left">ICAO Code</th>
              <th className="py-2 px-3 border-b text-left">Name</th>
              <th className="py-2 px-3 border-b text-left">WTC</th>
              <th className="py-2 px-3 border-b text-left">Max Level</th>
              <th className="py-2 px-3 border-b text-left">Cruising Speed</th>
              <th className="py-2 px-3 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {aircrafts.map((aircraft, index) => (
              <tr key={aircraft.id} className="hover:bg-gray-50">
                <td className="py-2 px-3 border-b">{index + 1}</td>
                <td className="py-2 px-3 border-b">
                  {editingId === aircraft.id ? (
                    <input
                      type="text"
                      value={editIcaoCode}
                      onChange={(e) => setEditIcaoCode(e.target.value)}
                      onKeyDown={handleUpdate}
                      maxLength={4}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    aircraft['ICAO Code']
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === aircraft.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    aircraft.Name
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === aircraft.id ? (
                    <select
                      value={editWTC}
                      onChange={(e) => setEditWTC(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    >
                      <option value="" disabled>Select WTC</option>
                      <option value="L">L</option>
                      <option value="M">M</option>
                      <option value="H">H</option>
                      <option value="J">J</option>
                    </select>
                  ) : (
                    aircraft.WTC
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === aircraft.id ? (
                    <input
                      type="text"
                      value={editMaxLevel}
                      onChange={(e) => setEditMaxLevel(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    aircraft['Max Level']
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === aircraft.id ? (
                    <input
                      type="text"
                      value={editCruisingSpeed}
                      onChange={(e) => setEditCruisingSpeed(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    aircraft['Cruising Speed']
                  )}
                </td>
                <td className="py-2 px-3 border-b flex space-x-2">
                  {isSupervisor && (
                    <>
                      <button
                        onClick={() => handleEdit(aircraft)}
                        title="Edit"
                        className="text-yellow-500 hover:text-yellow-700 mr-2"
                        disabled={editingId !== null}
                      >
                        <FontAwesomeIcon icon={faPencilAlt} />
                      </button>
                      <button
                        onClick={() => handleDelete(aircraft.id)}
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
            {/* Üres sor új aircraft hozzáadásához */}
            <tr>
              <td className="py-2 px-3 border-b">{aircrafts.length + 1}</td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newIcaoCode}
                  onChange={(e) => setNewIcaoCode(e.target.value)}
                  onKeyDown={handleAddAircraft}
                  placeholder="Enter ICAO Code"
                  maxLength={4}
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleAddAircraft}
                  placeholder="Enter Name"
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <select
                  value={newWTC}
                  onChange={(e) => setNewWTC(e.target.value)}
                  onKeyDown={handleAddAircraft}
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                >
                  <option value="" disabled>Select WTC</option>
                  <option value="L">L</option>
                  <option value="M">M</option>
                  <option value="H">H</option>
                  <option value="J">J</option>
                </select>
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newMaxLevel}
                  onChange={(e) => setNewMaxLevel(e.target.value)}
                  onKeyDown={handleAddAircraft}
                  placeholder="Enter Max Level"
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newCruisingSpeed}
                  onChange={(e) => setNewCruisingSpeed(e.target.value)}
                  onKeyDown={handleAddAircraft}
                  placeholder="Enter Cruising Speed"
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