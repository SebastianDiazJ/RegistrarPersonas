import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { sanitizeName } from '../utils/validacion';
import { reiniciarLimitesMasivo } from '../services/masivoService';

const RED_EMAIL   = (red) => `${red}@redes.iglesia`;
const ADMIN_EMAIL  = 'admin@iglesia.com';
const PASTOR_EMAIL = 'pastor@iglesia.com';

const AuthContext = createContext(null);

// Firebase Auth ya limita los intentos fallidos por su cuenta; aquí se explica al usuario.
const MSG_DEMASIADOS = 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.';

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  // Nombre de quien diligencia en "Ingreso masivo"; solo vive en memoria.
  const [masivoNombre, setMasivoNombre] = useState('');

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
        error.code === 'auth/too-many-requests'
          ? MSG_DEMASIADOS
          : error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
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
        error.code === 'auth/too-many-requests'
          ? MSG_DEMASIADOS
          : error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
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
      return { success: false, error: error.code === 'auth/too-many-requests' ? MSG_DEMASIADOS : 'Correo o contraseña incorrectos' };
    }
  };

  const isPastorLoggedIn = () => user?.email === PASTOR_EMAIL;

  const logoutPastor = async () => {
    await signOut(auth);
  };

  // Ingreso masivo: sin contraseña. Pide el nombre de quien diligencia (queda en el
  // historial con cada cambio) y usa una sesión anónima de Firebase, o la sesión
  // de admin/pastor si ya hay una abierta.
  const startMasivo = async (nombreRaw) => {
    const nombre = sanitizeName(nombreRaw, 80);
    if (nombre.length < 3) {
      return { success: false, error: 'Escribe tu nombre completo (mínimo 3 letras).' };
    }
    try {
      if (!auth.currentUser) await signInAnonymously(auth);
      reiniciarLimitesMasivo();
      setMasivoNombre(nombre);
      return { success: true };
    } catch (error) {
      const msg = error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation'
        ? 'El ingreso masivo no está habilitado (activa el proveedor "Anónimo" en Firebase Authentication).'
        : 'Error de conexión. Intenta de nuevo.';
      return { success: false, error: msg };
    }
  };

  const isMasivoActive = () => Boolean(masivoNombre) && Boolean(auth.currentUser);

  const logoutMasivo = async () => {
    setMasivoNombre('');
    if (auth.currentUser?.isAnonymous) await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      isLoggedIn, login, logout,
      loginAdmin, isAdminLoggedIn, logoutAdmin,
      loginPastor, isPastorLoggedIn, logoutPastor,
      masivoNombre, startMasivo, isMasivoActive, logoutMasivo
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
