import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

let rootEl = document.getElementById('root');
if(rootEl == null) throw new Error("No root element given.");

const root = ReactDOM.createRoot(rootEl);
root.render(<React.StrictMode>
  <App />
</React.StrictMode>);