import Image from "next/image";
import Link from "@/components/DiscoveryLink";
import { ArrowUpRight, Compass, MessageCircle } from "lucide-react";
import FAQTopics from "@/components/FAQTopics";

export const metadata = {
  title: "Questions & answers | BaseDare",
  description:
    "Get started with BaseDare: discover places, try free adventures, meet people and understand paid dares.",
};

export default function FAQPage() {
  return (
    <div className="bd-page-top relative min-h-screen px-4 pb-28 text-white sm:px-6">
      <div className="relative mx-auto max-w-4xl">
        <header className="bd-surface flex flex-col-reverse gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-xl">
            <p className="bd-page-kicker">A little help from PeeBear</p>
            <h1 className="bd-page-title mt-4">
              Good questions.
              <br />
              <span className="text-[#f5c518]">Clear answers.</span>
            </h1>
            <p className="bd-page-copy mt-4">
              From your first adventure to how paid work works. Find the answer,
              then get back out there.
            </p>
            <Link
              href="/now"
              className="bd-action bd-action--gold mt-6 !text-sm"
            >
              <Compass size={17} aria-hidden="true" />
              Find your next move
            </Link>
          </div>
          <div
            className="faq-peebear-medallion relative h-20 w-20 shrink-0 self-end sm:h-44 sm:w-44 sm:self-auto"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 180 180"
              className="absolute inset-0 h-full w-full"
            >
              <defs>
                <linearGradient id="faq-gem" x2="1" y2="1">
                  <stop stopColor="#393047" />
                  <stop offset=".5" stopColor="#171621" />
                  <stop offset="1" stopColor="#080b12" />
                </linearGradient>
              </defs>
              <path
                d="M53 8h74l45 45v74l-45 45H53L8 127V53Z"
                fill="url(#faq-gem)"
                stroke="#fff0c9"
                strokeOpacity=".35"
                strokeWidth="2"
              />
              <path
                d="m53 8 12 22h50l12-22M8 53l22 12v50L8 127m45 45 12-22h50l12 22m45-45-22-12V65l22-12"
                fill="none"
                stroke="#c59e43"
                strokeOpacity=".35"
              />
              <path
                d="M65 30h50l35 35v50l-35 35H65l-35-35V65Z"
                fill="#7a40bd"
                fillOpacity=".12"
                stroke="#b488de"
                strokeOpacity=".3"
              />
            </svg>
            <Image
              src="/assets/peebear-head.webp"
              alt=""
              width={180}
              height={180}
              priority
              sizes="(min-width:640px) 130px, 84px"
              className="absolute inset-[14%] h-[72%] w-[72%] object-contain drop-shadow-[0_8px_5px_#0008]"
            />
          </div>
        </header>
        <FAQTopics />
        <aside className="bd-well mt-8 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <h2 className="font-black">Need a hand?</h2>
            <p className="mt-1 text-sm leading-6 text-white/65">
              Send the page link and what happened. Keep private account details
              private.
            </p>
          </div>
          <Link href="/contact" className="bd-action !text-sm">
            <MessageCircle size={17} aria-hidden="true" />
            Contact us
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
