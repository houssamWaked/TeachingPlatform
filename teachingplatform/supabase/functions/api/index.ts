import { db, requireAdmin, requireStudent } from "../_shared/auth.ts";
import {
  cookie,
  corsHeaders,
  json,
  readCookie,
  sha256,
} from "../_shared/http.ts";

const routePath = (url: string) =>
  new URL(url).pathname
    .replace(/^\/api/, "")
    .replace(/^\/functions\/v1\/api/, "") || "/";
const randomCode = () =>
  crypto
    .randomUUID()
    .replaceAll("-", "")
    .slice(0, 8)
    .toUpperCase()
    .replace(/(.{4})/, "$1-");
const fail = (message: string, status = 400) =>
  json({ error: message }, status);
const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const hmacHex = async (secret: string, message: string) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))));
};
const lessonHasContentVideo = (content: unknown): boolean => {
  if (!content || typeof content !== "object") return false;
  if (Array.isArray(content)) return content.some(lessonHasContentVideo);
  const record = content as Record<string, unknown>;
  if (record.type === "video" && typeof record.videoId === "string" && record.videoId) return true;
  return Object.values(record).some(lessonHasContentVideo);
};
const lessonShape = (
  lesson: Record<string, unknown>,
  progress?: Record<string, boolean>,
) => {
  const p = progress ?? {
    video_watched: false,
    pdf_viewed: false,
    questions_completed: false,
    manual_completed: false,
  };
  const count = [p.video_watched, p.pdf_viewed, p.questions_completed].filter(Boolean).length;
  const total = [lesson.video_id || lessonHasContentVideo(lesson.content), lesson.pdf_path || lesson.word_path || lessonHasContentDocument(lesson.content), (lesson.questions as unknown[] | undefined)?.length].filter(Boolean).length;
  return {
    ...lesson,
    duration: "Lesson",
    progress: p,
    progressPercent: p.manual_completed ? 100 : Math.round((count / Math.max(total, 1)) * 100),
    status: p.manual_completed || (total > 0 && count >= total) ? "completed" : count ? "in_progress" : "not_started",
  };
};
const lessonReferencesImage = (content: unknown, imagePath: string) => {
  if (!/^lessons\/images\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(imagePath)) return false;
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(visit);
    const record = value as Record<string, unknown>;
    if (record.type === "image" && record.url === imagePath) return true;
    if (record.backgroundImage === imagePath || record.cardImage === imagePath) return true;
    return Object.values(record).some(visit);
  };
  return visit(content);
};
const lessonReferencesDocument = (content: unknown, documentPath: string) => {
  const extension = documentPath.toLowerCase().endsWith(".docx") ? "docx" : documentPath.toLowerCase().endsWith(".pdf") ? "pdf" : "";
  if (!extension || !new RegExp(`^lessons/[a-f0-9-]+\\.${extension}$`, "i").test(documentPath)) return false;
  const expectedType = extension === "docx" ? "word" : "pdf";
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(visit);
    const record = value as Record<string, unknown>;
    if (record.type === expectedType && record.filePath === documentPath) return true;
    return Object.values(record).some(visit);
  };
  return visit(content);
};
const lessonHasContentDocument = (content: unknown): boolean => {
  if (!content || typeof content !== "object") return false;
  if (Array.isArray(content)) return content.some(lessonHasContentDocument);
  const record = content as Record<string, unknown>;
  if ((record.type === "pdf" || record.type === "word") && typeof record.filePath === "string" && record.filePath) return true;
  return Object.values(record).some(lessonHasContentDocument);
};
const lessonHasDocument = (lesson: Record<string, unknown>, documentPath: string) =>
  lesson.pdf_path === documentPath || lesson.word_path === documentPath || lessonReferencesDocument(lesson.content, documentPath);
