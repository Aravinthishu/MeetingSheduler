import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Token ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const meetingsApi = {
  getAll: (params) => api.get('/meetings/', { params }),
  get: (id) => api.get(`/meetings/${id}/`),
  create: (data) => api.post('/meetings/', data),
  update: (id, data) => api.patch(`/meetings/${id}/`, data),
  delete: (id) => api.delete(`/meetings/${id}/`),
  start: (id) => api.post(`/meetings/${id}/start/`),
  end: (id) => api.post(`/meetings/${id}/end/`),
  cancel: (id) => api.post(`/meetings/${id}/cancel/`),
  checkin: (id) => api.post(`/meetings/${id}/checkin/`),
  roomStatus: () => api.get('/meetings/room_status/'),
  analytics: () => api.get('/meetings/analytics/'),
  quickBook: (data) => api.post('/meetings/quick_book/', data),
  extend: (id, minutes) => api.post(`/meetings/${id}/extend/`, { minutes }),
}

export const roomsApi = {
  getAll: () => api.get('/rooms/'),
  create: (data) => api.post('/rooms/', data),
  update: (id, data) => api.patch(`/rooms/${id}/`, data),
  delete: (id) => api.delete(`/rooms/${id}/`),
}

export const teamsApi = {
  getAll: () => api.get('/teams/'),
  create: (data) => api.post('/teams/', data),
  update: (id, data) => api.patch(`/teams/${id}/`, data),
  delete: (id) => api.delete(`/teams/${id}/`),
}

export const usersApi = {
  getAll: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}/`),
  me: () => api.get('/users/me/'),
  dashboard: () => api.get('/users/dashboard/'),
}

export const waitlistApi = {
  getAll: () => api.get('/waitlist/'),
  join: (data) => api.post('/waitlist/', data),
}


export const authApi = {
  login: (data) => api.post('/auth/login/', data),
  logout: () => api.post('/auth/logout/'),
  me: () => api.get('/auth/me/'),
  changePassword: (data) => api.post('/auth/change-password/', data),
}


export default api