import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { token, fileBase64, fileName, taskId } = await req.json();

    if (!token || !fileBase64 || !fileName) {
      return NextResponse.json(
        { error: "token, fileBase64, and fileName are required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate magic link token
    const { data: assignment, error: assignError } = await supabase
      .from("job_assignments")
      .select("id, job_id, subcontractor_id")
      .eq("magic_link_token", token)
      .single();

    if (assignError || !assignment) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Upload to storage
    const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = `${assignment.job_id}/completion/${Date.now()}_${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("job_photos")
      .upload(filePath, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Upload failed: " + uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("job_photos").getPublicUrl(filePath);

    // Save photo record
    const { data: photo, error: dbError } = await supabase
      .from("job_photos")
      .insert({
        job_id: assignment.job_id,
        url: publicUrl,
        type: "completion",
        caption: fileName,
      })
      .select("id")
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: "DB insert failed: " + dbError.message },
        { status: 500 }
      );
    }

    // Optionally link to task
    if (taskId && photo) {
      await supabase.from("task_photo_links").insert({
        task_id: taskId,
        photo_id: photo.id,
      });
    }

    return NextResponse.json({
      success: true,
      photoId: photo?.id,
      url: publicUrl,
    });
  } catch (error: any) {
    console.error("Sub portal upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