const lessonHasVideo = (lesson: Record<string, unknown>, videoId: string) => {
  if (lesson.video_id === videoId) return true;
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) return value.some(visit);
    const record = value as Record<string, unknown>;
    if (record.type === "video" && record.videoId === videoId) return true;
    return Object.values(record).some(visit);
  };
  return visit(lesson.content);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  const path = routePath(req.url);
  try {
    if (path === "/redeem-code" && req.method === "POST") {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
      const ipHash = await sha256(ip);
      const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
      const { count } = await db
        .from("redemption_attempts")
        .select("*", { head: true, count: "exact" })
        .eq("ip_hash", ipHash)
        .gte("attempted_at", cutoff);
      if ((count ?? 0) >= 10)
        return fail("Too many attempts. Try again in 15 minutes.", 429);
      await db.from("redemption_attempts").insert({ ip_hash: ipHash });
      const body = await req.json();
      const fingerprint =
        req.headers.get("x-device-fingerprint") ?? body.fingerprint;
      const studentName = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim() : "";
      if (!body.code || !fingerprint || !studentName)
        return fail("Code, name, and device fingerprint are required.");
      if (studentName.length > 80)
        return fail("Name must be 80 characters or fewer.");
      const rawToken = crypto.randomUUID() + crypto.randomUUID();
      const tokenHash = await sha256(rawToken);
      const { error } = await db.rpc("redeem_access_code", {
        p_code: body.code,
        p_device_id: fingerprint,
        p_token_hash: tokenHash,
        p_student_name: studentName,
      });
      if (error)
        return fail(
          error.message.includes("CODE_ALREADY_USED")
            ? "This code is already locked to another device."
            : "This code is invalid or has already been used.",
          403,
        );
      const headers = new Headers(corsHeaders);
      headers.append("Set-Cookie", cookie("lp_session", rawToken));
      headers.append(
        "Set-Cookie",
        cookie("lp_hint", "1", 60 * 60 * 24 * 30, false),
      );
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers,
      });
    }

    if (path === "/logout" && req.method === "POST") {
      const token = readCookie(req, "lp_session");
      if (token)
        await db
          .from("students")
          .update({ session_token: null })
          .eq("session_token", await sha256(token));
      const headers = new Headers(corsHeaders);
      headers.append("Set-Cookie", cookie("lp_session", "", 0));
      headers.append("Set-Cookie", cookie("lp_hint", "", 0, false));
      return new Response(null, { status: 204, headers });
    }

    if (path === "/admin/login" && req.method === "POST") {
      const { password } = await req.json();
      if (!password || password !== Deno.env.get("ADMIN_PASSWORD"))
        return fail("Incorrect password.", 401);
      const token = await sha256(`lesson-portal-admin:${password}`);
      return json({ ok: true }, 200, {
        "Set-Cookie": cookie("lp_admin", token, 60 * 60 * 8),
      });
    }

    if (path.startsWith("/admin/")) {
      await requireAdmin(req);
      if (path === "/admin/forensics/resolve" && req.method === "POST") {
        const { watermark_code } = await req.json();
        if (typeof watermark_code !== "string" || watermark_code.length > 80) return fail("Enter a valid watermark code.");
        const normalizedCode = watermark_code.trim().toUpperCase().replace(/\s+/g, "");
        const isFullCode = /^W-[0-9A-F?]{12}-[0-9A-F?]{10}$/.test(normalizedCode);
        if (!isFullCode && !/^[W0-9A-F?*-]+$/.test(normalizedCode)) {
          return fail("Enter a full watermark code or a fragment containing only its visible characters, ? for one unreadable character, and * for an unknown-length gap.");
        }
        const readableCharacters = normalizedCode.replace(/[^0-9A-F]/g, "").length;
        if (readableCharacters < 8) return fail("Enter at least 8 readable hexadecimal characters; use ? for unreadable characters.");
        const selectedFields = "watermark_code,integrity_tag,student_id,lesson_id,session_hash,issued_at,watermark_version";
        const hasWildcards = normalizedCode.includes("?") || normalizedCode.includes("*");
        const pattern = normalizedCode.replaceAll("?", "_").replaceAll("*", "%");
        const queryPattern = isFullCode ? pattern : `%${pattern}%`;
        const { data: matches, error } = isFullCode && !hasWildcards
          ? await db.from("forensic_watermarks").select(selectedFields).eq("watermark_code", normalizedCode).limit(2)
          : await db.from("forensic_watermarks").select(selectedFields).ilike("watermark_code", queryPattern).limit(2);
        if (error) throw error;
        if (!matches?.length) return json({ detected: false, reason: "NO_MATCHING_RECORD", classification: "INCONCLUSIVE", integrity: "UNKNOWN", confidence: 0, extraction_quality: "LOW" });
        if (matches.length > 1) return json({ detected: false, reason: "AMBIGUOUS_PARTIAL_CODE", classification: "INCONCLUSIVE", integrity: "UNKNOWN", confidence: 0, extraction_quality: "LOW" });
        const record = matches[0];
        const canonicalIssuedAt = new Date(record.issued_at).toISOString();
        const expected = await hmacHex(Deno.env.get("FORENSIC_WATERMARK_SECRET") ?? "", `${record.watermark_code.split("-").slice(0, 2).join("-")}|${record.student_id}|${record.lesson_id}|${record.session_hash}|${canonicalIssuedAt}`);
        const valid = Boolean(Deno.env.get("FORENSIC_WATERMARK_SECRET")) && expected === record.integrity_tag && record.watermark_code.endsWith(expected.slice(0, 10).toUpperCase());
        if (!valid) return json({ detected: true, watermark_id: record.watermark_code, classification: "INCONCLUSIVE", integrity: "INVALID", confidence: 20, extraction_quality: "LOW" });
        const { data: learner, error: learnerError } = await db.from("students").select("id,name").eq("id", record.student_id).maybeSingle();
        if (learnerError) throw learnerError;
        return json({ detected: true, watermark_id: record.watermark_code, content_id: record.lesson_id, session_id: record.session_hash.slice(0, 12), student_id: learner?.id ?? record.student_id, student_name: learner?.name ?? "Unknown learner", timestamp: record.issued_at, classification: "CONFIRMED", integrity: "VALID", confidence: 100, extraction_quality: "HIGH", requires_human_review: true });
      }
      if (path === "/admin/video-upload-credentials" && req.method === "POST") {
        const { title } = await req.json();
        if (!title || typeof title !== "string")
          return fail("A video title is required.");
        const library = Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
        const key = Deno.env.get("BUNNY_STREAM_API_KEY");
        if (!library || !key) return fail("Bunny Stream is not configured.", 500);
        const response = await fetch(`https://video.bunnycdn.com/library/${library}/videos`, {
          method: "POST",
          headers: {
            AccessKey: key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title: title.trim() }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          console.error("Bunny video creation failed", response.status, data);
          return fail("Unable to create the Bunny Stream video.", 502);
        }
        return json({ videoId: data.guid });
      }
      const adminDocument = path.match(/^\/admin\/lessons\/([^/]+)\/document-url\/?$/);
      if (adminDocument && req.method === "POST") {
        const { path: documentPath = "" } = await req.json();
        const { data: lesson, error } = await db.from("lessons")
          .select("content,pdf_path,word_path")
          .eq("id", adminDocument[1])
          .single();
        if (error) throw error;
        if (typeof documentPath !== "string" || !lessonHasDocument(lesson, documentPath))
          return fail("This document is not attached to this lesson.", 404);
        const { data: signed, error: signError } = await db.storage.from("lesson-pdfs").createSignedUrl(documentPath, 300);
        if (signError) throw signError;
        return json({ url: signed.signedUrl, expires_in: 300 });
      }
      const adminLessonMedia = path.match(/^\/admin\/lessons\/([^/]+)\/(video-url|pdf-url|word-url)\/?$/);
      if (adminLessonMedia && req.method === "POST") {
        const { data: lesson, error } = await db
          .from("lessons")
          .select("video_id,pdf_path,word_path,content")
          .eq("id", adminLessonMedia[1])
          .single();
        if (error) throw error;
        if (adminLessonMedia[2] === "pdf-url") {
          if (!lesson.pdf_path) return fail("This lesson has no PDF attached.", 404);
          const { data: signed, error: signError } = await db.storage
            .from("lesson-pdfs")
            .createSignedUrl(lesson.pdf_path, 300);
          if (signError) throw signError;
          return json({ url: signed.signedUrl, expires_in: 300 });
        }
        if (adminLessonMedia[2] === "word-url") {
          if (!lesson.word_path) return fail("This lesson has no Word document attached.", 404);
          const { data: signed, error: signError } = await db.storage
            .from("lesson-pdfs")
            .createSignedUrl(lesson.word_path, 300);
          if (signError) throw signError;
          return json({ url: signed.signedUrl, expires_in: 300 });
        }
        const requestedVideoId = (await req.json().catch(() => ({}))).video_id as string | undefined;
        const videoId = requestedVideoId || lesson.video_id;
        if (!videoId || !lessonHasVideo(lesson, videoId)) return fail("This video is not attached to this lesson.", 404);
        const library = Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
        const signingKey = Deno.env.get("BUNNY_STREAM_SIGNING_KEY");
        if (!library || !signingKey) return fail("Bunny Stream is not configured.", 500);
        const expires = Math.floor(Date.now() / 1000) + 12 * 60;
        const digest = new Uint8Array(await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${signingKey}${videoId}${expires}`),
        ));
        const token = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
        return json({
          url: `https://iframe.mediadelivery.net/embed/${encodeURIComponent(library)}/${encodeURIComponent(videoId)}?token=${token}&expires=${expires}`,
          expires_in: 720,
        });
      }
      const adminLessonImage = path.match(/^\/admin\/lessons\/([0-9a-f-]+)\/image-url$/);
      if (adminLessonImage && req.method === "POST") {
        const imagePath = new URL(req.url).searchParams.get("path") ?? "";
        if (!/^lessons\/images\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(imagePath)) return fail("Invalid lesson image path.", 404);
        const { data: signed, error: signError } = await db.storage.from("lesson-pdfs").createSignedUrl(imagePath, 300);
        if (signError) throw signError;
        return json({ url: signed.signedUrl, expires_in: 300 });
      }
      if (path === "/admin/videos" && req.method === "POST") {
        const form = await req.formData();
        const videoId = form.get("videoId");
        const file = form.get("file");
        if (typeof videoId !== "string" || !(file instanceof File)) return fail("Video ID and file are required.");
        if (file.size > 5 * 1024 * 1024 * 1024) return fail("Video must be 5 GB or smaller.");
        const library = Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
        const key = Deno.env.get("BUNNY_STREAM_API_KEY");
        const response = await fetch(`https://video.bunnycdn.com/library/${library}/videos/${encodeURIComponent(videoId)}`, {
          method: "PUT", headers: { AccessKey: key!, "Content-Type": "application/octet-stream" }, body: file.stream(),
        });
        if (!response.ok) {
          console.error("Bunny video upload failed", response.status, await response.text());
          return fail("Bunny Stream rejected the video upload.", 502);
        }
        return json({ ok: true });
      }
      if (path === "/admin/pdfs" && req.method === "POST") {
        const form = await req.formData();
        const file = form.get("file");
        const extension = file instanceof File ? file.name.split(".").pop()?.toLowerCase() : "";
        const allowedTypes: Record<string, string> = {
          pdf: "application/pdf",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
        if (!(file instanceof File) || !extension || !allowedTypes[extension])
          return fail("Choose a PDF or Word (.docx) document.");
        if (file.size > 20 * 1024 * 1024)
          return fail("Documents must be 20 MB or smaller.");
        const contentType = allowedTypes[extension];
        if (file.type && file.type !== contentType)
          return fail("The document file type does not match its extension.");
        if (extension === "docx") {
          const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
          const tail = new Uint8Array(await file.slice(Math.max(0, file.size - 65_557)).arrayBuffer());
          const hasZipHeader = header[0] === 0x50 && header[1] === 0x4b && (header[2] === 0x03 || header[2] === 0x05 || header[2] === 0x07);
          const hasDirectory = tail.some((byte, index) => byte === 0x50 && tail[index + 1] === 0x4b && tail[index + 2] === 0x05 && tail[index + 3] === 0x06);
          if (!hasZipHeader || !hasDirectory)
            return fail("This is not a valid .docx file. In Word, save or export it as Word Document (.docx), then upload it again.");
        }
        const path = `lessons/${crypto.randomUUID()}.${extension}`;
        const { error } = await db.storage
          .from("lesson-pdfs")
          .upload(path, file, {
            contentType,
            upsert: false,
          });
        if (error) throw error;
        return json({ path }, 201);
      }
      if (path === "/admin/images" && req.method === "POST") {
        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return fail("Choose an image file.");
        const imageTypes: Record<string, { extension: string; mime: string }> = {
          "image/jpeg": { extension: "jpg", mime: "image/jpeg" },
          "image/png": { extension: "png", mime: "image/png" },
          "image/webp": { extension: "webp", mime: "image/webp" },
        };
        const imageType = imageTypes[file.type];
        if (!imageType) return fail("Images must be JPEG, PNG, or WebP.");
        if (file.size > 8 * 1024 * 1024) return fail("Images must be 8 MB or smaller.");
        const imagePath = `lessons/images/${crypto.randomUUID()}.${imageType.extension}`;
        const { error } = await db.storage.from("lesson-pdfs").upload(imagePath, file, { contentType: imageType.mime, upsert: false });
        if (error) throw error;
        return json({ path: imagePath }, 201);
      }
      if (path === "/admin/lessons" && req.method === "GET") {
        const { data, error } = await db
          .from("lessons")
          .select("*,questions(*)")
          .order("order_index");
        if (error) throw error;
        return json((data ?? []).map((l) => lessonShape(l)));
      }
      if (path === "/admin/lessons" && req.method === "POST") {
        const body = await req.json();
        const { count } = await db
          .from("lessons")
          .select("*", { head: true, count: "exact" });
        const { data, error } = await db
          .from("lessons")
          .insert({
            title: String(body.title ?? "").trim(),
            description: String(body.description ?? "").trim(),
            video_id: "",
            pdf_path: "",
            word_path: "",
            content: { blocks: [], sections: [] },
            published: false,
            order_index: (count ?? 0) + 1,
          })
          .select("*,questions(*)")
          .single();
        if (error) throw error;
        return json(lessonShape(data), 201);
      }
      const lessonUpdate = path.match(/^\/admin\/lessons\/([0-9a-f-]+)$/);
      const lessonQuestions = path.match(/^\/admin\/lessons\/([0-9a-f-]+)\/questions$/);
      if (lessonQuestions && req.method === "PUT") {
        const { questions } = await req.json();
        if (!Array.isArray(questions) || questions.length > 100)
          return fail("Provide up to 100 quiz questions.");
        const rows = [];
        for (const question of questions) {
          if (!question || typeof question.id !== "string" || !/^[0-9a-f-]{36}$/i.test(question.id) || typeof question.question_text !== "string" || !question.question_text.trim())
            return fail("Every question needs an ID and question text.");
          if (!["text", "multiple_choice"].includes(question.question_type))
            return fail("Choose multiple choice or enter an answer for each question.");
          const options = question.question_type === "multiple_choice" ? question.options : null;
          if (question.question_type === "multiple_choice" && (!Array.isArray(options) || options.length < 2 || options.length > 6 || options.some((option: unknown) => typeof option !== "string" || !option.trim())))
            return fail("Multiple-choice questions need 2–6 non-empty choices.");
          if (question.question_type === "multiple_choice" && (!options.includes(question.correct_answer) || typeof question.correct_answer !== "string"))
            return fail("Choose the correct answer for each multiple-choice question.");
          rows.push({
            id: question.id,
            lesson_id: lessonQuestions[1],
            question_text: question.question_text.trim(),
            question_type: question.question_type,
            options,
            correct_answer: question.question_type === "multiple_choice" ? question.correct_answer : null,
          });
        }
        if (rows.length) {
          const { error } = await db.from("questions").upsert(rows, { onConflict: "id" });
          if (error) throw error;
        }
        const { data: current, error: readError } = await db.from("questions").select("id").eq("lesson_id", lessonQuestions[1]);
        if (readError) throw readError;
        const keepIds = new Set(rows.map((question) => question.id));
        const removeIds = (current ?? []).map((question) => question.id).filter((id) => !keepIds.has(id));
        if (removeIds.length) {
          const { error } = await db.from("questions").delete().eq("lesson_id", lessonQuestions[1]).in("id", removeIds);
          if (error) throw error;
        }
        const { data, error } = await db.from("questions").select("*").eq("lesson_id", lessonQuestions[1]).order("id");
        if (error) throw error;
        return json(data ?? []);
      }
      if (lessonUpdate && req.method === "PATCH") {
        const body = await req.json();
        if (body.content !== undefined && JSON.stringify(body.content).length > 500_000)
          return fail("Lesson content is too large.", 413);
        const update: Record<string, unknown> = {};
        if (typeof body.title === "string") update.title = body.title.trim();
        if (typeof body.description === "string") update.description = body.description.trim();
        if (typeof body.video_id === "string") update.video_id = body.video_id;
        if (typeof body.pdf_path === "string") update.pdf_path = body.pdf_path;
        if (typeof body.word_path === "string") update.word_path = body.word_path;
        if (typeof body.published === "boolean") update.published = body.published;
        if (body.content && typeof body.content === "object") update.content = body.content;
        const { data, error } = await db
          .from("lessons")
          .update(update)
          .eq("id", lessonUpdate[1])
          .select("*,questions(*)")
          .single();
        if (error) throw error;
        return json(lessonShape(data));
      }
      const lessonDelete = path.match(/^\/admin\/lessons\/([0-9a-f-]+)$/);
      if (lessonDelete && req.method === "DELETE") {
        const { error } = await db
          .from("lessons")
          .delete()
          .eq("id", lessonDelete[1]);
        if (error) throw error;
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      if (path === "/admin/codes" && req.method === "POST") {
        const { count = 1 } = await req.json();
        const safe = Math.min(Math.max(Number(count), 1), 100);
        const rows = Array.from({ length: safe }, () => ({
          code: randomCode(),
        }));
        const { data, error } = await db
          .from("codes")
          .insert(rows)
          .select("code");
        if (error) throw error;
        return json(
          (data ?? []).map((x) => x.code),
          201,
        );
      }
      if (path === "/admin/students" && req.method === "GET") {
        const { data, error } = await db
          .from("students")
          .select(
            "id,name,device_id,codes!students_code_id_fkey(code),progress(questions_completed)",
          );
        if (error) throw error;
        return json(
          (data ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            code: (s.codes as { code: string })?.code,
            device_locked: Boolean(s.device_id),
            completed:
              (s.progress as { questions_completed: boolean }[])?.filter(
                (p) => p.questions_completed,
              ).length ?? 0,
          })),
        );
      }
      const lessonAnswers = path.match(/^\/admin\/lessons\/([^/]+)\/answers\/?$/);
      if (lessonAnswers && req.method === "GET") {
        const { data, error } = await db
          .from("answers")
          .select("id,student_id,question_id,answer_text,submitted_at,students(name),questions!inner(lesson_id,question_text,question_type)")
          .eq("questions.lesson_id", lessonAnswers[1])
          .order("submitted_at", { ascending: false });
        if (error) throw error;
        return json((data ?? []).map((answer) => ({
          id: answer.id,
          student_id: answer.student_id,
          student_name: (answer.students as { name: string } | null)?.name ?? "Student",
          question_id: answer.question_id,
          question_text: (answer.questions as { question_text: string }).question_text,
          question_type: (answer.questions as { question_type: string }).question_type,
          answer_text: answer.answer_text,
          submitted_at: answer.submitted_at,
        })));
      }
      const reset = path.match(
        /^\/admin\/students\/([0-9a-f-]+)\/reset-device$/,
      );
      if (reset && req.method === "POST") {
        const { error } = await db
          .from("students")
          .update({
            device_id: null,
            device_locked_at: null,
            session_token: null,
          })
          .eq("id", reset[1]);
        if (error) throw error;
        return json({ ok: true });
      }
      return fail("Admin route not found.", 404);
    }

    const student = await requireStudent(req);
    const watermark = path.match(/^\/lessons\/([0-9a-f-]+)\/watermark$/);
    if (watermark && req.method === "POST") {
      const { data: lesson, error } = await db.from("lessons").select("id").eq("id", watermark[1]).eq("published", true).maybeSingle();
      if (error) throw error;
      if (!lesson) return fail("Lesson not found.", 404);
      const secret = Deno.env.get("FORENSIC_WATERMARK_SECRET");
      if (!secret) return fail("Forensic watermarking is not configured.", 503);
      const randomId = hex(crypto.getRandomValues(new Uint8Array(6))).toUpperCase();
      const sessionHash = await sha256(readCookie(req, "lp_session") ?? "");
      const issuedAt = new Date().toISOString();
      const integrityTag = await hmacHex(secret, `W-${randomId}|${student.id}|${lesson.id}|${sessionHash}|${issuedAt}`);
      const watermarkCode = `W-${randomId}-${integrityTag.slice(0, 10).toUpperCase()}`;
      const { error: insertError } = await db.from("forensic_watermarks").insert({ watermark_code: watermarkCode, integrity_tag: integrityTag, student_id: student.id, lesson_id: lesson.id, session_hash: sessionHash, issued_at: issuedAt });
      if (insertError) throw insertError;
      return json({ watermark_code: watermarkCode });
    }
    if (path === "/capture-events" && req.method === "POST") {
      const body = await req.json();
      const allowed = new Set(["SCREEN_SHARING_DETECTED", "SCREEN_SHARING_ENDED", "UNKNOWN_CAPTURE_SUSPICION", "SCREENSHOT_SHORTCUT_OBSERVED"]);
      if (!allowed.has(body.capture_type) || typeof body.lesson_id !== "string") return fail("Invalid capture event.");
      const { data: lesson, error: lessonError } = await db.from("lessons").select("id").eq("id", body.lesson_id).eq("published", true).maybeSingle();
      if (lessonError) throw lessonError;
      if (!lesson) return fail("Lesson not found.", 404);
      const { error } = await db.from("capture_events").insert({ student_id: student.id, lesson_id: lesson.id, platform: "web", capture_type: body.capture_type, capture_state: String(body.capture_state ?? "UNKNOWN").slice(0, 40), response: String(body.response ?? "NONE").slice(0, 80) });
      if (error) throw error;
      return json({ ok: true }, 201);
    }
    if (path === "/lessons" && req.method === "GET") {
      const [{ data: lessons, error }, { data: progress }] = await Promise.all([
        db.from("lessons").select("*,questions(id,question_text,question_type,options)").eq("published", true).order("order_index"),
        db.from("progress").select("*").eq("student_id", student.id),
      ]);
      if (error) throw error;
      return json(
        (lessons ?? []).map((l) =>
          lessonShape(
            l,
            (progress ?? []).find((p) => p.lesson_id === l.id),
          ),
        ),
      );
    }
    const lessonId = path.match(/^\/lessons\/([0-9a-f-]+)$/);
    if (lessonId && req.method === "GET") {
      const [{ data: lesson, error }, { data: progress }] = await Promise.all([
        db
          .from("lessons")
          .select("*,questions(id,question_text,question_type,options)")
          .eq("id", lessonId[1])
          .eq("published", true)
          .single(),
        db
          .from("progress")
          .select("*")
          .eq("student_id", student.id)
          .eq("lesson_id", lessonId[1])
          .maybeSingle(),
      ]);
      if (error) throw error;
      return json(lessonShape(lesson, progress ?? undefined));
    }
    const lessonDocument = path.match(/^\/lessons\/([0-9a-f-]+)\/document$/);
    if (lessonDocument && req.method === "GET") {
      const documentPath = new URL(req.url).searchParams.get("path") ?? "";
      const { data: lesson, error } = await db.from("lessons")
        .select("content,pdf_path,word_path")
        .eq("id", lessonDocument[1])
        .eq("published", true)
        .single();
      if (error) throw error;
      if (!lessonHasDocument(lesson, documentPath)) return fail("This document is not attached to this lesson.", 404);
      const { data: signed, error: signError } = await db.storage.from("lesson-pdfs").createSignedUrl(documentPath, 300);
      if (signError) throw signError;
      return json({ url: signed.signedUrl, expires_in: 300 });
    }
    const pdf = path.match(/^\/lessons\/([0-9a-f-]+)\/pdf$/);
    if (pdf && req.method === "GET") {
      const { data: lesson, error } = await db
        .from("lessons")
        .select("pdf_path")
        .eq("id", pdf[1])
        .eq("published", true)
        .single();
      if (error) throw error;
      if (!lesson.pdf_path) return fail("This lesson has no PDF attached.", 404);
      const { data: signed, error: signError } = await db.storage
        .from("lesson-pdfs")
        .createSignedUrl(lesson.pdf_path, 300);
      if (signError) throw signError;
      return json({ url: signed.signedUrl, expires_in: 300 });
    }
    const word = path.match(/^\/lessons\/([0-9a-f-]+)\/word$/);
    if (word && req.method === "GET") {
      const { data: lesson, error } = await db
        .from("lessons")
        .select("word_path")
        .eq("id", word[1])
        .eq("published", true)
        .single();
      if (error) throw error;
      if (!lesson.word_path) return fail("This lesson has no Word document attached.", 404);
      const { data: signed, error: signError } = await db.storage
        .from("lesson-pdfs")
        .createSignedUrl(lesson.word_path, 300);
      if (signError) throw signError;
      return json({ url: signed.signedUrl, expires_in: 300 });
    }
    const lessonImage = path.match(/^\/lessons\/([0-9a-f-]+)\/image$/);
    if (lessonImage && req.method === "GET") {
      const imagePath = new URL(req.url).searchParams.get("path") ?? "";
      const { data: lesson, error } = await db.from("lessons").select("content").eq("id", lessonImage[1]).eq("published", true).single();
      if (error) throw error;
      if (!lessonReferencesImage(lesson.content, imagePath)) return fail("Image is not used by this lesson.", 404);
      const { data: signed, error: signError } = await db.storage.from("lesson-pdfs").createSignedUrl(imagePath, 300);
      if (signError) throw signError;
      return json({ url: signed.signedUrl, expires_in: 300 });
    }
    if (path === "/submit-answers" && req.method === "POST") {
      const { lesson_id, answers } = await req.json();
      if (!Array.isArray(answers) || answers.length === 0)
        return fail("Answer at least one quiz question.");
      const qids = (answers ?? []).map(
        (a: { question_id: string }) => a.question_id,
      );
      const { data: valid, error: questionError } = await db
        .from("questions")
        .select("id,question_type,correct_answer")
        .eq("lesson_id", lesson_id);
      if (questionError) throw questionError;
      if ((valid ?? []).length !== qids.length || new Set(qids).size !== qids.length || (valid ?? []).some((question) => !qids.includes(question.id)))
        return fail("One or more questions do not belong to this lesson.");
      const { error } = await db.from("answers").upsert(
        answers.map((a: { question_id: string; answer_text: string }) => ({
          ...a,
          student_id: student.id,
          submitted_at: new Date().toISOString(),
        })),
        { onConflict: "student_id,question_id" },
      );
      if (error) throw error;
      const correctCount = (valid ?? []).filter((question) => {
        if (question.question_type !== "multiple_choice" || !question.correct_answer) return false;
        const answer = answers.find((item: { question_id: string }) => item.question_id === question.id);
        return answer?.answer_text === question.correct_answer;
      }).length;
      const gradedCount = (valid ?? []).filter((question) => question.question_type === "multiple_choice" && question.correct_answer).length;
      return json({ ok: true, correct_count: correctCount, graded_count: gradedCount, written_count: (valid ?? []).filter((question) => question.question_type === "text").length });
    }
    const video = path.match(/^\/lessons\/([0-9a-f-]+)\/video-url$/);
    if (video && req.method === "POST") {
      const { data: lesson, error } = await db
        .from("lessons")
        .select("video_id,content")
        .eq("id", video[1])
        .eq("published", true)
        .single();
      if (error) throw error;
      const requestedVideoId = (await req.json().catch(() => ({}))).video_id as string | undefined;
      const videoId = requestedVideoId || lesson.video_id;
      if (!videoId || !lessonHasVideo(lesson, videoId)) return fail("This video is not attached to this lesson.", 404);
      const library = Deno.env.get("BUNNY_STREAM_LIBRARY_ID");
      const signingKey = Deno.env.get("BUNNY_STREAM_SIGNING_KEY");
      if (!library || !signingKey) return fail("Bunny Stream is not configured.", 500);
      const expires = Math.floor(Date.now() / 1000) + 12 * 60;
      // Bunny's hosted player authenticates its own HLS playlist and segment
      // requests. The short-lived embed token is SHA256(key + video GUID + expiry).
      const embedToken = new Uint8Array(await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${signingKey}${videoId}${expires}`),
      ));
      const token = Array.from(embedToken, (byte) => byte.toString(16).padStart(2, "0")).join("");
      const url = `https://iframe.mediadelivery.net/embed/${encodeURIComponent(library)}/${encodeURIComponent(videoId)}?token=${token}&expires=${expires}`;
      return json({ url, expires_in: 720 });
    }
    return fail("Route not found.", 404);
  } catch (error) {
    if (error instanceof Response)
      return fail(await error.text(), error.status);
    console.error(error);
    return fail("Unexpected server error.", 500);
  }
});
