import { demoLessons, demoStudents } from "../data/demo";
import type { Course, Lesson, Question, Student } from "../types";
import { getDeviceFingerprint } from "./device";
import { Upload } from "tus-js-client";

// Production uses a same-origin Vercel rewrite so the student session cookie
// remains first-party on mobile browsers that block cross-site cookies.
const base = import.meta.env.PROD
  ? "/api"
  : (import.meta.env.VITE_API_BASE_URL as string | undefined);
export const isDemoMode = !base;
const SESSION = "lesson_portal_session_hint";
const progressKey = "lesson_portal_demo_progress";
const DEMO_COURSE_ID = "demo-course-general";
const demoCoursesKey = "lesson_portal_demo_courses";
const demoStudentCoursesKey = "lesson_portal_demo_student_courses";
const demoDeletedStudentsKey = "lesson_portal_demo_deleted_students";
export type StudentAnswer = { id: string; student_id: string; student_name: string; question_id: string; question_text: string; question_type: "text" | "multiple_choice"; answer_text: string; submitted_at: string };
export type StudentProfile = { name: string; photo_url: string };
export type TeacherProfile = { name: string; photo_url: string };
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
  if (!response.ok) {
    clearExpiredStudentSession(path, response.status);
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function clearExpiredStudentSession(path: string, status: number) {
  if (status !== 401 || path.startsWith("/admin/") || path === "/redeem-code" || path === "/logout") return;
  localStorage.removeItem(SESSION);
  if (window.location.pathname !== "/access" && window.location.pathname !== "/") {
    window.location.replace("/access");
  }
}

async function requestForm<T>(path: string, form: FormData): Promise<T> {
  const device = await getDeviceFingerprint();
  const response = await fetch(`${base}${path}`, {
    method: "POST", credentials: "include",
    headers: { "x-device-id": device.clientId, "x-device-fingerprint": device.fingerprint },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearExpiredStudentSession(path, response.status);
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

function loadDemoCourses(): Course[] {
  const saved = JSON.parse(localStorage.getItem(demoCoursesKey) || "[]") as Course[];
  return saved.length ? saved : [{ id: DEMO_COURSE_ID, name: "General", description: "Existing lessons and student access", image_path: "" }];
}

function loadDemoStudentCourses(): Record<string, string[]> {
  return JSON.parse(localStorage.getItem(demoStudentCoursesKey) || "{}") as Record<string, string[]>;
}

function loadDemoStudents(): Student[] {
  const deleted = new Set(JSON.parse(localStorage.getItem(demoDeletedStudentsKey) || "[]") as string[]);
  const assignments = loadDemoStudentCourses();
  const studentName = localStorage.getItem("lesson_portal_student_name");
  return demoStudents.filter((student) => !deleted.has(student.id)).map((student) => ({
    ...student,
    ...(student.code === "LESSON26" && studentName ? { name: studentName } : {}),
    course_ids: assignments[student.id] ?? [DEMO_COURSE_ID],
  }));
}

function loadLessons() {
  const stored = JSON.parse(
    localStorage.getItem(progressKey) || "{}",
  ) as Record<string, Lesson["progress"]>;
  const savedLessons = JSON.parse(localStorage.getItem("lesson_portal_demo_lessons") || "[]") as Lesson[];
  const source = [...demoLessons.map((lesson) => savedLessons.find((saved) => saved.id === lesson.id) ?? lesson), ...savedLessons.filter((saved) => !demoLessons.some((lesson) => lesson.id === saved.id))];
  return source.map((lesson) => {
    const progress = Object.assign(
      { video_watched: false, pdf_viewed: false, questions_completed: false, manual_completed: false },
      lesson.progress,
      stored[lesson.id],
    );
    const count = [
      progress.video_watched,
      progress.pdf_viewed,
      progress.questions_completed,
    ].filter(Boolean).length;
    return {
      ...lesson,
      course_id: lesson.course_id || DEMO_COURSE_ID,
      course_name: lesson.course_name || loadDemoCourses().find((course) => course.id === (lesson.course_id || DEMO_COURSE_ID))?.name || "General",
      progress,
      progressPercent: progress.manual_completed ? 100 : Math.round((count / Math.max(1, [lesson.video_id, lessonHasDocument(lesson), lesson.questions?.length].filter(Boolean).length)) * 100),
      status: progress.manual_completed || (count > 0 && count >= [lesson.video_id, lessonHasDocument(lesson), lesson.questions?.length].filter(Boolean).length) ? "completed" : count ? "in_progress" : "not_started",
    } as Lesson;
  });
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
      const assigned = new Set(loadDemoStudents().find((student) => student.code === localStorage.getItem("lesson_portal_student_code"))?.course_ids ?? []);
      return loadLessons().filter((lesson) => lesson.published !== false && assigned.has(lesson.course_id));
    }
    return request("/lessons");
  },
  async getCourses(): Promise<Course[]> {
    if (!isDemoMode) return request<Course[]>("/courses");
    await delay();
    const assigned = new Set(loadDemoStudents().find((student) => student.code === localStorage.getItem("lesson_portal_student_code"))?.course_ids ?? []);
    return loadDemoCourses().filter((course) => assigned.has(course.id)).map((course) => ({
      ...course,
      lessons: loadLessons().filter((lesson) => lesson.published !== false && lesson.course_id === course.id),
    }));
  },
  async studentProfile(): Promise<StudentProfile> {
    if (isDemoMode) return { name: localStorage.getItem("lesson_portal_student_name") || "Student", photo_url: localStorage.getItem("lesson_portal_student_photo") || "" };
    return request<StudentProfile>("/student/profile");
  },
  async updateStudentProfile(name: string, photo?: File): Promise<StudentProfile> {
    if (isDemoMode) {
      const studentName = name.trim().replace(/\s+/g, " ");
      if (!studentName) throw new Error("Enter your name.");
      localStorage.setItem("lesson_portal_student_name", studentName);
      if (photo) localStorage.setItem("lesson_portal_student_photo", await api.readImage(photo));
      return api.studentProfile();
    }
    const form = new FormData();
    form.append("name", name);
    if (photo) form.append("photo", photo);
    return requestForm<StudentProfile>("/student/profile", form);
  },
  async getLesson(id: string): Promise<Lesson> {
    if (isDemoMode) {
      await delay(120);
      const assigned = new Set(loadDemoStudents().find((student) => student.code === localStorage.getItem("lesson_portal_student_code"))?.course_ids ?? []);
      const lesson = loadLessons().find((item) => item.id === id && item.published !== false && assigned.has(item.course_id));
      if (!lesson) throw new Error("Lesson not found");
      return lesson;
    }
    return request(`/lessons/${id}`);
  },
  async getVideoToken(
    id: string,
    videoId?: string,
  ): Promise<{ url: string; expires_in: number } | null> {
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
  async logCaptureEvent(event: { lesson_id: string; capture_type: string; capture_state: string; response: string }) {
    if (isDemoMode) return;
    return request("/capture-events", { method: "POST", body: JSON.stringify(event) });
  },
  async adminVideoUrl(id: string, videoId?: string) {
    if (isDemoMode) return null;
    return request<{ url: string; expires_in: number }>(`/admin/lessons/${id}/video-url`, { method: "POST", body: JSON.stringify({ video_id: videoId }) });
  },
  async adminVideoStatus(videoId: string) {
    if (isDemoMode) return null;
    return request<{ status: number | null; encodeProgress: number | null; transcodingMessages: string[] }>(`/admin/videos/${encodeURIComponent(videoId)}/status`);
  },
  async waitForVideoProcessing(videoId: string) {
    for (let attempt = 0; attempt < 24; attempt++) {
      await delay(5000);
      const result = await api.adminVideoStatus(videoId);
      if (!result) return null;
      if (result.status === 3 || result.status === 4 || result.status === 5 || result.status === 8) return result;
    }
    return null;
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
  async submitAnswers(id: string, answers: Record<string, string>) {
    if (isDemoMode) {
      await delay();
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
  async adminProfile(): Promise<TeacherProfile> {
    if (isDemoMode) return {
      name: localStorage.getItem("lesson_portal_teacher_name") || "Teacher",
      photo_url: localStorage.getItem("lesson_portal_teacher_photo") || "",
    };
    return request<TeacherProfile>("/admin/profile");
  },
  async updateAdminProfile(name: string, photo?: File): Promise<TeacherProfile> {
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!cleanName) throw new Error("Enter your name.");
    if (cleanName.length > 80) throw new Error("Name must be 80 characters or fewer.");
    if (photo && !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
    if (photo && photo.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");
    if (isDemoMode) {
      localStorage.setItem("lesson_portal_teacher_name", cleanName);
      if (photo) localStorage.setItem("lesson_portal_teacher_photo", await api.readImage(photo));
      return api.adminProfile();
    }
    const form = new FormData();
    form.append("name", cleanName);
    if (photo) form.append("photo", photo);
    return requestForm<TeacherProfile>("/admin/profile", form);
  },
  async adminLessons() {
    return isDemoMode ? loadLessons() : request<Lesson[]>("/admin/lessons");
  },
  async adminStudents() {
    if (!isDemoMode) return request<Student[]>("/admin/students");
    return loadDemoStudents();
  },
  async adminCourses(): Promise<Course[]> {
    if (isDemoMode) return loadDemoCourses().map((course) => ({ ...course }));
    return request<Course[]>("/admin/courses");
  },
  async saveCourse(data: { id?: string; name: string; description: string; image_path: string }): Promise<Course> {
    if (isDemoMode) {
      await delay();
      const courses = loadDemoCourses();
      const saved: Course = { ...data, id: data.id ?? crypto.randomUUID() };
      localStorage.setItem(demoCoursesKey, JSON.stringify(data.id ? courses.map((course) => course.id === data.id ? saved : course) : [...courses, saved]));
      return saved;
    }
    return request<Course>(data.id ? `/admin/courses/${data.id}` : "/admin/courses", {
      method: data.id ? "PATCH" : "POST", body: JSON.stringify(data),
    });
  },
  async deleteCourse(id: string) {
    if (isDemoMode) {
      if (loadLessons().some((lesson) => lesson.course_id === id)) throw new Error("Move this course’s lessons before deleting it.");
      localStorage.setItem(demoCoursesKey, JSON.stringify(loadDemoCourses().filter((course) => course.id !== id)));
      return;
    }
    return request(`/admin/courses/${id}`, { method: "DELETE" });
  },
  async uploadCourseImage(file: File): Promise<string> {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
    if (isDemoMode) return api.readImage(file);
    const form = new FormData(); form.append("file", file);
    return (await requestForm<{ path: string }>("/admin/course-images", form)).path;
  },
  async updateStudentCourses(id: string, course_ids: string[]) {
    if (isDemoMode) {
      const assignments = loadDemoStudentCourses();
      assignments[id] = course_ids;
      localStorage.setItem(demoStudentCoursesKey, JSON.stringify(assignments));
      return;
    }
    return request(`/admin/students/${id}/courses`, { method: "PUT", body: JSON.stringify({ course_ids }) });
  },
  async deleteStudent(id: string) {
    if (isDemoMode) {
      const deleted = new Set(JSON.parse(localStorage.getItem(demoDeletedStudentsKey) || "[]") as string[]);
      deleted.add(id);
      localStorage.setItem(demoDeletedStudentsKey, JSON.stringify([...deleted]));
      return;
    }
    return request(`/admin/students/${id}`, { method: "DELETE" });
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
  async readImage(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Could not read image file."));
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(file);
    });
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
    if (!file.size) throw new Error("This video file is empty. Choose another file.");
    if (file.size > 5 * 1024 * 1024 * 1024)
      throw new Error("Video must be smaller than 5 GB.");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const videoExtensions = new Set(["mp4", "m4v", "mov", "mkv", "webm", "avi", "wmv", "flv", "mpeg", "mpg", "ts", "vod", "amv"]);
    if (!file.type.startsWith("video/") && !videoExtensions.has(extension))
      throw new Error("Choose a video file. For best compatibility, use MP4 with H.264 video and AAC audio.");
    if (isDemoMode) {
      for (const percent of [15, 35, 60, 85, 100]) {
        await delay(180);
        onProgress(percent);
      }
      return `demo-${crypto.randomUUID()}`;
    }
    const upload = await request<{
      videoId: string;
      libraryId: string;
      expires: number;
      signature: string;
    }>("/admin/video-upload-credentials", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    await new Promise<void>((resolve, reject) => {
      const tusUpload = new Upload(file, {
        endpoint: "https://video.bunnycdn.com/tusupload",
        headers: {
          AuthorizationSignature: upload.signature,
          AuthorizationExpire: String(upload.expires),
          VideoId: upload.videoId,
          LibraryId: String(upload.libraryId),
        },
        metadata: {
          filename: file.name,
          filetype: file.type || "application/octet-stream",
        },
        chunkSize: 8 * 1024 * 1024,
        retryDelays: [0, 1000, 3000, 5000, 10000, 20000, 30000],
        onError: (error) => reject(new Error(`Video upload failed: ${error.message}`)),
        onProgress: (uploaded, total) =>
          onProgress(Math.round((uploaded / total) * 100)),
        onSuccess: () => resolve(),
      });
      tusUpload.start();
    });
    onProgress(100);
    return upload.videoId;
  },
  async createLesson(data: {
    title: string;
    description: string;
    course_id: string;
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
          manual_completed: false,
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
  async updateLesson(id: string, data: Partial<Pick<Lesson, "title" | "description" | "video_id" | "pdf_path" | "word_path" | "content" | "published" | "course_id">>) {
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
