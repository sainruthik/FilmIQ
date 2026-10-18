import { NavBar } from "@/components/NavBar";
import { UploadZone } from "@/components/UploadZone";
import { BidScale } from "@/components/BidScale";
import { Haze } from "@/components/Haze";
import { AGENTS } from "@/lib/agents";

const SPECIALISTS = AGENTS.slice(0, -1);
const STRATEGIST = AGENTS[AGENTS.length - 1];

// What a report looks like, shown instead of marketing stats.
function SampleSheet() {
  return (
    <article aria-label="Sample report" className="bg-sheet border border-rule rounded shadow-sheet px-6 py-8 md:px-12 md:pt-12 md:pb-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4 mb-12">
        <h2 className="text-25 font-semibold tracking-[-0.02em]">Low Tide Saints</h2>
        <p className="text-13 text-graphite">Sample report, fictional film</p>
      </header>

      <div className="mb-8">
        <BidScale low="$1.8M" fair="$2.6M" walkAway="$4.1M" size="md" />
      </div>

      <dl className="border-t border-rule">
        <div className="grid sm:grid-cols-[9rem_1fr] gap-x-4 gap-y-1 py-4 border-b border-rule">
          <dt>Production budget</dt>
          <dd>
            $3.2M including contingency <span className="cite-pdf">PDF p.4</span>
          </dd>
        </div>
        <div className="grid sm:grid-cols-[9rem_1fr] gap-x-4 gap-y-1 py-4 border-b border-rule">
          <dt>Closest deal</dt>
          <dd>
            Harbour Lights to a mid-size streamer, $2.4M, 2023 <span className="text-13 text-graphite">Deadline</span>
          </dd>
        </div>
        <div className="grid sm:grid-cols-[9rem_1fr] gap-x-4 gap-y-1 py-4 border-b border-rule">
          <dt>Lead's last box office</dt>
          <dd className="text-cherry">Not found in any source. Marked unverified.</dd>
        </div>
      </dl>
      <p className="mt-6 text-13 text-graphite">Medium confidence: based on 1 comparable deal with a disclosed price.</p>
    </article>
  );
}

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b border-rule">
          {/* Fog on the right half only, so the headline sits on clean paper. */}
          <Haze className="[mask-image:linear-gradient(90deg,transparent_30%,#000_70%)]" />
          <div className="relative max-w-[1240px] mx-auto px-4 md:px-8 grid gap-12 pt-12 pb-18 lg:grid-cols-[5fr_6fr] lg:gap-18 lg:py-28 lg:items-center">
            <div>
              <h1 id="hero-heading" className="text-display font-semibold leading-[1.02] tracking-[-0.035em] max-w-[13ch] mb-6">
                What is this film worth to you?
              </h1>
              <p className="text-20 leading-normal text-graphite max-w-[34ch] mb-8">
                Upload the script, press kit or financials. Seven analysts read it, source every figure, and return a
                bid range you can take to committee.
              </p>
              <UploadZone />
            </div>
            <SampleSheet />
          </div>
        </section>

        <section
          aria-labelledby="contents-heading"
          className="max-w-[1240px] mx-auto px-4 md:px-8 grid gap-8 pt-18 pb-28 lg:grid-cols-[5fr_6fr] lg:gap-18"
        >
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 id="contents-heading" className="text-39 font-semibold leading-[1.05] tracking-[-0.03em] max-w-[14ch] mb-4">
              What the report covers
            </h2>
            <p className="text-graphite max-w-[36ch]">
              Six analysts work on the film at the same time. When all six finish, a strategist weighs their findings
              and writes the bid.
            </p>
          </div>

          <ol>
            {SPECIALISTS.map((a) => (
              <li key={a.name} className="grid grid-cols-[1fr_auto] gap-4 py-6 border-b border-rule first:border-t">
                <div>
                  <h3 className="text-20 font-semibold tracking-[-0.01em] mb-1">{a.section}</h3>
                  <p className="text-graphite">{a.desc}</p>
                </div>
                <span className="text-13 text-graphite text-right">{a.name}</span>
              </li>
            ))}
            <li className="grid grid-cols-[1fr_auto] gap-4 py-6 mt-6 border-t-2 border-ink">
              <div>
                <h3 className="text-20 font-semibold tracking-[-0.01em] mb-1">
                  <span className="mark">{STRATEGIST.section}</span>
                </h3>
                <p className="text-graphite">{STRATEGIST.desc}</p>
              </div>
              <span className="text-13 text-graphite text-right">{STRATEGIST.name}</span>
            </li>
          </ol>
        </section>
      </main>

      <footer className="border-t border-rule">
        <p className="max-w-[1240px] mx-auto px-4 md:px-8 py-8 text-13 text-graphite">
          FilmIQ. Every figure in a report is cited to your document or a named source, or marked unverified.
        </p>
      </footer>
    </>
  );
}
