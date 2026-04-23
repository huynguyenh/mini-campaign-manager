import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  AuthResponse,
  Campaign,
  CampaignDetail,
  CampaignStats,
  CreateCampaignInput,
  CreateRecipientInput,
  LoginInput,
  Paginated,
  Recipient,
  RegisterInput,
  ScheduleCampaignInput,
  UpdateCampaignInput,
} from '@mcm/shared';

// --- Auth ----------------------------------------------------------------

export function useLogin() {
  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
      return data;
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
      return data;
    },
  });
}

// --- Campaigns -----------------------------------------------------------

export function useCampaigns(page: number, pageSize = 10) {
  return useQuery({
    queryKey: ['campaigns', { page, pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Campaign>>('/campaigns', {
        params: { page, pageSize },
      });
      return data;
    },
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const { data } = await apiClient.get<CampaignDetail>(`/campaigns/${id}`);
      return data;
    },
    enabled: !!id,
    // Self-regulated polling: refetch every 2s while the campaign is sending,
    // off otherwise. React Query passes the latest query state to the function
    // so we can drive this off the server's status without local state.
    refetchInterval: (q) => (q.state.data?.status === 'sending' ? 2000 : false),
  });
}

export function useCampaignStats(id: string | undefined, refetchInterval?: number | false) {
  return useQuery({
    queryKey: ['campaign-stats', id],
    queryFn: async () => {
      const { data } = await apiClient.get<CampaignStats>(`/campaigns/${id}/stats`);
      return data;
    },
    enabled: !!id,
    refetchInterval,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCampaignInput) => {
      const { data } = await apiClient.post<Campaign>('/campaigns', input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCampaignInput) => {
      const { data } = await apiClient.patch<Campaign>(`/campaigns/${id}`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      qc.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/campaigns/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useScheduleCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScheduleCampaignInput) => {
      const { data } = await apiClient.post<Campaign>(`/campaigns/${id}/schedule`, input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', id] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useSendCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<Campaign>(`/campaigns/${id}/send`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', id] });
      qc.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

// --- Recipients ----------------------------------------------------------

export function useRecipients(page = 1, pageSize = 100) {
  return useQuery({
    queryKey: ['recipients', { page, pageSize }],
    queryFn: async () => {
      const { data } = await apiClient.get<Paginated<Recipient>>('/recipients', {
        params: { page, pageSize },
      });
      return data;
    },
  });
}

export function useCreateRecipient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRecipientInput) => {
      const { data } = await apiClient.post<Recipient>('/recipients', input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipients'] });
    },
  });
}
