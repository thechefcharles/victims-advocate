import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs"; // ✅ storage upload + fs-safe if ever needed

const DEV_USER_ID = process.env.DEV_SUPABASE_USER_ID!;

export async function POST(req: Request) {
  try {
    const supabaseServer = getSupabaseServer(); // ✅ create per-request

    const formData = await req.formData();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const docType = String(formData.get("docType") || "other");
    const description =
      typeof formData.get("description") === "string"
        ? (formData.get("description") as string)
        : null;

    const ext = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf(".") + 1)
      : "bin";

    const storagePath = `${DEV_USER_ID}/unassigned/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabaseServer.storage
      .from("case-documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("Supabase storage upload error", uploadError);
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
    }

    const { data, error: insertError } = await supabaseServer
      .from("documents")
      .insert({
        case_id: null,
        uploaded_by_user_id: DEV_USER_ID,
        doc_type: docType,
        description,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        storage_path: storagePath,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Supabase documents insert error", insertError);
      return NextResponse.json({ error: "Failed to save document metadata" }, { status: 500 });
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error("Error in upload-document route", err);
    return NextResponse.json({ error: "Unexpected error processing upload" }, { status: 500 });
  }
}