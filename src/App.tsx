import { useRef } from "react";

import "./App.css";
import { Twitter } from "./twitter";

function App() {
	const t = useRef<Twitter>(undefined as never);
	if (!t.current) {
		t.current = new Twitter();
		t.current.init();
	}

	return (
		<div id="evening-app">
			<button type="button" onClick={() => t.current.print()}>
				Print
			</button>
		</div>
	);
}

export default App;
