import React, { useState, useEffect } from 'react';

export default function App() {
  const [message, setMessage] = useState('Inicializando FixIt Now...');

  useEffect(() => {
    setMessage('FixIt Now pronto!');
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#0f172a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      margin: 0,
      padding: 0
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        padding: '2rem',
        borderRadius: '1rem',
        border: '1px solid rgba(71, 85, 105, 0.5)',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#60a5fa' }}>
          FixIt Now
        </h1>
        <p style={{ fontSize: '1rem', marginBottom: '2rem' }}>
          {message}
        </p>
        <button
          onClick={() => setMessage('Pronto para diagnosticar!')}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Diagnosticar
        </button>
      </div>
    </div>
  );
}
