import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseRouteAuth } from "@/lib/supabaseRoute";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const supabaseAuth = getSupabaseRouteAuth();
    const { data: authData } = await supabaseAuth.auth.getUser();
    console.log("[UPLOAD] auth user:", authData.user?.id);

    if (!authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authData.user.id;
    const supabaseAdmin = getSupabaseAdmin();

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

    const storagePath = `${userId}/unassigned/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
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

    const { data, error: insertError } = await supabaseAdmin
      .from("documents")
      .insert({
        case_id: null,
        uploaded_by_user_id: userId,
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
} catch (err: any) {
  console.error("Error in upload-document route", err);
  return NextResponse.json(
    { error: "Unexpected error processing upload", details: err?.message ?? String(err) },
    { status: 500 }
  );
}
}