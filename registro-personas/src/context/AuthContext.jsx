import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [sessions, setSessions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('church_sessions');
      if (saved) setSessions(JSON.parse(saved));
    } catch {
      setSessions({});
    }
    setLoading(false);
  }, []);

  const isLoggedIn = (red) => sessions[red] === true;

  const login = async (red, usuario, password) => {
    try {
      const docRef = doc(db, 'redes', red);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return { success: false, error: 'Red no encontrada' };

      const data = docSnap.data();
      if (data.usuario === usuario && data.password === password) {
        const newSessions = { ...sessions, [red]: true };
        setSessions(newSessions);
        localStorage.setItem('church_sessions', JSON.stringify(newSessions));
        return { success: true };
      }
      return { success: false, error: 'Usuario o contraseña incorrectos' };
    } catch (error) {
      return { success: false, error: 'Error de conexión. Intenta de nuevo.' };
    }
  };

  const logout = (red) => {
    const newSessions = { ...sessions, [red]: false };
    setSessions(newSessions);
    localStorage.setItem('church_sessions', JSON.stringify(newSessions));
  };

  return (
    <AuthContext.Provider value={{ sessions, isLoggedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
