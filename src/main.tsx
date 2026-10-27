import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SpeechProvider } from './hooks/SpeechProvider';
import { LearningProvider } from './state/learning';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><LearningProvider><SpeechProvider><App /></SpeechProvider></LearningProvider></React.StrictMode>,
);
