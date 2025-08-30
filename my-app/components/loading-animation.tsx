"use client"

export function LoadingAnimation() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* Soccer Ball Animation */}
        <div className="relative">
          <div className="w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-slate-300 rounded-full relative overflow-hidden animate-spin">
              <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-800 rounded-full"></div>
              {/* Soccer ball pattern */}
              <div className="absolute top-2 left-2 w-1 h-1 bg-slate-800 rounded-full"></div>
              <div className="absolute top-2 right-2 w-1 h-1 bg-slate-800 rounded-full"></div>
              <div className="absolute bottom-2 left-2 w-1 h-1 bg-slate-800 rounded-full"></div>
              <div className="absolute bottom-2 right-2 w-1 h-1 bg-slate-800 rounded-full"></div>
            </div>
          </div>

          {/* Bouncing effect */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full opacity-30 animate-pulse"></div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Updating Table Data</h2>
          <p className="text-slate-600">Fetching the latest football matches data...</p>

          {/* Progress dots */}
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
