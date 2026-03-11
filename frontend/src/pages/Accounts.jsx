import CrudPage from '../components/CrudPage';
import StatusBadge from '../components/ui/StatusBadge';

export default function Accounts() {
  return (
    <CrudPage
      title="Plan Contable"
      subtitle="Estructura de cuentas contables"
      endpoint="/accounts"
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'code', label: 'Codigo' },
        { key: 'name', label: 'Nombre' },
        { key: 'type', label: 'Tipo', render: (value) => <StatusBadge value={value} /> }
      ]}
      formFields={[
        { key: 'code', label: 'Codigo', required: true, placeholder: '430' },
        { key: 'name', label: 'Nombre', required: true, placeholder: 'Clientes' },
        {
          key: 'type',
          label: 'Tipo',
          type: 'select',
          required: true,
          options: [
            { value: 'activo', label: 'Activo' },
            { value: 'pasivo', label: 'Pasivo' },
            { value: 'gasto', label: 'Gasto' },
            { value: 'ingreso', label: 'Ingreso' }
          ]
        },
        { key: 'parent_account', label: 'Cuenta padre (ID)', type: 'number', placeholder: 'Opcional' }
      ]}
    />
  );
}
