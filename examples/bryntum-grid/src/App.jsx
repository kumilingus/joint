import { GraphProvider } from '@joint/react';
import DiagramEditor from './components/DiagramEditor';
import initialData from './config/initial-data';

import './App.css';

function App() {
    return (
       <GraphProvider>
          <DiagramEditor initialData={initialData} />
        </GraphProvider>
    );
}

export default App;
