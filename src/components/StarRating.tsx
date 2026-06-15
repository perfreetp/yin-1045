import { Star } from 'lucide-react'
import { motion } from 'framer-motion'

interface StarRatingProps {
  stars?: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
}

function StarRating({ stars, count, size = 'md', animated = false }: StarRatingProps) {
  const starCount = stars ?? count ?? 0
  const sizeClass = sizeMap[size]

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => {
        const filled = i <= starCount
        const star = (
          <Star
            key={i}
            className={`${sizeClass} ${filled ? 'fill-current' : ''}`}
            style={{ color: filled ? '#F9A825' : '#9CA3AF' }}
          />
        )

        if (animated && filled) {
          return (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 15,
                delay: (i - 1) * 0.3,
              }}
            >
              {star}
            </motion.div>
          )
        }

        return <div key={i}>{star}</div>
      })}
    </div>
  )
}

export default StarRating
export { StarRating }
