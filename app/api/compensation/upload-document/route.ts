import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ✅ 1) Require Authorization Bearer token
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized (missing token)" },
        { status: 401 }
      );
    }

    // ✅ 2) Verify token using anon client
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } =
      await supabaseAnon.auth.getUser(accessToken);

    if (authError || !authData.user) {
      console.error("[UPLOAD] auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized (invalid token)" },
        { status: 401 }
      );
    }

    const userId = authData.user.id;
    console.log("[UPLOAD] userId:", userId);

    // ✅ 3) Parse form data
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

    // ✅ 4) Upload to storage using service role (admin)
    const supabaseAdmin = getSupabaseAdmin();

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
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // ✅ 5) Insert document row owned by this userId
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
      return NextResponse.json(
        { error: "Failed to save document metadata", details: insertError },
        { status: 500 }
      );
    }

    return NextResponse.json({ document: data });
  } catch (err: any) {
    console.error("❌ Error in upload-document route", err);
    return NextResponse.json(
      {
        error: "Unexpected error processing upload",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}