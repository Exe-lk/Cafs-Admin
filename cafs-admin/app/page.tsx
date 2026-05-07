import Image from "next/image";
import Link from "next/link";
import TherapistsSection from "@/components/landing/TherapistsSection";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <header className="bg-cafs-black border-b border-dark-border py-3 px-4 sm:py-4 sm:px-6 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto flex flex-nowrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-8">
            <a href="#" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 bg-primary-teal rounded-full flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src="/cafs-logo.png"
                  alt="CAFS logo"
                  width={40}
                  height={40}
                  priority
                />
              </div>
              <span className="text-sm font-semibold tracking-wide truncate">CAFS</span>
            </a>

            <div className="hidden md:flex gap-6 text-sm font-medium text-gray-400">
              <a className="hover:text-white transition-colors" href="#services">
                Services
              </a>
              <a className="hover:text-white transition-colors" href="#therapists">
                Therapists
              </a>
              <a className="hover:text-white transition-colors" href="#reviews">
                Reviews
              </a>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end text-xs sm:text-sm">
            <a
              href="tel:+94764067004"
              className="flex items-center gap-1 sm:gap-2 text-gray-300 transition-colors hover:text-white"
            >
              <PhoneIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="font-bold whitespace-nowrap tabular-nums">
                <span className="hidden sm:inline font-normal">Call us </span>
                076 406 7004
              </span>
            </a>
          </div>
        </nav>
      </header>

      <section className="relative w-full min-h-[260px] sm:min-h-[400px] lg:min-h-[500px] overflow-hidden rounded-b-3xl sm:rounded-b-[40px] py-8 sm:py-12">
        <Image
          src="/setmore-cover-mobile.jpg"
          alt="CAFS hero cover"
          fill
          sizes="(max-width: 767px) 100vw, 0px"          priority
        />
        <Image
          src="/setmore-cover.jpg"
          alt="CAFS hero cover"
          fill
          sizes="(min-width: 768px) 100vw, 0px"
          className="hidden object-cover object-center md:block"
          priority
        />

        <Link
          href="/login"
          className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 p-2 text-white border border-white/30 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/40 transition-colors"
          aria-label="Profile / Login"
        >
          <UserIcon className="w-5 h-5" />
        </Link>

        <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center px-4 sm:px-6">

          <div className="mx-auto w-full max-w-2xl text-center">
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1100px] px-4 sm:px-6 py-8 sm:py-12 flex flex-col lg:flex-row gap-6 sm:gap-8">
        <div className="flex-1 space-y-8 sm:space-y-12 min-w-0">
          <section className="bg-dark-card p-4 sm:p-8 rounded-2xl border border-dark-border">
            <h2 className="text-lg font-bold mb-4">Our Booking Policy</h2>
            <div className="text-sm text-gray-400 space-y-4 leading-relaxed">
              <p>
                To confirm your tentative appointment, please pay the
                consultation fee within 24 hours to following bank account and
                send the payment receipt on Whatsapp to +94764067004
              </p>
              <div className="space-y-1">
                <p>Child, Adolescent and Family Services</p>
                <p>HNB</p>
                <p>Bambalapitiya</p>
                <p>AC: 039010222122</p>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-8 py-2 border border-gray-500 rounded-full text-sm font-medium hover:bg-white hover:text-black transition-all"
                >
                  Okay
                </button>
              </div>
            </div>
          </section>

          <section id="services" className="space-y-4">
            <h2 className="text-xl font-bold">Services</h2>
            <div className="space-y-3">
              <ServiceButton
                serviceName="In-Person Individual Therapy with Dinu Siriwardana"
                title="In-Person Individual Therapy with Dinu Siriwardana"
                meta="1 hr · Rs 4,500"
              />
              <ServiceButton
                serviceName="Online Individual Therapy with Dinu Siriwardana"
                title={
                  <>
                    Online Individual Therapy with Dinu Siriwardana{" "}
                    <span className="ml-1 text-gray-500">📹</span>
                  </>
                }
                meta="1 hr · Rs 4,500"
              />
              <ServiceButton
                serviceName="In-Person Individual Therapy with Giselle Dass"
                title="In-Person Individual Therapy with Giselle Dass"
                meta="1 hr · Rs 5,500"
              />

              <button
                type="button"
                className="w-full text-left bg-dark-card p-5 rounded-xl border border-dark-border hover:border-gray-500 transition-all"
              >
                <span className="font-medium text-sm text-gray-400">
                  View more services...
                </span>
              </button>
            </div>
          </section>

          <TherapistsSection />

          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-dark-border">
            <div className="space-y-4">
              <h3 className="font-bold text-sm">Contact us</h3>
              <ul className="space-y-3 text-xs text-gray-400">
                <li className="flex items-center gap-3">
                  <PhoneIcon className="w-4 h-4" />
                  <a href="tel:+94764067004" className="hover:text-white">
                    076 406 7004
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <MailIcon className="w-4 h-4" />
                  <a
                    className="hover:text-white break-all"
                    href="mailto:connectwithcafs.hr@gmail.com"
                  >
                    connectwithcafs.hr@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <GlobeIcon className="w-4 h-4" />
                  <a className="hover:text-white" href="https://www.cafs.lk">
                    https://www.cafs.lk
                  </a>
                </li>
              </ul>

              <div className="pt-6">
                <h3 className="font-bold text-sm mb-4">Social media</h3>
                <div className="flex gap-4">
                  <a className="text-gray-400 hover:text-white" href="#">
                    <span className="sr-only">Instagram</span>
                    <InstagramIcon className="w-5 h-5" />
                  </a>
                  <a className="text-gray-400 hover:text-white" href="#">
                    <span className="sr-only">Facebook</span>
                    <FacebookIcon className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-sm">Good to know</h3>
              <a
                className="flex items-center gap-3 text-xs text-gray-400 hover:text-white"
                href="#"
              >
                <DocumentIcon className="w-4 h-4" />
                <span>Booking policy</span>
              </a>
            </div>
          </section>

          <section id="reviews" className="pt-12 border-t border-dark-border">
            <h2 className="text-xl font-bold mb-8">Reviews</h2>
            <div className="bg-dark-card/50 p-4 sm:p-8 rounded-2xl border border-dark-border space-y-6">
              <p className="text-gray-400 text-sm italic">
                Be the first to review us and share insights about your experience.
              </p>

              <form className="grid grid-cols-1 md:grid-cols-12 gap-4">

                <div className="md:col-span-12">
                  <label className="block text-xs font-semibold text-gray-400 mb-2" htmlFor="review-text">
                    Your review
                  </label>
                  <textarea
                    id="review-text"
                    name="review"
                    rows={4}
                    placeholder="Write about your experience..."
                    className="w-full bg-black/30 border border-dark-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    required
                  />
                </div>

                <div className="md:col-span-12 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-start pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-full text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white transition-colors"
                  >
                    Submit review
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>

        <aside className="w-full lg:w-[320px] shrink-0 min-w-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
              <div className="p-5 sm:p-8 text-center">
                <div className="w-24 h-24 bg-primary-teal rounded-full flex items-center justify-center mx-auto mb-6 overflow-hidden">
                  <Image
                    src="/cafs-logo.png"
                    alt="CAFS logo"
                    width={96}
                    height={96}
                  />
                </div>
                <h2 className="text-lg font-bold leading-tight mb-6">
                  Child Adolescent and Family Services
                </h2>
                <button
                  type="button"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-lg transition-colors mb-6"
                >
                  Book
                </button>
                <div className="space-y-4 text-xs">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 text-gray-400 hover:text-white mx-auto"
                  >
                    <ClockIcon className="w-4 h-4" />
                    <span>Open · Closes at 5 PM</span>
                    <ChevronDownIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="bg-black/40 border-t border-dark-border p-4 text-center">
                <button
                  type="button"
                  className="text-xs font-medium flex items-center justify-center gap-1 mx-auto text-gray-400 hover:text-white"
                >
                  Contact us <ChevronDownIcon className="w-3 h-3" />
                </button>
              </div>
            </div>
            <Link
              href="/appointments"
              className="flex w-full items-center justify-center bg-teal-600 hover:bg-[#2b2b2b] border border-dark-border text-white font-semibold py-3 rounded-xl transition-colors"
            >
              View all appointments
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}

function ServiceButton({
  serviceName,
  title,
  meta,
}: {
  serviceName: string;
  title: React.ReactNode;
  meta: string;
}) {
  const href = `/book?service=${encodeURIComponent(serviceName)}&meta=${encodeURIComponent(meta)}`;
  return (
    <Link
      href={href}
      className="w-full text-left bg-dark-card p-4 sm:p-5 rounded-xl border border-dark-border flex justify-between items-center gap-3 group hover:border-gray-500 transition-all"
    >
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-sm break-words">{title}</h3>
        <p className="text-xs text-gray-500 mt-1">{meta}</p>
      </div>
      <ChevronRightIcon className="w-5 h-5 shrink-0 text-gray-600 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.324v-21.35c0-.732-.593-1.325-1.325-1.325z" />
    </svg>
  );
}
