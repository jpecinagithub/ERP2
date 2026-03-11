import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineUser, HiOutlineShieldCheck } from 'react-icons/hi';
import client from '../api/client';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('compras');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Validaciones locales
    if (!username || !password || !confirmPassword) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (username.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres');
      return;
    }

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      await client.post('/auth/register', {
        username,
        password,
        role
      });
      
      // Redireccionar al login con mensaje de éxito
      navigate('/login', { state: { message: 'Usuario creado correctamente. Por favor, inicia sesión.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'No fue posible crear el usuario');
    }

    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-mesh-dark opacity-90"></div>
      <div className="pointer-events-none absolute -right-32 -top-16 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl"></div>

      <div className="erp-panel relative z-10 w-full max-w-md border-white/15 p-7 sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-500 text-xl font-black shadow-lg shadow-brand-900/40">
            ERP
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Crear Cuenta</h1>
          <p className="mt-1 text-sm text-slate-400">Registrate en el sistema</p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Usuario
            </span>
            <div className="relative">
              <HiOutlineUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                className="erp-input pl-9"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="usuario"
                required
                autoFocus
                minLength={3}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Contraseña
            </span>
            <div className="relative">
              <HiOutlineLockClosed className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                className="erp-input pl-9"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                required
                minLength={4}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Confirmar Contraseña
            </span>
            <div className="relative">
              <HiOutlineLockClosed className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                className="erp-input pl-9"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="********"
                required
                minLength={4}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Rol
            </span>
            <div className="relative">
              <HiOutlineShieldCheck className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <select
                className="erp-input pl-9"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                required
              >
                <option value="compras">Compras</option>
                <option value="contabilidad">Contabilidad</option>
                <option value="tesoreria">Tesoreria</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </label>

          <button type="submit" className="erp-btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold">
              Iniciar Sesion
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">ERP2 MVP · 2026</p>
      </div>
    </div>
  );
}

