import type { LocalFile } from "@/lib/storageUpload";
import {
  signedApplicationDocumentUrl,
  uploadApplicationDocument,
} from "@/lib/storageUpload";
import { getSupabase } from "@/lib/supabase";

export type ApplicationDocument = {
  id: string;
  applicationId: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: string;
  signedUrl?: string;
};

type DbApplicationDocumentRow = {
  id: string;
  application_id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  uploaded_at: string;
};

function mapRow(row: DbApplicationDocumentRow): ApplicationDocument {
  return {
    id: row.id,
    applicationId: row.application_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    documentType: row.document_type,
    uploadedAt: row.uploaded_at,
  };
}

export async function uploadApplicationDocuments(
  applicationId: string,
  files: LocalFile[],
  documentType = "supporting"
): Promise<{ uploaded: number; errors: string[] }> {
  const supabase = getSupabase();
  if (!supabase) return { uploaded: 0, errors: ["Supabase not configured"] };

  let uploaded = 0;
  const errors: string[] = [];

  for (const file of files) {
    const result = await uploadApplicationDocument(applicationId, file, documentType);
    if (result.error || !result.path) {
      errors.push(result.error ?? `Could not upload ${file.name}`);
      continue;
    }

    const { error } = await supabase.from("application_documents").insert({
      application_id: applicationId,
      file_name: file.name,
      file_url: result.path,
      document_type: documentType,
    });

    if (error) {
      errors.push(error.message);
      continue;
    }
    uploaded += 1;
  }

  return { uploaded, errors };
}

export async function fetchApplicationDocuments(
  applicationId: string
): Promise<ApplicationDocument[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("application_documents")
    .select("*")
    .eq("application_id", applicationId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[applicationDocumentsService] fetch:", error.message);
    return [];
  }

  const rows = (data ?? []) as DbApplicationDocumentRow[];
  const docs = rows.map(mapRow);

  return Promise.all(
    docs.map(async (doc) => {
      const signedUrl = await signedApplicationDocumentUrl(doc.fileUrl);
      return signedUrl ? { ...doc, signedUrl } : doc;
    })
  );
}
