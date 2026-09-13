import axios from "axios";

const api = axios.create({ baseURL: "/api" });

export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getBatch(id) {
  const { data } = await api.get(`/batches/${id}`);
  return data;
}

export async function setEmailColumn(batchId, column) {
  await api.post(`/batches/${batchId}/email-column`, { column });
}

export async function listTemplates() {
  const { data } = await api.get("/templates");
  return data;
}

export async function createTemplate(input) {
  const { data } = await api.post("/templates", input);
  return data;
}

export async function updateTemplate(id, input) {
  const { data } = await api.put(`/templates/${id}`, input);
  return data;
}

export async function deleteTemplate(id) {
  await api.delete(`/templates/${id}`);
}

export async function startGeneration(params) {
  const { data } = await api.post("/generate", params);
  return data;
}

export async function getGenerationStatus(batchId) {
  const { data } = await api.get(`/generate/${batchId}/status`);
  return data;
}

export async function updateRecord(id, input) {
  const { data } = await api.put(`/records/${id}`, input);
  return data;
}

export async function deleteRecord(id) {
  await api.delete(`/records/${id}`);
}

export async function regenerateRecord(id, additionalInstruction) {
  const { data } = await api.post(`/records/${id}/regenerate`, { additionalInstruction });
  return data;
}

export async function getRecordHistory(id) {
  const { data } = await api.get(`/records/${id}/history`);
  return data;
}

export async function sendRecords(params) {
  const { data } = await api.post("/send", params);
  return data;
}

export async function sendSingleRecord(id) {
  const { data } = await api.post(`/send/${id}`);
  return data;
}

export async function listBatches() {
  const { data } = await api.get("/batches");
  return data;
}

export async function deleteBatch(id) {
  await api.delete(`/batches/${id}`);
}

export async function listAiProviders() {
  const { data } = await api.get("/ai-providers");
  return data;
}

export async function saveAiProvider(id, input) {
  const { data } = await api.put(`/ai-providers/${id}`, input);
  return data;
}

export async function clearAiProviderCredentials(id) {
  const { data } = await api.delete(`/ai-providers/${id}/credentials`);
  return data;
}

export async function setDefaultAiProvider(id) {
  const { data } = await api.post(`/ai-providers/${id}/default`);
  return data;
}

export async function testAiProvider(id, fields) {
  const { data } = await api.post(`/ai-providers/${id}/test`, fields ? { fields } : {});
  return data;
}

export async function listMailProviders() {
  const { data } = await api.get("/mail-providers");
  return data;
}

export async function saveMailProvider(id, input) {
  const { data } = await api.put(`/mail-providers/${id}`, input);
  return data;
}

export async function clearMailProviderCredentials(id) {
  const { data } = await api.delete(`/mail-providers/${id}/credentials`);
  return data;
}

export async function setDefaultMailProvider(id) {
  const { data } = await api.post(`/mail-providers/${id}/default`);
  return data;
}

export async function testMailProvider(id, fields) {
  const { data } = await api.post(`/mail-providers/${id}/test`, fields ? { fields } : {});
  return data;
}

export function apiErrorMessage(err) {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
