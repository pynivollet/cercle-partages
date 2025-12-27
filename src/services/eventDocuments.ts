import { supabase } from "@/integrations/supabase/client";

export interface EventDocument {
  id: string;
  event_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export const getEventDocuments = async (eventId: string): Promise<{ data: EventDocument[] | null; error: Error | null }> => {
  const { data, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  return { data, error };
};

export const uploadEventDocument = async (
  eventId: string,
  file: File,
  userId: string
): Promise<{ data: EventDocument | null; error: Error | null }> => {
  // Generate unique file path
  const fileExt = file.name.split(".").pop();
  const fileName = `${eventId}/${Date.now()}-${file.name}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from("event-documents")
    .upload(fileName, file);

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("event-documents")
    .getPublicUrl(fileName);

  // Save document metadata
  const { data, error } = await supabase
    .from("event_documents")
    .insert({
      event_id: eventId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      uploaded_by: userId,
    })
    .select()
    .single();

  return { data, error };
};

export const deleteEventDocument = async (documentId: string, fileUrl: string): Promise<{ error: Error | null }> => {
  // Extract file path from URL
  const urlParts = fileUrl.split("/event-documents/");
  if (urlParts.length > 1) {
    const filePath = urlParts[1];
    await supabase.storage.from("event-documents").remove([filePath]);
  }

  // Delete metadata
  const { error } = await supabase
    .from("event_documents")
    .delete()
    .eq("id", documentId);

  return { error };
};
