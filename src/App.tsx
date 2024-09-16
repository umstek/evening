import { Download } from 'lucide-react';
import { useRef } from 'react';

import './App.css';
import { Twitter } from './twitter';

function App() {
  const t = useRef<Twitter>(undefined as never);
  if (!t.current) {
    t.current = new Twitter();
  }

  return (
    <div id="evening-app">
      <button
        type="button"
        id="evening-download-all"
        onClick={() => t.current.downloadAll()}
      >
        <Download />
      </button>
    </div>
  );
}

export default App;
