import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InvokeOptions<T = any> {
  body?: T;
  signal?: AbortSignal;
}

export async function invokeSecureFunction<TResponse = any, TBody = any>(
  functionName: string,
  options: InvokeOptions<TBody> = {}
) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    toast.error("Votre session a expiré. Veuillez vous reconnecter.");
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase.functions.invoke<TResponse>(
    functionName,
    {
      body: options.body,
      signal: options.signal,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  if (error) {
    if (error.status === 401) {
      await supabase.auth.signOut();
    }
    throw error;
  }

  return data;
}
