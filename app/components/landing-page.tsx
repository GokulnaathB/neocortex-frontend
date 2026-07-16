import { Show, SignUpButton } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <Show when="signed-out">
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] px-6 text-center bg-linear-to-b from-white via-violet-50 to-violet-100">
        {/* Small badge/eyebrow */}
        <span className="px-4 py-1 mb-6 text-sm font-medium text-violet-700 bg-violet-100 rounded-full">
          Powered by AI
        </span>

        {/* Headline with gradient text */}
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-4xl">
          Chat with your PDFs.{" "}
          <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            Get answers, not searches.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10">
          Neocortex turns your documents into conversations. Upload any PDF, ask
          anything, and get instant answers grounded in your files — complete
          with sources, summaries, and smart follow-ups.
        </p>

        {/* CTA */}
        <SignUpButton>
          <button className="bg-linear-to-r from-indigo-600 to-violet-600 text-white text-lg font-semibold px-8 py-4 rounded-full hover:shadow-xl hover:scale-105 transition cursor-pointer">
            Get Started Free
          </button>
        </SignUpButton>

        <p className="text-sm text-gray-400 mt-4">No credit card required.</p>
      </div>
    </Show>
  );
}
