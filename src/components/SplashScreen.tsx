import { motion } from 'framer-motion'

interface SplashScreenProps {
  onLoaded: () => void;
}

export default function SplashScreen({ onLoaded }: SplashScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0b0d]"
    >
      <div className="relative">
        {/* Elegant Pulse Ring */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-white rounded-full blur-2xl"
        />

        {/* Logo Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-32 h-32 rounded-full p-1 bg-white/[0.03] border border-white/10 shadow-2xl overflow-hidden"
        >
            <motion.img
              src="logo.jpg"
              alt="Chiyo"
              className="w-full h-full object-contain rounded-full"
              onLoad={onLoaded}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                onLoaded();
              }}
              animate={{
                scale: [1, 1.03, 1],
              }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Subtle Text Initials [Optional/Fallback] */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap"
        >
          Initializing Core
        </motion.div>
      </div>
    </motion.div>
  )
}
