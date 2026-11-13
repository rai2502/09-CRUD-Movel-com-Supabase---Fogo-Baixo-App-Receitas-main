import React from 'react';
import ReactDOM from 'react-dom/client';
import LocalNotificationsPanel from './components/LocalNotificationsPanel.jsx';

const target = document.getElementById('notifications-root');

if (target) {
  ReactDOM.createRoot(target).render(
    <React.StrictMode>
      <LocalNotificationsPanel />
    </React.StrictMode>
  );
}
