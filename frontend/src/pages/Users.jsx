import CrudPage from '../components/CrudPage';
import StatusBadge from '../components/ui/StatusBadge';

export default function Users() {
  return (
    <CrudPage
      title="Usuarios"
      subtitle="Control de accesos del sistema"
      endpoint="/users"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'username', label: 'Usuario' },
        { key: 'role', label: 'Rol', render: (value) => <StatusBadge value={value} /> }
      ]}
      formFields={[
        { key: 'username', label: 'Usuario', required: true, placeholder: 'usuario' },
        { key: 'password', label: 'Contrasena', type: 'password', required: true, placeholder: '********' },
        {
          key: 'role',
          label: 'Rol',
          type: 'select',
          required: true,
          options: [
            { value: 'superadmin', label: 'SuperAdmin' },
            { value: 'admin', label: 'Admin' },
            { value: 'contabilidad', label: 'Contabilidad' },
            { value: 'compras', label: 'Compras' },
            { value: 'tesoreria', label: 'Tesoreria' }
          ]
        }
      ]}
    />
  );
}
