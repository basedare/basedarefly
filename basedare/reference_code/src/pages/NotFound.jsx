import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        <motion.img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fdae09d2124933d726e89a/bef958255_image.png"
          alt="Lost Bear"
          className="w-48 h-48 mx-auto mb-8"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
          404
        </h1>
        
        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-bold">Wrong chain?</span>
        </div>
        
        <p className="text-gray-400 text-lg mb-8">
          This page got lost in the blockchain. Maybe switch to Base? 🔗
        </p>
        
        <Link to={createPageUrl("Home")}>
          <Button className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-orange-500 hover:to-yellow-400 text-black font-black px-8 py-6 text-lg">
            <Home className="w-5 h-5 mr-2" />
            Back to Daring
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}