import React from "react";
import { motion } from "framer-motion";
import { Skull, X } from "lucide-react";

const SHAME_ENTRIES = [
  { streamer: "@xQc", dare: "Couldn't finish Carolina Reaper", lost: 2500, time: "2 days ago" },
  { streamer: "@Ninja", dare: "Failed 24hr no sleep challenge at 18hrs", lost: 5000, time: "3 days ago" },
  { streamer: "@DrDisrespect", dare: "Refused ice bath dare", lost: 1000, time: "5 days ago" },
  { streamer: "@Mizkif", dare: "Couldn't eat 10 hot wings", lost: 750, time: "1 week ago" },
];

export default function HallOfShame() {
  return (
    <div className="py-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-full px-4 py-2 mb-4">
          <Skull className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-400 font-bold">HALL OF SHAME</span>
        </div>
        <h2 className="text-3xl font-black text-white">
          They tried. They failed. They paid.
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto px-4">
        {SHAME_ENTRIES.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold">{entry.streamer}</p>
              <p className="text-gray-400 text-sm">{entry.dare}</p>
            </div>
            <div className="text-right">
              <p className="text-red-400 font-bold">-{entry.lost} $XDARE</p>
              <p className="text-gray-500 text-xs">{entry.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}