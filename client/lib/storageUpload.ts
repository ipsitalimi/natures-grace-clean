import { getSupabase } from "@/lib/supabase";

export type LocalFile = {
  uri: string;
  name: string;
  mimeType: string;
};

async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Could not read selected file");
  }
  return response.arrayBuffer();
}

export async function uploadProductImage(
  sellerUserId: string,
  productId: string,
  file: LocalFile
): Promise<{ url?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${sellerUserId}/${productId}.${ext}`;

  try {
    const bytes = await readFileBytes(file.uri);
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, bytes, { contentType: file.mimeType, upsert: true });

    if (error) return { error: error.message };

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function uploadProfileAvatar(
  userId: string,
  file: LocalFile
): Promise<{ url?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${userId}/avatar.${ext}`;

  try {
    const bytes = await readFileBytes(file.uri);
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, bytes, { contentType: file.mimeType, upsert: true });

    if (error) return { error: error.message };

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function uploadPractitionerPhoto(
  userId: string,
  file: LocalFile
): Promise<{ url?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `${userId}/practitioner-profile.${ext}`;

  try {
    const bytes = await readFileBytes(file.uri);
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, bytes, { contentType: file.mimeType, upsert: true });

    if (error) return { error: error.message };

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return { url: data.publicUrl };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function uploadApplicationDocument(
  applicationId: string,
  file: LocalFile,
  documentType = "supporting"
): Promise<{ path?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { error: "Supabase not configured" };

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${applicationId}/${Date.now()}-${safeName}`;

  try {
    const bytes = await readFileBytes(file.uri);
    const { error } = await supabase.storage
      .from("application-documents")
      .upload(path, bytes, { contentType: file.mimeType, upsert: false });

    if (error) return { error: error.message };
    return { path };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Upload failed" };
  }
}

export async function signedApplicationDocumentUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from("application-documents")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
