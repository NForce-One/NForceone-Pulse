import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  const [cursorPos, setCursorPos] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <AuthProvider>
      <div 
        className="cursor-glow" 
        style={{ left: cursorPos.x, top: cursorPos.y }}
      />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
