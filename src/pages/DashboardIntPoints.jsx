import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, query, orderBy, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DashboardIntPoints() {
  const [intPoints, setIntPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [newLat, setNewLat] = useState('');
  const [newLong, setNewLong] = useState('');
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLong, setEditLong] = useState('');

  // Felhasználói szerepkör és IntPoints lista lekérése
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

        // IntPoints lista lekérése
        const q = query(collection(db, 'IntPoints'), orderBy('Name', 'asc'));
        const querySnapshot = await getDocs(q);
        const intPointsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setIntPoints(intPointsList);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Új IntPoint mentése
  const handleAddIntPoint = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedName = newName.trim().toUpperCase();
    const latValue = parseFloat(newLat);
    const longValue = parseFloat(newLong);

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (isNaN(latValue) || latValue < -90 || latValue > 90) {
      setError('Latitude must be a number between -90 and 90.');
      return;
    }
    if (isNaN(longValue) || longValue < -180 || longValue > 180) {
      setError('Longitude must be a number between -180 and 180.');
      return;
    }
    if (!isSupervisor) {
      setError('Only Supervisors can add internal points.');
      return;
    }

    try {
      const newDoc = await addDoc(collection(db, 'IntPoints'), {
        Name: trimmedName,
        Lat: latValue,
        Long: longValue,
      });

      // Lista frissítése
      setIntPoints(prev => {
        const updatedList = [
          ...prev,
          {
            id: newDoc.id,
            Name: trimmedName,
            Lat: latValue,
            Long: longValue,
          },
        ].sort((a, b) => a.Name.localeCompare(b.Name));
        return updatedList;
      });

      // Input mezők törlése
      setNewName('');
      setNewLat('');
      setNewLong('');
      setError(null);
    } catch (err) {
      setError('Failed to add internal point: ' + err.message);
    }
  };

  // IntPoint szerkesztésének kezdete
  const handleEdit = (intPoint) => {
    if (!isSupervisor) {
      setError('Only Supervisors can edit internal points.');
      return;
    }
    setEditingId(intPoint.id);
    setEditName(intPoint.Name);
    setEditLat(intPoint.Lat.toString());
    setEditLong(intPoint.Long.toString());
  };

  // IntPoint szerkesztésének mentése
  const handleUpdate = async (e) => {
    if (e.key !== 'Enter') return;

    const trimmedName = editName.trim().toUpperCase();
    const latValue = parseFloat(editLat);
    const longValue = parseFloat(editLong);

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (isNaN(latValue) || latValue < -90 || latValue > 90) {
      setError('Latitude must be a number between -90 and 90.');
      return;
    }
    if (isNaN(longValue) || longValue < -180 || longValue > 180) {
      setError('Longitude must be a number between -180 and 180.');
      return;
    }

    try {
      const docRef = doc(db, 'IntPoints', editingId);
      await updateDoc(docRef, {
        Name: trimmedName,
        Lat: latValue,
        Long: longValue,
      });

      // Lista frissítése
      setIntPoints(prev => {
        const updatedList = prev
          .map(item =>
            item.id === editingId
              ? { ...item, Name: trimmedName, Lat: latValue, Long: longValue }
              : item
          )
          .sort((a, b) => a.Name.localeCompare(b.Name));
        return updatedList;
      });

      // Szerkesztés befejezése
      setEditingId(null);
      setEditName('');
      setEditLat('');
      setEditLong('');
      setError(null);
    } catch (err) {
      setError('Failed to update internal point: ' + err.message);
    }
  };

  // IntPoint törlése
  const handleDelete = async (id) => {
    if (!isSupervisor) {
      setError('Only Supervisors can delete internal points.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'IntPoints', id));
      setIntPoints(prev => prev.filter(item => item.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete internal point: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Internal Points</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h2 className="text-2xl font-bold mb-4">Dashboard Internal Points</h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Dashboard Internal Points</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-blue-100">
              <th className="py-2 px-3 border-b text-left">ID</th>
              <th className="py-2 px-3 border-b text-left">Name</th>
              <th className="py-2 px-3 border-b text-left">Latitude</th>
              <th className="py-2 px-3 border-b text-left">Longitude</th>
              <th className="py-2 px-3 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {intPoints.map((intPoint, index) => (
              <tr key={intPoint.id} className="hover:bg-gray-50">
                <td className="py-2 px-3 border-b">{index + 1}</td>
                <td className="py-2 px-3 border-b">
                  {editingId === intPoint.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    intPoint.Name
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === intPoint.id ? (
                    <input
                      type="text"
                      value={editLat}
                      onChange={(e) => setEditLat(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    intPoint.Lat
                  )}
                </td>
                <td className="py-2 px-3 border-b">
                  {editingId === intPoint.id ? (
                    <input
                      type="text"
                      value={editLong}
                      onChange={(e) => setEditLong(e.target.value)}
                      onKeyDown={handleUpdate}
                      className="w-full p-2 border rounded"
                    />
                  ) : (
                    intPoint.Long
                  )}
                </td>
                <td className="py-2 px-3 border-b flex space-x-2">
                  {isSupervisor && (
                    <>
                      <button
                        onClick={() => handleEdit(intPoint)}
                        title="Edit"
                        className="text-yellow-500 hover:text-yellow-700 mr-2"
                        disabled={editingId !== null}
                      >
                        <FontAwesomeIcon icon={faPencilAlt} />
                      </button>
                      <button
                        onClick={() => handleDelete(intPoint.id)}
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
            {/* Üres sor új IntPoint hozzáadásához */}
            <tr>
              <td className="py-2 px-3 border-b">{intPoints.length + 1}</td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleAddIntPoint}
                  placeholder="Enter Name"
                  className="w-full p-2 border rounded"
                  disabled={!isSupervisor || editingId !== null}
                />
              </td>
              <td className="py-2 px-3 border-b">
                <input
                  type="text"
                  value={newLat}
                  onChange={(e) => setNewLat(e.target.value)}
                  onKeyDown={handleAddIntPoint}
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
                  onKeyDown={handleAddIntPoint}
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