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

  // 4. sáv state-ek
  const [specCondition1, setSpecCondition1] = useState('');
  const [specCondition2, setSpecCondition2] = useState('');
  const [specInput, setSpecInput] = useState('');
  const [softFLAS, setSoftFLAS] = useState(false);
  const [oddRFL, setOddRFL] = useState(false);
  const [atSummerRight, setAtSummerRight] = useState(false);

  const [hintLevel, setHintLevel] = useState(0); // 0 = semmi, 1 = hint (highlight), 2 = solution (kitöltés)

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
  }, [
    // Minden state, amit a handleNext használ
    currentIndex,
    selectedLevelType,
    levelValue,
    selectedCrossType,
    otherValue,
    releasedTurn,
    releasedDesc,
    releasedClb,
    releasedFL,
    specCondition1,
    specCondition2,
    specInput,
    softFLAS,
    oddRFL,
    atSummerRight,
    shuffledConstraints,
  ]);

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

  // 4. sáv mappingek
  const specOneMapping = {
    '': 'nothing',
    'summer': 'Summer',
    'tra06d': 'TRA',
    'via': 'Via',
  };

  const specTwoMapping = {
    '': 'nothing',
    'level': 'At',
    'different': 'Different',
  };

    // Mezok, amiket highlightolni kell HINT módban
    const needsHighlight = {
      levelType: Boolean(currentConstraint.Condition),
      mainFL: currentConstraint.MainFL !== undefined && currentConstraint.MainFL !== null,
      crossLoR: currentConstraint.ConditionReach && currentConstraint.ConditionReach !== 'Nothing',
      reachFL: currentConstraint.ReachFL !== undefined && currentConstraint.ReachFL !== null && currentConstraint.ReachFL !== 0,
      
      releasedTurn: Boolean(currentConstraint.ReleasedTurn),
      releasedDesc: Boolean(currentConstraint.ReleasedDesc),
      releasedClb: Boolean(currentConstraint.ReleasedClb),
      releasedFL: currentConstraint.ReleasedFL !== undefined && currentConstraint.ReleasedFL !== null && currentConstraint.ReleasedFL !== 0,
      
      specOne: currentConstraint.SpecOne && currentConstraint.SpecOne.toLowerCase() !== 'nothing',
      specTwo: currentConstraint.SpecTwo && currentConstraint.SpecTwo !== 'nothing',
      specFL: currentConstraint.SpecFL !== undefined && currentConstraint.SpecFL !== null && currentConstraint.SpecFL !== 0,
      
      softFLAS: Boolean(currentConstraint.SoftFLAS),
      oddRFL: Boolean(currentConstraint.OddRFL),
      atSummerRight: Boolean(currentConstraint.Summer),
    };

  const handleNext = () => {
    let isCorrect = true;

    // 1. Condition
    const selectedConditionDb = conditionMapping[selectedLevelType];
    if (!selectedConditionDb || selectedConditionDb !== currentConstraint.Condition) {
      isCorrect = false;
    }

    // 2. MainFL
    const userMainFL = levelValue.trim() !== '' ? Number(levelValue) : NaN;
    const dbMainFL = Number(currentConstraint.MainFL);
    if (isNaN(userMainFL) || isNaN(dbMainFL) || userMainFL !== dbMainFL) {
      isCorrect = false;
    }

    // 3. ConditionReach
    const selectedCrossDb = crossMapping[selectedCrossType];
    const dbConditionReach = currentConstraint.ConditionReach || 'Nothing';
    if (selectedCrossDb !== dbConditionReach) {
      isCorrect = false;
    }

    // 4. ReachFL
    const userReachFL = otherValue.trim() !== '' ? Number(otherValue) : 0;
    const dbReachFL = Number(currentConstraint.ReachFL ?? 0);
    if (
      (dbReachFL === 0 && userReachFL !== 0) ||
      (dbReachFL !== 0 && userReachFL !== dbReachFL)
    ) {
      isCorrect = false;
    }

    // 5. Released Turn, Descent, Climb
    if (Boolean(releasedTurn) !== Boolean(currentConstraint.ReleasedTurn)) {
      isCorrect = false;
    }
    if (Boolean(releasedDesc) !== Boolean(currentConstraint.ReleasedDesc)) {
      isCorrect = false;
    }
    if (Boolean(releasedClb) !== Boolean(currentConstraint.ReleasedClb)) {
      isCorrect = false;
    }

    // 6. ReleasedFL
    const userReleasedFL = releasedFL.trim() !== '' ? Number(releasedFL) : 0;
    const dbReleasedFL = Number(currentConstraint.ReleasedFL ?? 0);
    if (
      (dbReleasedFL === 0 && userReleasedFL !== 0) ||
      (dbReleasedFL !== 0 && userReleasedFL !== dbReleasedFL)
    ) {
      isCorrect = false;
    }

    // 7. SpecOne
    const selectedSpecOneDb = specOneMapping[specCondition1];
    const dbSpecOne = (currentConstraint.SpecOne || 'nothing').toString().trim().toLowerCase();
    if (selectedSpecOneDb !== dbSpecOne) {
      isCorrect = false;
    }

    // 8. SpecTwo
    const selectedSpecTwoDb = specTwoMapping[specCondition2];
    const dbSpecTwo = currentConstraint.SpecTwo?.trim() || 'nothing';
    if (selectedSpecTwoDb !== dbSpecTwo) {
      isCorrect = false;
    }

    // 9. SpecFL
    const userSpecFL = specInput.trim() !== '' ? Number(specInput) : 0;
    const dbSpecFL = Number(currentConstraint.SpecFL ?? 0);
    if (
      (dbSpecFL === 0 && userSpecFL !== 0) ||
      (dbSpecFL !== 0 && userSpecFL !== dbSpecFL)
    ) {
      isCorrect = false;
    }

    // 10. Checkboxok
    if (Boolean(softFLAS) !== Boolean(currentConstraint.SoftFLAS)) {
      isCorrect = false;
    }
    if (Boolean(oddRFL) !== Boolean(currentConstraint.OddRFL)) {
      isCorrect = false;
    }
    if (Boolean(atSummerRight) !== Boolean(currentConstraint.Summer)) {
      isCorrect = false;
    }

    // Végső döntés
    if (isCorrect) {
      setFeedback('correct');
      setTimeout(() => {
        setFeedback(null);

        if (currentIndex < shuffledConstraints.length - 1) {
          setCurrentIndex((prev) => prev + 1);
          resetFields();
        } else {
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
      setTimeout(() => setFeedback(null), 3200);
    }
  };

  const handleHint = () => {
    if (hintLevel === 0) {
      setHintLevel(1); // Highlight mód
    } else if (hintLevel === 1) {
      setHintLevel(2); // Solution mód (kitöltés)

      // Automatikus kitöltés
      setSelectedLevelType(
        Object.keys(conditionMapping).find(key => conditionMapping[key] === currentConstraint.Condition) || ''
      );
      setLevelValue(currentConstraint.MainFL?.toString() || '');
      
      const crossKey = Object.keys(crossMapping).find(
        key => crossMapping[key] === (currentConstraint.ConditionReach || 'Nothing')
      );
      setSelectedCrossType(crossKey || '');

      setOtherValue(currentConstraint.ReachFL?.toString() || '');

      setReleasedTurn(Boolean(currentConstraint.ReleasedTurn));
      setReleasedDesc(Boolean(currentConstraint.ReleasedDesc));
      setReleasedClb(Boolean(currentConstraint.ReleasedClb));
      setReleasedFL(currentConstraint.ReleasedFL?.toString() || '');

      setSpecCondition1(
        Object.keys(specOneMapping).find(
          key => specOneMapping[key] === (currentConstraint.SpecOne || 'nothing').toLowerCase()
        ) || ''
      );
      setSpecCondition2(
        Object.keys(specTwoMapping).find(
          key => specTwoMapping[key] === (currentConstraint.SpecTwo || 'nothing')
        ) || ''
      );
      setSpecInput(currentConstraint.SpecFL?.toString() || '');

      setSoftFLAS(Boolean(currentConstraint.SoftFLAS));
      setOddRFL(Boolean(currentConstraint.OddRFL));
      setAtSummerRight(Boolean(currentConstraint.Summer));
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
    setSpecCondition1('');
    setSpecCondition2('');
    setSpecInput('');
    setSoftFLAS(false);
    setOddRFL(false);
    setAtSummerRight(false);
    
    setHintLevel(0); // Reset hint állapot
  };

  return (
    <div className="h-screen bg-gray-50 grid grid-rows-5 overflow-hidden relative">

      {/* 1. sáv */}
      <div className="bg-white border-b border-gray-200 overflow-auto">
        <div className="container mx-auto px-4 py-6 h-full flex flex-col justify-center">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              {currentConstraint.Airports?.length > 0 ? currentConstraint.Airports.join(',  ') : 'Nincs megadva repülőtér'}
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto flex-1 items-center">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">From</div>
              <div className="text-2xl font-semibold text-gray-900">{currentConstraint.From || '–'}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Via</div>
              <div className="text-2xl font-semibold text-gray-900">{currentConstraint.Via || '–'}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">To</div>
              <div className="text-2xl font-semibold text-gray-900">{currentConstraint.To || '–'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. sáv */}
      <div className="bg-gray-100 border-b border-gray-200 overflow-auto">
        <div className="container mx-auto px-4 py-6 h-full flex items-center justify-center">
          <div className="grid grid-cols-4 gap-6 w-full max-w-5xl">
            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Level type</label>
              <select value={selectedLevelType} onChange={(e) => setSelectedLevelType(e.target.value)}
                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                  hintLevel === 1 && needsHighlight.levelType ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
                }`}>
                <option value="">Válassz...</option>
                <option value="at">At level</option>
                <option value="climb">In climb</option>
                <option value="descent">In descent</option>
                <option value="subject">Subject to AR</option>
              </select>
            </div>

            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Érték</label>
              <input type="number" value={levelValue} onChange={(e) => setLevelValue(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                  hintLevel === 1 && needsHighlight.mainFL ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
                } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>

            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Cross LoR</label>
              <select value={selectedCrossType} onChange={(e) => setSelectedCrossType(e.target.value)}
                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                  hintLevel === 1 && needsHighlight.crossLoR ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
                }`}>
                <option value="">Válassz... (nem kötelező)</option>
                <option value="above">Cross LoR Above</option>
                <option value="below">Cross LoR Below</option>
              </select>
            </div>

            <div className="flex flex-col items-center">
              <label className="text-sm font-medium text-gray-700 mb-2">Érték</label>
              <input type="number" value={otherValue} onChange={(e) => setOtherValue(e.target.value.replace(/\D/g, ''))}
                className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                  hintLevel === 1 && needsHighlight.reachFL ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
                } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. sáv - Released for */}
      <div className="bg-gray-50 border-b border-gray-200 flex items-center justify-center">
        <div className="grid grid-cols-2 w-full max-w-5xl gap-8">
          <div className="space-y-4">
            {['Turn', 'Descent', 'Climb'].map((type, i) => {
              const state = [releasedTurn, releasedDesc, releasedClb][i];
              const setter = [setReleasedTurn, setReleasedDesc, setReleasedClb][i];
              const key = ['releasedTurn', 'releasedDesc', 'releasedClb'][i];
              return (
                <label key={type} className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-all ${
                  hintLevel === 1 && needsHighlight[key] ? 'bg-green-100' : ''
                }`}>
                  <input type="checkbox" checked={state} onChange={(e) => setter(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-lg text-gray-700">Released for {type.toLowerCase()}</span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-center">
            <label className="text-sm font-medium text-gray-700 mb-2">FL érték</label>
            <input type="number" value={releasedFL} onChange={(e) => setReleasedFL(e.target.value.replace(/\D/g, ''))}
              className={`w-full max-w-xs px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                hintLevel === 1 && needsHighlight.releasedFL ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
              } [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`} />
          </div>
        </div>
      </div>

      {/* 4. sáv - Special condition */}
      <div className="bg-white border-b border-gray-200 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-6xl h-full grid grid-cols-2 relative px-8 py-8">
          <div className="flex flex-col items-center justify-center h-full">
            <h3 className="text-xl font-bold text-gray-800 mb-8">Special condition</h3>
            <div className="flex items-end gap-4 w-full max-w-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Feltétel</label>
                <select value={specCondition1} onChange={(e) => setSpecCondition1(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                    hintLevel === 1 && needsHighlight.specOne ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
                  }`}>
                  <option value="">Válassz...</option>
                  <option value="summer">At summer</option>
                  <option value="tra06d">If TRA06D active</option>
                  <option value="via">If via EDEMU, ARFOX, ANEXA</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Típus</label>
                <select value={specCondition2} onChange={(e) => setSpecCondition2(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                    hintLevel === 1 && needsHighlight.specTwo ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
                  }`}>
                  <option value="">Válassz...</option>
                  <option value="level">At level</option>
                  <option value="different">Different constraint</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Érték</label>
                <input type="text" value={specInput} onChange={(e) => setSpecInput(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center transition-all ${
                    hintLevel === 1 && needsHighlight.specFL ? 'bg-green-100 border-green-500 ring-2 ring-green-300' : ''
                  }`} />
              </div>
            </div>
          </div>

          <div className="absolute left-1/2 top-8 bottom-8 w-px border-l border-dashed border-gray-300"></div>

          <div className="flex flex-col items-center justify-center h-full">
            <div className="space-y-5">
              {[
                { label: "Soft FLAS", state: softFLAS, setter: setSoftFLAS, key: "softFLAS" },
                { label: "Odd RFL", state: oddRFL, setter: setOddRFL, key: "oddRFL" },
                { label: "At summer", state: atSummerRight, setter: setAtSummerRight, key: "atSummerRight" }
              ].map(item => (
                <label key={item.label} className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg transition-all ${
                  hintLevel === 1 && needsHighlight[item.key] ? 'bg-green-100' : ''
                }`}>
                  <input type="checkbox" checked={item.state} onChange={(e) => item.setter(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                  <span className="text-lg text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. sáv */}
      <div className="bg-gray-50 border-t border-gray-200 flex items-center justify-center relative">
        <div className="grid grid-cols-3 gap-8 w-full max-w-4xl px-6">
          <div className="flex items-center justify-center text-2xl font-bold text-gray-700">
            {currentNumber} / {totalCount}
          </div>

          <div className="flex items-center justify-center">
            <button onClick={handleHint}
              className="px-10 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow-md transition-colors">
              {hintLevel === 0 ? 'HINT' : hintLevel === 1 ? 'SOLUTION' : 'HINT'}
            </button>
          </div>

          <div className="flex items-center justify-center">
            <button onClick={handleNext}
              className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors">
              Next
            </button>
          </div>
        </div>

        {/* Feedback overlayek */}
        {feedback && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 pointer-events-none">
            <div className={`px-10 py-5 rounded-xl text-3xl font-bold text-white shadow-2xl ${feedback === 'correct' ? 'bg-green-600' : 'bg-red-600'}`}>
              {feedback === 'correct' ? 'Helyes!' : 'Helytelen válasz'}
            </div>
          </div>
        )}

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