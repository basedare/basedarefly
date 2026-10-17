"use client";

import { useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/faq-content";

const topics = [
  "All questions",
  "Getting started",
  "People & places",
  "Paid work",
  "Account & safety",
];
function topic(question: string) {
  if (/paid|business|perks|token/i.test(question)) return "Paid work";
  if (/people|friends|tonight|check-ins|message|content|photo/i.test(question))
    return "People & places";
  if (/wallet|missions|rejected|report/i.test(question))
    return "Account & safety";
  return "Getting started";
}
function answer(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
    part.startsWith("**") ? (
      <strong key={index} className="font-bold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}
export default function FAQTopics() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(topics[0]);
  const matches = FAQ_ITEMS.filter(
    (item) =>
      (selected === topics[0] || topic(item.q) === selected) &&
      `${item.q} ${item.a}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  return (
    <section className="mt-7" aria-label="Find an answer">
      <label className="bd-field flex min-h-14 items-center gap-3 px-4">
        <Search
          size={18}
          className="shrink-0 text-cyan-200"
          aria-hidden="true"
        />
        <span className="sr-only">Search questions</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="What would you like to know?"
          className="min-w-0 flex-1 bg-transparent py-4 text-sm text-white outline-none placeholder:text-white/50"
        />
      </label>
      <div
        role="group"
        aria-label="Question topics"
        className="my-4 flex flex-wrap gap-2"
      >
        {topics.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={selected === item}
            onClick={() => setSelected(item)}
            className={`bd-action !text-xs ${
              selected === item ? "bd-action--violet" : ""
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <p role="status" className="mb-4 text-xs text-white/55">
        {matches.length} {matches.length === 1 ? "answer" : "answers"}
        {query.trim() ? " found" : ""}
      </p>
      <div className="space-y-3">
        {matches.map((item) => (
          <details
            key={item.q}
            className="bd-card group px-5 open:!border-amber-200/25"
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-bold leading-6">
              <span>{item.q}</span>
              <ChevronDown
                size={18}
                className="shrink-0 text-white/50 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <p className="border-t border-white/10 pb-6 pt-4 text-sm leading-7 text-white/70">
              {answer(item.a)}
            </p>
          </details>
        ))}
      </div>
      {!matches.length ? (
        <div className="bd-empty p-6">
          <h2 className="font-bold">No matching answers yet.</h2>
          <p className="mt-2 text-sm text-white/65">
            Try another word, or show all questions.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelected(topics[0]);
            }}
            className="bd-action mt-4 !text-sm"
          >
            Show all questions
          </button>
        </div>
      ) : null}
    </section>
  );
}
