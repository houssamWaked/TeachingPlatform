import { Plus, Trash } from "@phosphor-icons/react";
import type { Question } from "../../types";
import { useLocale } from "../../context/LocaleState";

const newQuestion = (): Question => ({
  id: crypto.randomUUID(),
  question_text: "",
  question_type: "multiple_choice",
  options: ["", "", "", ""],
  correct_answer: "",
});

export function QuizEditor({ questions, onChange }: {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}) {
  const { tx } = useLocale();
  const update = (id: string, patch: Partial<Question>) =>
    onChange(questions.map((question) => question.id === id ? { ...question, ...patch } : question));

  return <section className="quiz-editor">
    <header><div><span>{tx("QUIZ", "اختبار")}</span><h2>{tx("Questions", "الأسئلة")}</h2><p>{tx("Add multiple-choice questions or written answers for students.", "أضف أسئلة اختيار من متعدد أو أسئلة بإجابات كتابية للطلاب.")}</p></div><button className="primary-button" onClick={() => onChange([...questions, newQuestion()])}><Plus /> {tx("Add question", "أضف سؤالاً")}</button></header>
    {!questions.length && <div className="canvas-empty-hint">{tx("Your quiz is empty. Add a question to get started.", "الاختبار فارغ. أضف سؤالاً للبدء.")}</div>}
    {questions.map((question, index) => <article className="quiz-editor-card" key={question.id}>
      <header><strong>{tx("Question", "السؤال")} {index + 1}</strong><button className="icon-button" aria-label={`${tx("Remove question", "إزالة السؤال")} ${index + 1}`} onClick={() => onChange(questions.filter((item) => item.id !== question.id))}><Trash /></button></header>
      <label>{tx("Question", "السؤال")}<input value={question.question_text} placeholder={tx("Write your question", "اكتب سؤالك")} onChange={(event) => update(question.id, { question_text: event.target.value })} /></label>
      <label>{tx("Answer format", "صيغة الإجابة")}<select value={question.question_type} onChange={(event) => update(question.id, event.target.value === "multiple_choice"
        ? { question_type: "multiple_choice", options: question.options?.length ? question.options : ["", "", "", ""], correct_answer: question.correct_answer ?? "" }
        : { question_type: "text", options: undefined, correct_answer: null })}>
        <option value="multiple_choice">{tx("Multiple choice", "اختيار من متعدد")}</option><option value="text">{tx("Enter an answer", "كتابة إجابة")}</option>
      </select></label>
      {question.question_type === "multiple_choice" && <div className="quiz-options-editor"><strong>{tx("Choices", "الخيارات")}</strong>{(question.options ?? []).map((option, optionIndex) => <label key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} placeholder={`${tx("Choice", "الخيار")} ${optionIndex + 1}`} onChange={(event) => {
        const options = [...(question.options ?? [])];
        options[optionIndex] = event.target.value;
        const correct_answer = question.correct_answer === option ? event.target.value : question.correct_answer;
        update(question.id, { options, correct_answer });
      }} /><input type="radio" name={`correct-${question.id}`} aria-label={`Mark choice ${optionIndex + 1} correct`} checked={Boolean(option) && question.correct_answer === option} onChange={() => update(question.id, { correct_answer: option })} /></label>)}
        {(question.options?.length ?? 0) < 6 && <button className="secondary-button" onClick={() => update(question.id, { options: [...(question.options ?? []), ""] })}><Plus /> {tx("Add choice", "أضف خياراً")}</button>}
        <small>{tx("Select the radio beside the correct answer. Students won’t see the key.", "حدد زر الاختيار بجانب الإجابة الصحيحة. لن يرى الطلاب مفتاح الإجابة.")}</small>
      </div>}
    </article>)}
  </section>;
}
