import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './state/theme';
import { SpeechProvider } from './hooks/SpeechProvider';
import { LearningProvider } from './state/learning';
import './styles.css';
import './orange.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><LearningProvider><SpeechProvider><ThemeProvider><App /></ThemeProvider></SpeechProvider></LearningProvider></React.StrictMode>,
);
