export type Role = 'ADMIN' | 'PROFESSIONAL';
export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  role: Role;
  mustChangePassword?: boolean;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  phoneIsWhatsapp?: boolean;
  prefersMessageContact?: boolean;
  email: string | null;
  notes: string | null;
  createdAt: string;
  lastVisit?: string | null;
  totalSpent?: number;
};

export type Professional = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title?: string | null;
  role: Role;
  createdAt: string;
  monthlyAppointments?: number;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  category?: string;
  price: string | number;
  durationInMinutes: number;
};

export type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string | null;
  client: { id: string; name: string; phone: string; email?: string | null };
  service: {
    id: string;
    name: string;
    price: string | number;
    durationInMinutes: number;
  };
  professional: { id: string; name: string; email?: string };
};

export type DashboardSummary = {
  appointmentsToday: number;
  confirmedToday: number;
  expectedRevenue: number;
  activeClients: number;
  newClientsLast30Days: number;
  nextAppointment: {
    time: string;
    clientName: string;
    serviceName: string;
  } | null;
  todayAgenda: Appointment[];
};

type ApiErrorBody = {
  message?: string | string[];
  statusCode?: number;
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    if (Array.isArray(body.message)) return body.message.join(' ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  if (res.status === 429) return 'Muitas tentativas. Aguarde um momento.';
  return 'Não foi possível concluir a operação.';
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<AuthUser>('/api/auth/me'),
  updateCredentials: (data: {
    currentPassword: string;
    name?: string;
    title?: string;
    phone?: string;
    email?: string;
    newPassword?: string;
    confirmPassword?: string;
  }) =>
    request<{ user: AuthUser }>('/api/auth/credentials', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  dashboard: () => request<DashboardSummary>('/api/dashboard/summary'),
  clients: {
    list: (search?: string) =>
      request<Client[]>(
        `/api/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
    create: (data: Partial<Client> & { name: string; phone: string }) =>
      request<Client>('/api/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Client>) =>
      request<Client>(`/api/clients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/api/clients/${id}`, { method: 'DELETE' }),
  },
  professionals: {
    list: () => request<Professional[]>('/api/users/professionals'),
    create: (data: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      title?: string;
      role?: Role;
    }) =>
      request<Professional>('/api/users', {
        method: 'POST',
        body: JSON.stringify({ ...data, role: data.role ?? 'PROFESSIONAL' }),
      }),
    update: (
      id: string,
      data: Partial<{
        name: string;
        email: string;
        phone: string;
        title: string;
        password: string;
      }>,
    ) =>
      request<Professional>(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/api/users/${id}`, { method: 'DELETE' }),
  },
  services: {
    list: () => request<Service[]>('/api/services'),
    create: (data: {
      name: string;
      description?: string;
      category?: string;
      price: number;
      durationInMinutes: number;
    }) =>
      request<Service>('/api/services', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (
      id: string,
      data: Partial<{
        name: string;
        description: string;
        category: string;
        price: number;
        durationInMinutes: number;
      }>,
    ) =>
      request<Service>(`/api/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) =>
      request<void>(`/api/services/${id}`, { method: 'DELETE' }),
  },
  appointments: {
    agenda: (params: {
      date?: string;
      from?: string;
      to?: string;
      professionalId?: string;
    }) => {
      const q = new URLSearchParams();
      if (params.date) q.set('date', params.date);
      if (params.from) q.set('from', params.from);
      if (params.to) q.set('to', params.to);
      if (params.professionalId) q.set('professionalId', params.professionalId);
      return request<Appointment[]>(`/api/appointments/agenda?${q}`);
    },
    create: (data: {
      clientId: string;
      professionalId: string;
      serviceId: string;
      startTime: string;
      status?: AppointmentStatus;
      notes?: string;
    }) =>
      request<Appointment>('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStatus: (id: string, status: AppointmentStatus) =>
      request<Appointment>(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    cancel: (id: string) =>
      request<Appointment>(`/api/appointments/${id}/cancel`, {
        method: 'PATCH',
      }),
  },
  whatsapp: {
    status: () =>
      request<{
        provider: string;
        configured: boolean;
        displayPhone: string | null;
        notes: string[];
      }>('/api/whatsapp/status'),
    send: (data: { to: string; message: string }) =>
      request<{ ok: boolean; messageId: string | null; waId: string }>(
        '/api/whatsapp/send',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
      ),
  },
};
