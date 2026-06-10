export default function SiteFooter() {
  return (
    <footer className="relative z-[60] w-full bg-white py-16 px-6 text-gray-900 mt-auto">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="flex justify-center mb-8" />
        <h2 className="text-3xl md:text-4xl font-bold">Contact us</h2>
        <p className="text-gray-500 max-w-md mx-auto">
        Call us 076 406 7004
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-lg mx-auto">
          <input
            className="w-full px-6 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-neutral-500 outline-none transition-all"
            placeholder="Enter your email"
            type="email"
          />
          <button
            type="button"
            className="whitespace-nowrap bg-white border-2 border-gray-900 px-6 py-3 font-bold rounded-lg hover:bg-gray-900 hover:text-white transition-all"
          >
            Get in touch
          </button>
        </div>
      </div>
    </footer>
  );
}

