import BookingWizard from "@/components/BookingWizard";

export const metadata = { title: "Book a Cleaning | Gulf Coast ProClean" };

export default function BookPage({ searchParams }) {
  const initialService = searchParams?.service || "";

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-shallow">Request &amp; match</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink sm:text-4xl">
          Get matched with your ProClean pro
        </h1>
        <p className="mt-3 text-inkSoft">
          Answer a few quick questions and we'll match you with an
          available, background-checked cleaner near you.
        </p>
      </div>
      <BookingWizard initialService={initialService} />
    </div>
  );
}
