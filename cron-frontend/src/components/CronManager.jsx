import { useState } from 'react';
import CronList from './CronList';
import CronForm from './CronForm';

export default function CronManager() {
  const [editingCron, setEditingCron] = useState(null);
  const [refresh, setRefresh] = useState(false);

  const handleEdit = (cron) => {
    setEditingCron(cron);
  };
  const onSuccess = () => {
    setEditingCron(null)
    setRefresh(!refresh)
  }

  return (
    <div>
      <CronForm cron={editingCron} onSuccess={onSuccess} />
      <CronList onEdit={handleEdit} key={refresh}/>
    </div>
  );
}
