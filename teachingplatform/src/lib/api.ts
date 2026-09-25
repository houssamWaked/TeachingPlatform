import { demoLessons, demoStudents } from "../data/demo";
import type { Lesson, Question, Student } from "../types";
import { getDeviceFingerprint } from "./device";

const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
export const isDemoMode = !base;
const SESSION = "lesson_portal_session_hint";
const progressKey = "lesson_portal_demo_progress";
export type StudentAnswer = { id: string; student_id: string; student_name: string; question_id: string; question_text: string; question_type: "text" | "multiple_choice"; answer_text: string; submitted_at: string };
const lessonHasDocument = (lesson: Lesson) => Boolean(lesson.pdf_path || lesson.word_path || [
  ...(lesson.content?.blocks ?? []),
  ...(lesson.content?.sections ?? []).flatMap((section) => section.blocks),
  ...(lesson.content?.tabs ?? []).flatMap((tab) => tab.blocks),
].some((block) => (block.type === "pdf" || block.type === "word") && block.filePath));

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const device = await getDeviceFingerprint();
  const response = await fetch(`${base}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      "x-device-id": device.clientId,
      "x-device-fingerprint": device.fingerprint,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function loadLessons() {
  const stored = JSON.parse(
    localStorage.getItem(progressKey) || "{}",
  ) as Record<string, Lesson["progress"]>;
  const savedLessons = JSON.parse(localStorage.getItem("lesson_portal_demo_lessons") || "[]") as Lesson[];
  const source = [...demoLessons.map((lesson) => savedLessons.find((saved) => saved.id === lesson.id) ?? lesson), ...savedLessons.filter((saved) => !demoLessons.some((lesson) => lesson.id === saved.id))];
  return source.map((lesson) => {
    const progress = stored[lesson.id] || lesson.progress;
    const count = [
      progress.video_watched,
      progress.pdf_viewed,
      progress.questions_completed,
    ].filter(Boolean).length;
    return {
      ...lesson,
      progress,
      progressPercent: Math.round((count / Math.max(1, [lesson.video_id, lessonHasDocument(lesson), lesson.questions?.length].filter(Boolean).length)) * 100),
      status: count > 0 && count >= [lesson.video_id, lessonHasDocument(lesson), lesson.questions?.length].filter(Boolean).length ? "completed" : count ? "in_progress" : "not_started",
    } as Lesson;
  });
}
function saveProgress(id: string, patch: Partial<Lesson["progress"]>) {
  const all = Object.fromEntries(
    loadLessons().map((lesson) => [lesson.id, lesson.progress]),
  );
  all[id] = { ...all[id], ...patch };
  localStorage.setItem(progressKey, JSON.stringify(all));
}
const delay = (ms = 280) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  hasSession: () => localStorage.getItem(SESSION) === "true",
  signOut: () => {
    localStorage.removeItem(SESSION);
    sessionStorage.removeItem("lp-admin");
    if (base)
      fetch(`${base}/logout`, { method: "POST", credentials: "include" });
  },
  async redeemCode(code: string, name: string) {
    const device = await getDeviceFingerprint();
    const studentName = name.trim().replace(/\s+/g, " ");
    if (isDemoMode) {
      await delay();
      if (code !== "LESSON26")
        throw new Error("This code is invalid or has already been used.");
      localStorage.setItem("lesson_portal_student_name", studentName);
      localStorage.setItem("lesson_portal_student_code", code.trim().toUpperCase());
      localStorage.setItem(SESSION, "true");
      return;
    }
    await request("/redeem-code", {
      method: "POST",
      body: JSON.stringify({ code, name: studentName, ...device }),
    });
    localStorage.setItem("lesson_portal_student_name", studentName);
    localStorage.setItem("lesson_portal_student_code", code.trim().toUpperCase());
    localStorage.setItem(SESSION, "true"); // Non-sensitive routing hint; the real token is httpOnly.
  },
  async getLessons(): Promise<Lesson[]> {
    if (isDemoMode) {
      await delay();
      return loadLessons().filter((lesson) => lesson.published !== false);
    }
    return request("/lessons");
  },
  async getLesson(id: string): Promise<Lesson> {
    if (isDemoMode) {
      await delay(120);
      const lesson = loadLessons().find((item) => item.id === id && item.published !== false);
      if (!lesson) throw new Error("Lesson not found");
      return lesson;
    }
    return request(`/lessons/${id}`);
  },
  async getVideoToken(
    id: string,
    videoId?: string,
  ): Promise<{ url: string; expires_in: number; student_name: string; student_code: string } | null> {
    if (isDemoMode) return null;
    return request(`/lessons/${id}/video-url`, { method: "POST", body: JSON.stringify({ video_id: videoId }) });
  },
  async getPdfUrl(id: string) {
    if (isDemoMode) return null;
    return request<{ url: string; expires_in: number }>(`/lessons/${id}/pdf`);
  },
  async getWordUrl(id: string) {
    if (isDemoMode) return null;
    return request<{ url: string; expires_in: number }>(`/lessons/${id}/word`);
  },
  async getDocumentUrl(id: string, path: string) {
    if (isDemoMode) return null;
    const params = new URLSearchParams({ path });
    return request<{ url: string; expires_in: number }>(`/lessons/${id}/document?${params.toString()}`);
  },
  async adminVideoUrl(id: string, videoId?: string) {
    if (isDemoMode) return null;
    return request<{ url: string; expires_in: number }>(`/admin/lessons/${id}/video-url`, { method: "POST", body: JSON.stringify({ video_id: videoId }) });
  },
  async adminPdfUrl(id: string) {
    if (isDemoMode) return null;
    return request<{ url: string; expires_in: number }>(`/admin/lessons/${id}/pdf-url`, { method: "POST" });
  },
  async adminWordUrl(id: string) {
    if (isDemoMode) return null;
    return request<{ url: string; expires_in: number }>(`/admin/lessons/${id}/word-url`, { method: "POST" });
  },
  async adminDocumentUrl(id: string, path: string) {
    if (isDemoMode) return null;
    return request<{ url: string; expires_in: number }>(`/admin/lessons/${id}/document-url`, { method: "POST", body: JSON.stringify({ path }) });
  },
  async markProgress(id: string, field: keyof Lesson["progress"]) {
    if (isDemoMode) {
      saveProgress(id, { [field]: true });
      return;
    }
    return request("/progress", {
      method: "POST",
      body: JSON.stringify({ lesson_id: id, field }),
    });
  },
  async submitAnswers(id: string, answers: Record<string, string>) {
    if (isDemoMode) {
      await delay();
      saveProgress(id, { questions_completed: true });
      const lesson = loadLessons().find((item) => item.id === id);
      const studentName = localStorage.getItem("lesson_portal_student_name") || "Demo student";
      const saved = JSON.parse(localStorage.getItem("lesson_portal_demo_answers") || "[]") as StudentAnswer[];
      const submittedAt = new Date().toISOString();
      const next = [...saved.filter((item) => !(item.student_id === "demo-student" && lesson?.questions.some((q) => q.id === item.question_id))), ...Object.entries(answers).map(([question_id, answer_text]) => {
        const question = lesson?.questions.find((item) => item.id === question_id);
        return { id: `${question_id}-demo-student`, student_id: "demo-student", student_name: studentName, question_id, question_text: question?.question_text ?? "Question", question_type: question?.question_type ?? "text", answer_text, submitted_at: submittedAt } satisfies StudentAnswer;
      })];
      localStorage.setItem("lesson_portal_demo_answers", JSON.stringify(next));
      return { correct_count: 0, graded_count: 0, written_count: Object.keys(answers).length };
    }
    return request<{ correct_count: number; graded_count: number; written_count: number }>("/submit-answers", {
      method: "POST",
      body: JSON.stringify({
        lesson_id: id,
        answers: Object.entries(answers).map(([question_id, answer_text]) => ({
          question_id,
          answer_text,
        })),
      }),
    });
  },
  async openPdf(id: string) {
    if (isDemoMode) {
      alert(
        "Secure PDF preview: connect Supabase Storage to open the signed lesson notes.",
      );
      return;
    }
    const { url } = await request<{ url: string }>(`/lessons/${id}/pdf`);
    window.open(url, "_blank", "noopener");
  },
  async adminLogin(password: string) {
    if (isDemoMode) {
      await delay();
      return password === "teacher";
    }
    try {
      await request("/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      return true;
    } catch {
      return false;
    }
  },
  async adminLessons() {
    return isDemoMode ? loadLessons() : request<Lesson[]>("/admin/lessons");
  },
  async adminStudents() {
    if (!isDemoMode) return request<Student[]>("/admin/students");
    const studentName = localStorage.getItem("lesson_portal_student_name");
    return demoStudents.map((student) => student.code === "LESSON26" && studentName
      ? { ...student, name: studentName }
      : student);
  },
  async adminAnswers(lessonId: string): Promise<StudentAnswer[]> {
    if (isDemoMode) {
      await delay(100);
      const saved = JSON.parse(localStorage.getItem("lesson_portal_demo_answers") || "[]") as StudentAnswer[];
      const lesson = loadLessons().find((item) => item.id === lessonId);
      const questionIds = new Set(lesson?.questions.map((question) => question.id) ?? []);
      return saved.filter((answer) => questionIds.has(answer.question_id)).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    }
    return request<StudentAnswer[]>(`/admin/lessons/${lessonId}/answers`);
  },
  async resetDevice(id: string) {
    if (isDemoMode) {
      await delay();
      return;
    }
    return request(`/admin/students/${id}/reset-device`, { method: "POST" });
  },
  async generateCodes(count: number) {
    if (isDemoMode) {
      await delay();
      return Array.from({ length: count }, () =>
        `${crypto.randomUUID().slice(0, 4)}-${crypto.randomUUID().slice(0, 4)}`.toUpperCase(),
      );
    }
    return request<string[]>("/admin/codes", {
      method: "POST",
      body: JSON.stringify({ count }),
    });
  },
  async uploadDocument(file: File) {
    if (isDemoMode) {
      await delay();
      return `lessons/${file.name}`;
    }
    const device = await getDeviceFingerprint();
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${base}/admin/pdfs`, {
      method: "POST",
      credentials: "include",
      headers: {
        "x-device-id": device.clientId,
        "x-device-fingerprint": device.fingerprint,
      },
      body: form,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Document upload failed.");
    return data.path as string;
  },
  async uploadImage(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new Error("Choose a JPEG, PNG, or WebP image.");
    if (isDemoMode) {
      await delay();
      if (file.size > 1.5 * 1024 * 1024) throw new Error("Demo images must be 1.5 MB or smaller.");
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image file."));
        reader.onerror = () => reject(new Error("Could not read image file."));
        reader.readAsDataURL(file);
      });
    }
    const device = await getDeviceFingerprint();
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${base}/admin/images`, {
      method: "POST", credentials: "include",
      headers: { "x-device-id": device.clientId, "x-device-fingerprint": device.fingerprint },
      body: form,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Image upload failed.");
    return data.path as string;
  },
  async lessonImageUrl(id: string, imagePath: string, admin = false) {
    if (isDemoMode) return null;
    const query = new URLSearchParams({ path: imagePath });
    return admin
      ? request<{ url: string; expires_in: number }>(`/admin/lessons/${id}/image-url?${query}`, { method: "POST" })
      : request<{ url: string; expires_in: number }>(`/lessons/${id}/image?${query}`);
  },
  async uploadVideo(
    file: File,
    title: string,
    onProgress: (percent: number) => void,
  ) {
    if (file.size > 5 * 1024 * 1024 * 1024)
      throw new Error("Video must be smaller than 5 GB.");
    if (isDemoMode) {
      for (const percent of [15, 35, 60, 85, 100]) {
        await delay(180);
        onProgress(percent);
      }
      return `demo-${crypto.randomUUID()}`;
    }
    const upload = await request<{ videoId: string }>("/admin/video-upload-credentials", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    const form = new FormData();
    form.append("videoId", upload.videoId);
    form.append("file", file, file.name);
    const device = await getDeviceFingerprint();
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${base}/admin/videos`);
      xhr.withCredentials = true;
      xhr.setRequestHeader("x-device-id", device.clientId);
      xhr.setRequestHeader("x-device-fingerprint", device.fingerprint);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable)
          onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Video upload failed (${xhr.status}).`));
      xhr.onerror = () =>
        reject(
          new Error(
            "Video upload was interrupted. Check your connection and try again.",
          ),
        );
      xhr.send(form);
    });
    onProgress(100);
    return upload.videoId;
  },
  async createLesson(data: {
    title: string;
    description: string;
  }): Promise<Lesson> {
    if (isDemoMode) {
      await delay();
      const created: Lesson = {
        id: crypto.randomUUID(),
        ...data,
        pdf_path: "",
        word_path: "",
        video_id: "",
        content: { blocks: [], sections: [] },
        published: false,
        order_index: loadLessons().length + 1,
        duration: "New",
        status: "not_started",
        progressPercent: 0,
        progress: {
          video_watched: false,
          pdf_viewed: false,
          questions_completed: false,
        },
        questions: [],
      };
      localStorage.setItem("lesson_portal_demo_lessons", JSON.stringify([...loadLessons(), created]));
      return created;
    }
    return request("/admin/lessons", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  async updateLesson(id: string, data: Partial<Pick<Lesson, "title" | "description" | "video_id" | "pdf_path" | "word_path" | "content" | "published">>) {
    if (isDemoMode) {
      await delay();
      const lessons = loadLessons();
      const next = lessons.map((lesson) => lesson.id === id ? { ...lesson, ...data } : lesson);
      localStorage.setItem("lesson_portal_demo_lessons", JSON.stringify(next));
      return next.find((lesson) => lesson.id === id) ?? null;
    }
    return request<Lesson>(`/admin/lessons/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  async saveQuestions(id: string, questions: Question[]) {
    if (isDemoMode) {
      await delay();
      const lessons = loadLessons().map((lesson) => lesson.id === id ? { ...lesson, questions } : lesson);
      localStorage.setItem("lesson_portal_demo_lessons", JSON.stringify(lessons));
      return lessons.find((lesson) => lesson.id === id)?.questions ?? questions;
    }
    return request<Question[]>(`/admin/lessons/${id}/questions`, { method: "PUT", body: JSON.stringify({ questions }) });
  },
  async deleteLesson(id: string) {
    if (isDemoMode) {
      await delay();
      const lessons = loadLessons().filter((lesson) => lesson.id !== id);
      localStorage.setItem("lesson_portal_demo_lessons", JSON.stringify(lessons));
      return;
    }
    return request(`/admin/lessons/${id}`, { method: "DELETE" });
  },
};
