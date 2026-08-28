import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const RED_EMAIL   = (red) => `${red}@redes.iglesia`;
const ADMIN_EMAIL  = 'admin@iglesia.com';
const PASTOR_EMAIL = 'pastor@iglesia.com';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const isLoggedIn = (red) => user?.email === RED_EMAIL(red);

  const login = async (red, _usuario, password) => {
    try {
      await signInWithEmailAndPassword(auth, RED_EMAIL(red), password);
      return { success: true };
    } catch (error) {
      const msg =
        error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
          ? 'Contraseña incorrecta'
          : error.code === 'auth/user-not-found'
          ? 'Usuario no encontrado. Ve a /setup para configurar.'
          : 'Error de conexión. Intenta de nuevo.';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const loginAdmin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (auth.currentUser?.email !== ADMIN_EMAIL) {
        await signOut(auth);
        return { success: false, error: 'Acceso denegado. Solo el admin puede ingresar aquí.' };
      }
      return { success: true };
    } catch (error) {
      const msg =
        error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
          ? 'Correo o contraseña incorrectos'
          : 'Error de conexión. Intenta de nuevo.';
      return { success: false, error: msg };
    }
  };

  const isAdminLoggedIn = () => user?.email === ADMIN_EMAIL;

  const logoutAdmin = async () => {
    await signOut(auth);
  };

  const loginPastor = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (auth.currentUser?.email !== PASTOR_EMAIL) {
        await signOut(auth);
        return { success: false, error: 'Acceso denegado.' };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Correo o contraseña incorrectos' };
    }
  };

  const isPastorLoggedIn = () => user?.email === PASTOR_EMAIL;

  const logoutPastor = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      isLoggedIn, login, logout,
      loginAdmin, isAdminLoggedIn, logoutAdmin,
      loginPastor, isPastorLoggedIn, logoutPastor
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
