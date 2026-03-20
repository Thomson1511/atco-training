// src/pages/Constraints.jsx
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function Constraints() {
  const [constraints, setConstraints] = useState([]);
  const [shuffledConstraints, setShuffledConstraints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'incorrect' | null
  const [showCompleted, setShowCompleted] = useState(false);

  // Válasz state-ek (2. sáv)
  const [selectedLevelType, setSelectedLevelType] = useState('');
  const [levelValue, setLevelValue] = useState('');
  const [selectedCrossType, setSelectedCrossType] = useState('');
  const [otherValue, setOtherValue] = useState('');

  // Released checkboxok és FL input
    const [releasedTurn, setReleasedTurn] = useState(false);
    const [releasedDesc, setReleasedDesc] = useState(false);
    const [releasedClb, setReleasedClb] = useState(false);
    const [releasedFL, setReleasedFL] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'Constraints'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setConstraints(data);

      // Csak akkor keverünk, ha még nincs kevert lista (első betöltés)
      if (data.length > 0 && shuffledConstraints.length === 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setShuffledConstraints(shuffled);
      }

      setLoading(false);
    }, (error) => {
      console.error('Error fetching constraints:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Enter') return;
  
      // Ha a fókuszban lévő elem egy gomb, akkor ne fussunk bele kétszer
      if (event.target.tagName === 'BUTTON') return;
  
      event.preventDefault();
      handleNext();
    };
  
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, selectedLevelType, levelValue, selectedCrossType, otherValue, shuffledConstraints]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Betöltés...</div>
      </div>
    );
  }

  if (constraints.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-500">Nincs constraint az adatbázisban</div>
      </div>
    );
  }

  const currentConstraint = shuffledConstraints[currentIndex] || {};
  const totalCount = shuffledConstraints.length;
  const currentNumber = currentIndex + 1;

  // Mappingek
  const conditionMapping = {
    '': null,
    'at': 'Level',
    'climb': 'CLB',
    'descent': 'DESC',
    'subject': 'AR',
  };

  const crossMapping = {
    '': 'Nothing',
    'above': 'Above',
    'below': 'Below',
  };

  const handleNext = () => {
    let isCorrect = true;

    // 1. Condition ellenőrzés
    const selectedConditionDb = conditionMapping[selectedLevelType];
    if (!selectedConditionDb || selectedConditionDb !== currentConstraint.Condition) {
      isCorrect = false;
    }

    // 2. MainFL ellenőrzés
    const userMainFL = levelValue.trim() !== '' ? Number(levelValue) : NaN;
    const dbMainFL = Number(currentConstraint.MainFL);
    if (isNaN(userMainFL) || isNaN(dbMainFL) || userMainFL !== dbMainFL) {
      isCorrect = false;
    }

    // 3. ConditionReach / Cross LoR ellenőrzés
    const selectedCrossDb = crossMapping[selectedCrossType];
    const dbConditionReach = currentConstraint.ConditionReach || 'Nothing';
    if (selectedCrossDb !== dbConditionReach) {
      isCorrect = false;
    }

    // 4. ReachFL ellenőrzés
    const userReachFL = otherValue.trim() !== '' ? Number(otherValue) : 0;
    const dbReachFL = Number(currentConstraint.ReachFL ?? 0);
    const reachFLCorrect =
      (dbReachFL === 0 && userReachFL === 0) ||
      (dbReachFL !== 0 && userReachFL === dbReachFL);

        // ReleasedTurn ellenőrzés példa
    if (releasedTurn !== !!currentConstraint.ReleasedTurn) {
      isCorrect = false;
    }

    if (releasedDesc !== !!currentConstraint.ReleasedDesc) {
      isCorrect = false;
    }

    if (releasedClb !== !!currentConstraint.ReleasedClb) {
      isCorrect = false;
    }

    // ReleasedFL ellenőrzés (hasonló logika, mint a ReachFL-nél)
    const userReleasedFL = releasedFL.trim() !== '' ? Number(releasedFL) : 0;
    const dbReleasedFL = Number(currentConstraint.ReleasedFL ?? 0);

    if (
      (dbReleasedFL === 0 && userReleasedFL !== 0) ||
      (dbReleasedFL !== 0 && userReleasedFL !== dbReleasedFL)
    ) {
      isCorrect = false;
    }

    if (!reachFLCorrect) {
      isCorrect = false;
    }

    if (isCorrect) {
      setFeedback('correct');

      setTimeout(() => {
        setFeedback(null);

        if (currentIndex < shuffledConstraints.length - 1) {
          // Következő
          setCurrentIndex((prev) => prev + 1);
          resetFields();
        } else {
          // Utolsó → végeztél + reshuffle + újrakezdés
          setShowCompleted(true);
          setTimeout(() => {
            const newShuffled = [...constraints].sort(() => Math.random() - 0.5);
            setShuffledConstraints(newShuffled);
            setCurrentIndex(0);
            resetFields();
            setShowCompleted(false);
          }, 2200);
        }
      }, 1400);
    } else {
      setFeedback('incorrect');
      setTimeout(() => setFeedback(null), 1600);
    }
  };

  const resetFields = () => {
    setSelectedLevelType('');
    setLevelValue('');
    setSelectedCrossType('');
    setOtherValue('');
    setReleasedTurn(false);
    setReleasedDesc(false);
    setReleasedClb(false);
    setReleasedFL('');
  };

  return (
    <div className="h-screen bg-gray-50 grid grid-rows-5 overflow-hidden relative">

      {/* 1. sáv – Airports + From | Via | To */}
      <div className="bg-white border-b border-gray-200 overflow-auto">
        <div className="container mx-auto px-4 py-6 h-full flex flex-col justify-center">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              {currentConstraint.Airports?.length > 0
                ? currentConstraint.Airports.join(',  ')
                : 'Nincs megadva repülőtér'}
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto flex-1 items-center">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">From</div>
              <div className="text-2xl font-semibold text-gray-900">
                {currentConstraint.From || '–'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Via</div>
              <div className="text-2xl font-semibold text-gray-900">
                {currentConstraint.Via || '–'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">To</div>
              <div className="text-2xl font-semibold text-gray-900">
                {currentConstraint.To || '–'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. sáv – 4 válaszmező */}
      <div className="bg-gray-100 border-b border-gray-200 overflow-auto">
        <div className="container mx-auto px-4 py-6 h-full flex items-center justify-center">
          <div className="grid grid-cols-4 gap-6 w-full max-w-5xl">
            {/* 1. Level type */}
            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Level type</label>
              <select
                value={selectedLevelType}
                onChange={(e) => setSelectedLevelType(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              >
                <option value="">Válassz...</option>
                <option value="at">At level</option>
                <option value="climb">In climb</option>
                <option value="descent">In descent</option>
                <option value="subject">Subject to AR</option>
              </select>
            </div>

            {/* 2. MainFL input */}
            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Érték</label>
              <input
                type="number"
                value={levelValue}
                onChange={(e) => setLevelValue(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* 3. Cross LoR */}
            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Cross LoR</label>
              <select
                value={selectedCrossType}
                onChange={(e) => setSelectedCrossType(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
              >
                <option value="">Válassz... (nem kötelező)</option>
                <option value="above">Cross LoR Above</option>
                <option value="below">Cross LoR Below</option>
              </select>
            </div>

            {/* 4. ReachFL input */}
            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Érték</label>
              <input
                type="number"
                value={otherValue}
                onChange={(e) => setOtherValue(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. sáv – Released for + checkboxok + szám input */}
      <div className="bg-gray-50 border-b border-gray-200 flex items-center justify-center">
      <div className="grid grid-cols-2 w-full max-w-5xl">
        <div className="space-y-4 mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={releasedTurn}
                onChange={(e) => setReleasedTurn(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-lg text-gray-700">Released for turn</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={releasedDesc}
                onChange={(e) => setReleasedDesc(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-lg text-gray-700">Released for descent</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={releasedClb}
                onChange={(e) => setReleasedClb(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-lg text-gray-700">Released for climb</span>
            </label>
          </div>

          <div className="flex flex-col items-center justify-center">
            <label className="text-sm font-medium text-gray-700 mb-2">
              FL érték
            </label>
            <input
              type="number"
              value={releasedFL}
              onChange={(e) => setReleasedFL(e.target.value.replace(/\D/g, ''))}
              placeholder="pl. 280"
              className="w-full max-w-xs px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          </div>
      </div>

      {/* 4. sáv – placeholder */}
      <div className="bg-gray-300 border-b border-gray-200" />

      {/* 5. sáv – sorszám + HINT + Next */}
      <div className="bg-gray-50 border-t border-gray-200 flex items-center justify-center relative">
        <div className="grid grid-cols-3 gap-8 w-full max-w-4xl px-6">
          <div className="flex items-center justify-center text-2xl font-bold text-gray-700">
            {currentNumber} / {totalCount}
          </div>

          <div className="flex items-center justify-center">
            <button
              className="px-10 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
            >
              HINT
            </button>
          </div>

          <div className="flex items-center justify-center">
            <button
              onClick={handleNext}
              className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Next
            </button>
          </div>
        </div>

        {/* Helyes / helytelen overlay */}
        {feedback && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 pointer-events-none">
            <div
              className={`px-10 py-5 rounded-xl text-3xl font-bold text-white shadow-2xl transform transition-all duration-300 ${
                feedback === 'correct' ? 'bg-green-600' : 'bg-red-600'
              }`}
            >
              {feedback === 'correct' ? 'Helyes!' : 'Helytelen válasz'}
            </div>
          </div>
        )}

        {/* Végeztél overlay */}
        {showCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
            <div className="bg-white px-12 py-8 rounded-2xl shadow-2xl text-center">
              <h2 className="text-4xl font-bold text-green-700 mb-4">Végeztél!</h2>
              <p className="text-xl text-gray-700">Újraindítás folyamatban...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}