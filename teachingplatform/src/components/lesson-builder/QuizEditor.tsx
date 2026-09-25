import { Plus, Trash } from "@phosphor-icons/react";
import type { Question } from "../../types";

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
  const update = (id: string, patch: Partial<Question>) =>
    onChange(questions.map((question) => question.id === id ? { ...question, ...patch } : question));

  return <section className="quiz-editor">
    <header><div><span>QUIZ</span><h2>Questions</h2><p>Add multiple-choice questions or written answers for students.</p></div><button className="primary-button" onClick={() => onChange([...questions, newQuestion()])}><Plus /> Add question</button></header>
    {!questions.length && <div className="canvas-empty-hint">Your quiz is empty. Add a question to get started.</div>}
    {questions.map((question, index) => <article className="quiz-editor-card" key={question.id}>
      <header><strong>Question {index + 1}</strong><button className="icon-button" aria-label={`Remove question ${index + 1}`} onClick={() => onChange(questions.filter((item) => item.id !== question.id))}><Trash /></button></header>
      <label>Question<input value={question.question_text} placeholder="Write your question" onChange={(event) => update(question.id, { question_text: event.target.value })} /></label>
      <label>Answer format<select value={question.question_type} onChange={(event) => update(question.id, event.target.value === "multiple_choice"
        ? { question_type: "multiple_choice", options: question.options?.length ? question.options : ["", "", "", ""], correct_answer: question.correct_answer ?? "" }
        : { question_type: "text", options: undefined, correct_answer: null })}>
        <option value="multiple_choice">Multiple choice</option><option value="text">Enter an answer</option>
      </select></label>
      {question.question_type === "multiple_choice" && <div className="quiz-options-editor"><strong>Choices</strong>{(question.options ?? []).map((option, optionIndex) => <label key={optionIndex}><span>{String.fromCharCode(65 + optionIndex)}</span><input value={option} placeholder={`Choice ${optionIndex + 1}`} onChange={(event) => {
        const options = [...(question.options ?? [])];
        options[optionIndex] = event.target.value;
        const correct_answer = question.correct_answer === option ? event.target.value : question.correct_answer;
        update(question.id, { options, correct_answer });
      }} /><input type="radio" name={`correct-${question.id}`} aria-label={`Mark choice ${optionIndex + 1} correct`} checked={Boolean(option) && question.correct_answer === option} onChange={() => update(question.id, { correct_answer: option })} /></label>)}
        {(question.options?.length ?? 0) < 6 && <button className="secondary-button" onClick={() => update(question.id, { options: [...(question.options ?? []), ""] })}><Plus /> Add choice</button>}
        <small>Select the radio beside the correct answer. Students won’t see the key.</small>
      </div>}
    </article>)}
  </section>;
}
