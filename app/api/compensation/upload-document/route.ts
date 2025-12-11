import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const DEV_USER_ID = process.env.DEV_SUPABASE_USER_ID!; // same as cases

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const docType = String(formData.get("docType") || "other");
    const description =
      typeof formData.get("description") === "string"
        ? (formData.get("description") as string)
        : null;

    // Build a safe storage path
    const ext = file.name.includes(".")
      ? file.name.substring(file.name.lastIndexOf(".") + 1)
      : "bin";

    const path = `${DEV_USER_ID}/unassigned/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    // 1) Upload file to Supabase Storage
    const { error: uploadError } = await supabaseServer.storage
      .from("case-documents")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("Supabase storage upload error", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // 2) Insert metadata into documents table (case_id is null for now)
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
        storage_path: path,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Supabase documents insert error", insertError);
      return NextResponse.json(
        { error: "Failed to save document metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json({ document: data });
  } catch (err) {
    console.error("Error in upload-document route", err);
    return NextResponse.json(
      { error: "Unexpected error processing upload" },
      { status: 500 }
    );
  }
}