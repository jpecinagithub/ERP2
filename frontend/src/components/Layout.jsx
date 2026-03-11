import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineViewGrid,
  HiOutlineUserGroup,
  HiOutlineTruck,
  HiOutlineCube,
  HiOutlineCalculator,
  HiOutlineDocumentText,
  HiOutlineClipboardList,
  HiOutlineChartBar,
  HiOutlineUsers,
  HiOutlineArchive,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineLogout,
  HiOutlineSearch,
  HiOutlineBell
} from 'react-icons/hi';
import { useMemo, useState } from 'react';

const nav = [
  { section: 'General', items: [{ to: '/', icon: HiOutlineViewGrid, label: 'Dashboard' }] },
  {
    section: 'Maestros',
    items: [
      { to: '/customers', icon: HiOutlineUserGroup, label: 'Clientes' },
      { to: '/suppliers', icon: HiOutlineTruck, label: 'Proveedores' },
      { to: '/items', icon: HiOutlineCube, label: 'Articulos' },
      { to: '/accounts', icon: HiOutlineCalculator, label: 'Plan Contable' }
    ]
  },
  {
    section: 'Operacion',
    items: [
      { to: '/sales-invoices', icon: HiOutlineDocumentText, label: 'Facturas Venta' },
      { to: '/purchase-invoices', icon: HiOutlineClipboardList, label: 'Facturas Compra' },
      { to: '/journal', icon: HiOutlineDocumentText, label: 'Asientos' },
      { to: '/inventory', icon: HiOutlineArchive, label: 'Inventario' },
      { to: '/balance', icon: HiOutlineChartBar, label: 'Balance' },
      { to: '/users', icon: HiOutlineUsers, label: 'Usuarios' }
    ]
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const title = useMemo(() => {
    const flat = nav.flatMap((section) => section.items);
    return flat.find((item) => item.to === location.pathname)?.label || 'ERP';
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen text-slate-100">
      {open && <div className="fixed inset-0 z-30 bg-slate-950/70 lg:hidden" onClick={() => setOpen(false)}></div>}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-surface-900/85 p-4 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-500 shadow-lg shadow-brand-900/40">ERP</div>
            <div>
              <p className="text-sm font-semibold">ERP Enterprise</p>
              <p className="text-xs text-slate-400">Control total</p>
            </div>
          </div>
          <button className="rounded-lg p-2 text-slate-400 lg:hidden" onClick={() => setOpen(false)}>
            <HiOutlineX size={18} />
          </button>
        </div>

        <nav className="space-y-6 overflow-y-auto pb-4">
          {nav.map((group) => (
            <div key={group.section}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">{group.section}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-500/20 to-indigo-500/15 text-white shadow-glow'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`
                    }
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-white/10 bg-surface-800/50 p-3">
          <p className="text-sm font-semibold">{user?.username || 'usuario'}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">{user?.role || 'rol'}</p>
          <button type="button" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10" onClick={handleLogout}>
            <HiOutlineLogout size={16} /> Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-surface-900/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 lg:hidden" onClick={() => setOpen(true)}>
                <HiOutlineMenu size={18} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{title}</p>
                <p className="truncate text-xs text-slate-400">ERP / {title}</p>
              </div>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="relative">
                <HiOutlineSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input className="erp-input w-64 pl-9" placeholder="Buscar modulo..." />
              </div>
              <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10">
                <HiOutlineBell size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
