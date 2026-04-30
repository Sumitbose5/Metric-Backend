import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role for backend bypass of RLS
);

export const uploadToSupabase = async (fileBuffer: Buffer, fileName: string) => {
  // 1. Generate a unique file path (e.g., resumes/user_123/timestamp_resume.pdf)
  const filePath = `resumes/${Date.now()}_${fileName}`;

  // 2. Upload the buffer
  const { data, error } = await supabase.storage
    .from('resumes') // Your bucket name
    .upload(filePath, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) throw error;

  // 3. Get the Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('resumes')
    .getPublicUrl(filePath);

  return { publicUrl, filePath };
};