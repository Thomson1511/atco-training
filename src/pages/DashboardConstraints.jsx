// src/pages/DashboardConstraints.jsx
import { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPencilAlt, faTrash } from '@fortawesome/free-solid-svg-icons';

export default function DashboardConstraints() {
  const [constraints, setConstraints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSupervisor, setIsSupervisor] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const [newData, setNewData] = useState({
    From: '', Via: '', To: '', Departure: false, Airports: '',
    Condition: '', MainFL: '', ConditionReach: '', ReachFL: '',
    ReleasedTurn: false, ReleasedDesc: false, ReleasedClb: false, ReleasedFL: '',
    SpecOne: '', SpecTwo: '', SpecFL: '', OddRFL: false, Summer: false, SoftFLAS: false, Group: ''
  });

    // From és To legördülő lista opciói
    const locationOptions = [
      "Budapest", "Bratislava", "Beograd", "Bucarest", "Zagreb",
      "Wien", "Ljubljana", "Lviv", "ACC", "APP"
    ];

      // Condition legördülő lista mapping
    const conditionOptions = [
      { display: "Level", value: "Level" },
      { display: "Climb", value: "CLB" },
      { display: "Descent", value: "DESC" },
      { display: "AR", value: "AR" },
    ];

    // ConditionReach legördülő lista
    const conditionReachOptions = [
      { display: "Above", value: "Above" },
      { display: "Below", value: "Below" },
    ];

      // SpecOne legördülő lista
    const specOneOptions = [
      { display: "Summer", value: "Summer" },
      { display: "TRA", value: "TRA" },
      { display: "Via", value: "Via" },
    ];

    // SpecTwo legördülő lista
    const specTwoOptions = [
      { display: "Level", value: "At" },
      { display: "Different", value: "Different" },
    ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setIsSupervisor(userDoc.data().role === 'Supervisor');
          }
        }

        const q = query(collection(db, 'Constraints'), orderBy('From', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const constraintsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setConstraints(constraintsList);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch constraints: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

    // Új constraint hozzáadása
    const handleAddConstraint = async (e) => {
      if (e.key !== 'Enter') return;
      if (!isSupervisor) return;
  
      try {
        const airportsArray = newData.Airports 
        ? newData.Airports.split(',')
            .map(a => a.trim().toUpperCase())
            .filter(a => a.length > 0)
        : [];

      const finalData = {
        ...newData,
        Airports: airportsArray,
        MainFL: Number(newData.MainFL) || 0,
        ReachFL: Number(newData.ReachFL) || 0,
        ReleasedFL: Number(newData.ReleasedFL) || 0,
        SpecFL: Number(newData.SpecFL) || 0,
        Departure: Boolean(newData.Departure),
        SoftFLAS: Boolean(newData.SoftFLAS),
        ConditionReach: newData.ConditionReach || 'Nothing',
        SpecOne: newData.SpecOne || 'nothing',
        SpecTwo: newData.SpecTwo || 'nothing',
      };
  
        const docRef = await addDoc(collection(db, 'Constraints'), finalData);
  
        setConstraints(prev => [...prev, { id: docRef.id, ...finalData }]
          .sort((a, b) => a.From.localeCompare(b.From)));
  
        // Reset űrlap
        setNewData({
          From: '', Via: '', To: '', Departure: false, Airports: '',
          Condition: '', MainFL: '', ConditionReach: '', ReachFL: '',
          ReleasedTurn: false, ReleasedDesc: false, ReleasedClb: false, ReleasedFL: '',
          SpecOne: '', SpecTwo: '', SpecFL: '', OddRFL: false, Summer: false, SoftFLAS: false, Group: ''
        });
  
        setError(null);
      } catch (err) {
        setError('Failed to add constraint: ' + err.message);
      }
    };
  
    // Constraint szerkesztésének mentése
    const handleUpdate = async (e) => {
      if (e.key !== 'Enter') return;
      if (!isSupervisor) return;
  
      try {
        const airportsArray = typeof editData.Airports === 'string' 
        ? editData.Airports.split(',')
            .map(a => a.trim().toUpperCase())
            .filter(a => a.length > 0)
        : (Array.isArray(editData.Airports) ? editData.Airports.map(a => a.toUpperCase()) : []);

      const finalData = {
        ...editData,
        Airports: airportsArray,
        MainFL: Number(editData.MainFL) || 0,
        ReachFL: Number(editData.ReachFL) || 0,
        ReleasedFL: Number(editData.ReleasedFL) || 0,
        SpecFL: Number(editData.SpecFL) || 0,
        Departure: Boolean(editData.Departure),
        SoftFLAS: Boolean(editData.SoftFLAS),
        ConditionReach: editData.ConditionReach || 'Nothing',
        SpecOne: editData.SpecOne || 'nothing',
        SpecTwo: editData.SpecTwo || 'nothing',
      };
  
        const docRef = doc(db, 'Constraints', editingId);
        await updateDoc(docRef, finalData);
  
        setConstraints(prev => prev.map(item => 
          item.id === editingId ? { ...item, ...finalData } : item
        ).sort((a, b) => a.From.localeCompare(b.From)));
  
        setEditingId(null);
        setEditData({});
        setError(null);
      } catch (err) {
        setError('Failed to update constraint: ' + err.message);
      }
    };

  const handleEdit = (constraint) => {
    if (!isSupervisor) return;
    setEditingId(constraint.id);
    setEditData({ ...constraint });
  };

  

  const handleDelete = async (id) => {
    if (!isSupervisor) return;
    if (!window.confirm('Biztosan törölni szeretnéd ezt a constraint-et?')) return;

    try {
      await deleteDoc(doc(db, 'Constraints', id));
      setConstraints(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError('Failed to delete constraint: ' + err.message);
    }
  };

  if (loading) return <div className="container mx-auto p-4"><h2 className="text-2xl font-bold">Dashboard Constraints</h2><p>Loading...</p></div>;
  if (error) return <div className="container mx-auto p-4"><h2 className="text-2xl font-bold">Dashboard Constraints</h2><p className="text-red-600">{error}</p></div>;

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Dashboard Constraints</h2>

      <div className="w-full">
        <table className="min-w-full bg-white border border-gray-200 text-sm">
          <thead>
            <tr className="bg-blue-100">
              <th className="py-3 px-3 border-b text-left min-w-[100px]">From</th>
              <th className="py-3 px-3 border-b text-left">Via</th>
              <th className="py-3 px-3 border-b text-left min-w-[100px]">To</th>
              <th className="py-3 px-3 border-b text-left">Departure</th>
              <th className="py-3 px-3 border-b text-left">Airports</th>
              <th className="py-3 px-3 border-b text-left min-w-[100px]">Condition</th>
              <th className="py-3 px-3 border-b text-left">MainFL</th>
              <th className="py-3 px-3 border-b text-left">ConditionReach</th>
              <th className="py-3 px-3 border-b text-left">ReachFL</th>
              <th className="py-3 px-3 border-b text-left">Released Turn</th>
              <th className="py-3 px-3 border-b text-left">Released Desc</th>
              <th className="py-3 px-3 border-b text-left">Released Clb</th>
              <th className="py-3 px-3 border-b text-left">Released FL</th>
              <th className="py-3 px-3 border-b text-left min-w-[100px]">SpecOne</th>
              <th className="py-3 px-3 border-b text-left min-w-[100px]">SpecTwo</th>
              <th className="py-3 px-3 border-b text-left">SpecFL</th>
              <th className="py-3 px-3 border-b text-left">Odd RFL</th>
              <th className="py-3 px-3 border-b text-left">Summer</th>
              <th className="py-3 px-3 border-b text-left">Soft FLAS</th>
              <th className="py-3 px-3 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {constraints.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 border-b">
                {/* From */}
                <td className="py-2 px-2">
                  {editingId === item.id ? (
                    <select 
                      value={editData.From || ''} 
                      onChange={e => setEditData({...editData, From: e.target.value})}
                      onKeyDown={handleUpdate}
                      className="w-full p-1 border rounded bg-white"
                    >
                      <option value="">Válassz...</option>
                      {locationOptions.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  ) : item.From}
                </td>
                <td className="py-2 px-3">{editingId === item.id ? <input value={editData.Via || ''} onChange={e => setEditData({...editData, Via: e.target.value})} onKeyDown={handleUpdate} className="w-full p-1 border rounded" /> : item.Via}</td>
                {/* To */}
                <td className="py-2 px-2">
                  {editingId === item.id ? (
                    <select 
                      value={editData.To || ''} 
                      onChange={e => setEditData({...editData, To: e.target.value})}
                      onKeyDown={handleUpdate}
                      className="w-full p-1 border rounded bg-white"
                    >
                      <option value="">Válassz...</option>
                      {locationOptions.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  ) : item.To}
                </td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="checkbox" checked={editData.Departure || false} onChange={e => setEditData({...editData, Departure: e.target.checked})} /> : (item.Departure ? 'Yes' : 'No')}</td>
                <td className="py-2 px-3">{editingId === item.id ? <input value={editData.Airports || ''} onChange={e => setEditData({...editData, Airports: e.target.value})} onKeyDown={handleUpdate} className="w-full p-1 border rounded" /> : (Array.isArray(item.Airports) ? item.Airports.join(', ') : item.Airports)}</td>
                {/* Condition */}
                <td className="py-2 px-3">
                  {editingId === item.id ? (
                    <select 
                      value={editData.Condition || ''} 
                      onChange={e => setEditData({...editData, Condition: e.target.value})}
                      onKeyDown={handleUpdate}
                      className="w-full p-1 border rounded bg-white"
                    >
                      <option value="">Válassz...</option>
                      {conditionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.display}</option>
                      ))}
                    </select>
                  ) : item.Condition}
                </td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="number" value={editData.MainFL || ''} onChange={e => setEditData({...editData, MainFL: e.target.value})} onKeyDown={handleUpdate} className="w-full p-1 border rounded text-center" /> : item.MainFL}</td>
                {/* ConditionReach */}
                <td className="py-2 px-3">
                  {editingId === item.id ? (
                    <select 
                      value={editData.ConditionReach || ''} 
                      onChange={e => setEditData({...editData, ConditionReach: e.target.value})}
                      onKeyDown={handleUpdate}
                      className="w-full p-1 border rounded bg-white"
                    >
                      <option value="">Válassz...</option>
                      {conditionReachOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.display}</option>
                      ))}
                    </select>
                  ) : item.ConditionReach}
                </td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="number" value={editData.ReachFL || ''} onChange={e => setEditData({...editData, ReachFL: e.target.value})} onKeyDown={handleUpdate} className="w-full p-1 border rounded text-center" /> : item.ReachFL}</td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="checkbox" checked={editData.ReleasedTurn || false} onChange={e => setEditData({...editData, ReleasedTurn: e.target.checked})} /> : (item.ReleasedTurn ? 'Yes' : 'No')}</td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="checkbox" checked={editData.ReleasedDesc || false} onChange={e => setEditData({...editData, ReleasedDesc: e.target.checked})} /> : (item.ReleasedDesc ? 'Yes' : 'No')}</td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="checkbox" checked={editData.ReleasedClb || false} onChange={e => setEditData({...editData, ReleasedClb: e.target.checked})} /> : (item.ReleasedClb ? 'Yes' : 'No')}</td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="number" value={editData.ReleasedFL || ''} onChange={e => setEditData({...editData, ReleasedFL: e.target.value})} onKeyDown={handleUpdate} className="w-full p-1 border rounded text-center" /> : item.ReleasedFL}</td>
                {/* SpecOne */}
                <td className="py-2 px-3">
                  {editingId === item.id ? (
                    <select 
                      value={editData.SpecOne || ''} 
                      onChange={e => setEditData({...editData, SpecOne: e.target.value})}
                      onKeyDown={handleUpdate}
                      className="w-full p-1 border rounded bg-white"
                    >
                      <option value="">Válassz...</option>
                      {specOneOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.display}</option>
                      ))}
                    </select>
                  ) : item.SpecOne}
                </td>
                {/* SpecTwo */}
                <td className="py-2 px-3">
                  {editingId === item.id ? (
                    <select 
                      value={editData.SpecTwo || ''} 
                      onChange={e => setEditData({...editData, SpecTwo: e.target.value})}
                      onKeyDown={handleUpdate}
                      className="w-full p-1 border rounded bg-white"
                    >
                      <option value="">Válassz...</option>
                      {specTwoOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.display}</option>
                      ))}
                    </select>
                  ) : item.SpecTwo}
                </td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="number" value={editData.SpecFL || ''} onChange={e => setEditData({...editData, SpecFL: e.target.value})} onKeyDown={handleUpdate} className="w-full p-1 border rounded text-center" /> : item.SpecFL}</td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="checkbox" checked={editData.OddRFL || false} onChange={e => setEditData({...editData, OddRFL: e.target.checked})} /> : (item.OddRFL ? 'Yes' : 'No')}</td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="checkbox" checked={editData.Summer || false} onChange={e => setEditData({...editData, Summer: e.target.checked})} /> : (item.Summer ? 'Yes' : 'No')}</td>
                <td className="py-2 px-3 text-center">{editingId === item.id ? <input type="checkbox" checked={editData.SoftFLAS || false} onChange={e => setEditData({...editData, SoftFLAS: e.target.checked})} /> : (item.SoftFLAS ? 'Yes' : 'No')}</td>
                <td className="py-2 px-3 flex space-x-3">
                  {isSupervisor && (
                    <>
                      <button onClick={() => handleEdit(item)} className="text-yellow-600 hover:text-yellow-800">
                        <FontAwesomeIcon icon={faPencilAlt} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {/* Új constraint sor */}
            {isSupervisor && (
              <tr className="bg-gray-50">
                {/* From */}
                <td className="py-2 px-2">
                  <select 
                    value={newData.From} 
                    onChange={e => setNewData({...newData, From: e.target.value})} 
                    onKeyDown={handleAddConstraint}
                    className="w-full p-1 border rounded bg-white"
                  >
                    <option value="">Válassz...</option>
                    {locationOptions.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3"><input value={newData.Via} onChange={e => setNewData({...newData, Via: e.target.value})} onKeyDown={handleAddConstraint} placeholder="Via" className="w-full p-1 border rounded" /></td>
                {/* To */}
                <td className="py-2 px-2">
                  <select 
                    value={newData.To} 
                    onChange={e => setNewData({...newData, To: e.target.value})} 
                    onKeyDown={handleAddConstraint}
                    className="w-full p-1 border rounded bg-white"
                  >
                    <option value="">Válassz...</option>
                    {locationOptions.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3 text-center"><input type="checkbox" checked={newData.Departure} onChange={e => setNewData({...newData, Departure: e.target.checked})} /></td>
                <td className="py-2 px-3"><input value={newData.Airports} onChange={e => setNewData({...newData, Airports: e.target.value})} onKeyDown={handleAddConstraint} placeholder="LHBP, LOWW" className="w-full p-1 border rounded" /></td>
                {/* Condition */}
                <td className="py-2 px-3">
                  <select 
                    value={newData.Condition} 
                    onChange={e => setNewData({...newData, Condition: e.target.value})} 
                    onKeyDown={handleAddConstraint}
                    className="w-full p-1 border rounded bg-white"
                  >
                    <option value="">Válassz...</option>
                    {conditionOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.display}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3"><input type="number" value={newData.MainFL} onChange={e => setNewData({...newData, MainFL: e.target.value})} onKeyDown={handleAddConstraint} className="w-full p-1 border rounded text-center" /></td>
                {/* ConditionReach */}
                <td className="py-2 px-3">
                  <select 
                    value={newData.ConditionReach} 
                    onChange={e => setNewData({...newData, ConditionReach: e.target.value})} 
                    onKeyDown={handleAddConstraint}
                    className="w-full p-1 border rounded bg-white"
                  >
                    <option value="">Válassz...</option>
                    {conditionReachOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.display}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3"><input type="number" value={newData.ReachFL} onChange={e => setNewData({...newData, ReachFL: e.target.value})} onKeyDown={handleAddConstraint} className="w-full p-1 border rounded text-center" /></td>
                <td className="py-2 px-3 text-center"><input type="checkbox" checked={newData.ReleasedTurn} onChange={e => setNewData({...newData, ReleasedTurn: e.target.checked})} /></td>
                <td className="py-2 px-3 text-center"><input type="checkbox" checked={newData.ReleasedDesc} onChange={e => setNewData({...newData, ReleasedDesc: e.target.checked})} /></td>
                <td className="py-2 px-3 text-center"><input type="checkbox" checked={newData.ReleasedClb} onChange={e => setNewData({...newData, ReleasedClb: e.target.checked})} /></td>
                <td className="py-2 px-3"><input type="number" value={newData.ReleasedFL} onChange={e => setNewData({...newData, ReleasedFL: e.target.value})} onKeyDown={handleAddConstraint} className="w-full p-1 border rounded text-center" /></td>
                {/* SpecOne */}
                <td className="py-2 px-3">
                  <select 
                    value={newData.SpecOne} 
                    onChange={e => setNewData({...newData, SpecOne: e.target.value})} 
                    onKeyDown={handleAddConstraint}
                    className="w-full p-1 border rounded bg-white"
                  >
                    <option value="">Válassz...</option>
                    {specOneOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.display}</option>
                    ))}
                  </select>
                </td>
                {/* SpecTwo */}
                <td className="py-2 px-3">
                  <select 
                    value={newData.SpecTwo} 
                    onChange={e => setNewData({...newData, SpecTwo: e.target.value})} 
                    onKeyDown={handleAddConstraint}
                    className="w-full p-1 border rounded bg-white"
                  >
                    <option value="">Válassz...</option>
                    {specTwoOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.display}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 px-3"><input type="number" value={newData.SpecFL} onChange={e => setNewData({...newData, SpecFL: e.target.value})} onKeyDown={handleAddConstraint} className="w-full p-1 border rounded text-center" /></td>
                <td className="py-2 px-3 text-center"><input type="checkbox" checked={newData.OddRFL} onChange={e => setNewData({...newData, OddRFL: e.target.checked})} /></td>
                <td className="py-2 px-3 text-center"><input type="checkbox" checked={newData.Summer} onChange={e => setNewData({...newData, Summer: e.target.checked})} /></td>
                <td className="py-2 px-3 text-center"><input type="checkbox" checked={newData.SoftFLAS} onChange={e => setNewData({...newData, SoftFLAS: e.target.checked})} /></td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}
    </div>
  );
}