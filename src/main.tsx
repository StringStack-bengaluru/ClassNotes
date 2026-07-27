import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BookReaderApp } from './components/BookReaderApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BookReaderApp />
  </StrictMode>,
);
