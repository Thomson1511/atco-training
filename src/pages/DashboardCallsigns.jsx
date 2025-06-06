import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DashboardCallsigns() {
  const [callsigns, setCallsigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newIcaoCode, setNewIcaoCode] = useState('');
  const [newCallsign, setNewCallsign] = useState('');
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editIcaoCode, setEditIcaoCode] = useState('');
  const [editCallsign, setEditCallsign] = useState('');

  // Felhasználói szerepkör és callsign lista lekérése
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

        // Callsign lista lekérése
        const q = query(collection(db, 'Callsigns'), orderBy('Callsign', 'asc'));
        const querySnapshot = await getDocs(q);
        const callsignList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCallsigns(callsignList);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Új callsign mentése
  const handleAddCallsign = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedIcaoCode = newIcaoCode.trim().toUpperCase();
    if (trimmedIcaoCode.length !== 3) {
      setError('ICAO Code must be exactly 3 characters.');
      return;
    }
    if (!newCallsign.trim()) {
      setError('Callsign is required.');
      return;
    }
    if (!isSupervisor) {
      setError('Only Supervisors can add callsigns.');
      return;
    }

    try {
      const newDoc = await addDoc(collection(db, 'Callsigns'), {
        'ICAO Code': trimmedIcaoCode,
        Callsign: newCallsign.trim(),
      });

      // Lista frissítése
      setCallsigns(prev => {
        const updatedList = [
          ...prev,
          {
            id: newDoc.id,
            'ICAO Code': trimmedIcaoCode,
            Callsign: newCallsign.trim(),
          },
        ].sort((a, b) => a.Callsign.localeCompare(b.Callsign));
        return updatedList;
      });

      // Input mezők törlése
      setNewIcaoCode('');
      setNewCallsign('');
      setError(null);
    } catch (err) {
      setError('Failed to add callsign: ' + err.message);
    }
  };

  // Callsign szerkesztésének kezdete
  const handleEdit = (callsign) => {
    if (!isSupervisor) {
      setError('Only Supervisors can edit callsigns.');
      return;
    }
    setEditingId(callsign.id);
    setEditIcaoCode(callsign['ICAO Code']);
    setEditCallsign(callsign.Callsign);
  };

  // Callsign szerkesztésének mentése
  const handleUpdate = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedIcaoCode = editIcaoCode.trim().toUpperCase();
    if (trimmedIcaoCode.length !== 3) {
      setError('ICAO Code must be exactly 3 characters.');
      return;
    }
    if (!editCallsign.trim()) {
      setError('Callsign is required.');
      return;
    }

    try {
      const docRef = doc(db, 'Callsigns', editingId);
      await updateDoc(docRef, {
        'ICAO Code': trimmedIcaoCode,
        Callsign: editCallsign.trim(),
      });

      // Lista frissítése
      setCallsigns(prev => {
        const updatedList = prev
          .map(item =>
            item.id === editingId
              ? { ...item, 'ICAO Code': trimmedIcaoCode, Callsign: editCallsign.trim() }
              : item
          )
          .sort((a, b) => a.Callsign.localeCompare(b.Callsign));
        return updatedList;
      });

      // Szerkesztés befejezése
      setEditingId(null);
      setEditIcaoCode('');
      setEditCallsign('');
      setError(null);
    } catch (err) {
      setError('Failed to update callsign: ' + err.message);
    }
  };

  // Callsign törlése
  const handleDelete = async (id) => {
    if (!isSupervisor) {
      setError('Only Supervisors can delete callsigns.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'Callsigns', id));
      setCallsigns(prev => prev.filter(item => item.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete callsign: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Callsigns</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Callsigns</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Dashboard Callsigns</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-100">
              <th className="py-2 px-3 border-b text-left">ID</th>
              <th className="py-2 px-3 border-b text-left">ICAO Code</th>
              <th className="py-2 px-3 border-b text-left">Callsign</th>
              <th className="py-2 px-3 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {callsigns.map((callsign, index) => (
              <tr key={callsign.id} className="hover:bg-gray-50">
                <td className="py-2 px-3 border-b">{index + 1}</td>
                <td className="py-2 px-3 border-b">
                  {editingId === callsign.id ? (
                    <input
                      type="text"
                      value={editIcaoCode}
                      onChange={(e) => setEditIcaoCode(e.target.value)}
                      onKeyDown={handleUpdate}
                      maxLength={3}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    callsign['ICAO Code']
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === callsign.id ? (
                    <input
                      type="text"
                      value={editCallsign}
                      onChange={(e) => setEditCallsign(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    callsign.Callsign
                  )}
                </td>
                <td className="py-2 px-3 border-b flex space-x-2">
                  {isSupervisor && (
                    <>
                      <button
                        onClick={() => handleEdit(callsign)}
                        title="Edit"
                        className="text-yellow-500 hover:text-yellow-700 mr-2"
                        disabled={editingId !== null}
                      >
                        <FontAwesomeIcon icon={faPencilAlt} />
                      </button>
                      <button
                        onClick={() => handleDelete(callsign.id)}
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
            {/* Üres sor új callsign hozzáadásához */}
            <tr>
              <td className="py-2 px-3 border-b">{callsigns.length + 1}</td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newIcaoCode}
                  onChange={(e) => setNewIcaoCode(e.target.value)}
                  onKeyDown={handleAddCallsign}
                  placeholder="Enter ICAO Code"
                  maxLength={3}
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newCallsign}
                  onChange={(e) => setNewCallsign(e.target.value)}
                  onKeyDown={handleAddCallsign}
                  placeholder="Enter Callsign"
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