import socket from './socket';

const getDashboard = (headers) => socket.get('/dashboard', undefined, headers);

const getDashboardNews = (headers) => socket.get('/dashboard/news', undefined, headers);

const updateDashboard = (layout, version, headers) =>
  socket.patch('/dashboard', { layout, version }, headers);

const acquireDashboardEditLock = (headers) => socket.post('/dashboard/edit-lock', {}, headers);

const releaseDashboardEditLock = (headers) =>
  socket.delete('/dashboard/edit-lock', undefined, headers);

export default {
  getDashboard,
  getDashboardNews,
  updateDashboard,
  acquireDashboardEditLock,
  releaseDashboardEditLock,
};
