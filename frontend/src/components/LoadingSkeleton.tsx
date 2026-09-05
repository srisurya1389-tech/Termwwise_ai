
export default function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-[#0E0E14] border border-[#161720] rounded-2xl p-4 space-y-3">
            <div className="h-3 bg-[#1C1D26] rounded w-2/3"></div>
            <div className="h-6 bg-[#1C1D26] rounded w-1/2"></div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Card */}
          <div className="h-80 bg-[#0E0E14] border border-[#161720] rounded-2xl p-6">
            <div className="h-4 bg-[#1C1D26] rounded w-1/4 mb-6"></div>
            <div className="h-56 bg-[#12121A] rounded"></div>
          </div>

          {/* Table */}
          <div className="bg-[#0E0E14] border border-[#161720] rounded-2xl p-6 space-y-4">
            <div className="h-4 bg-[#1C1D26] rounded w-1/3"></div>
            <div className="space-y-3 pt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-[#12121A] rounded"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Card */}
        <div className="h-[500px] bg-[#0E0E14] border border-[#161720] rounded-2xl p-6 space-y-4">
          <div className="h-4 bg-[#1C1D26] rounded w-1/2"></div>
          <div className="h-3 bg-[#1A1B24] rounded w-full"></div>
          <div className="h-3 bg-[#1A1B24] rounded w-5/6"></div>
          <div className="h-3 bg-[#1A1B24] rounded w-4/5"></div>
          <div className="h-36 bg-[#12121A] rounded pt-2"></div>
        </div>
      </div>
    </div>
  );
}
