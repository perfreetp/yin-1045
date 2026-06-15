import { useState, useEffect } from 'react'
import { Wind, Users, Route, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RandomEvent, RandomEventType } from '@/types'

interface EventNotificationProps {
  event: RandomEvent
  onRespond: (choice: string) => void
}

const eventIcons: Record<RandomEventType, typeof Wind> = {
  gust: Wind,
  crowd: Users,
  road_closed: Route,
  rush_order: Zap,
}

const eventChoices: Record<RandomEventType, string[]> = {
  gust: ['暂停作业', '降低高度继续'],
  crowd: ['等待人群散开', '绕飞'],
  road_closed: ['绕行', '等待解除'],
  rush_order: ['接受加单', '拒绝'],
}

export default function EventNotification({ event, onRespond }: EventNotificationProps) {
  const [remaining, setRemaining] = useState(event.duration)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setVisible(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [event.duration])

  const Icon = eventIcons[event.type]
  const choices = eventChoices[event.type]
  const progress = (remaining / event.duration) * 100

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-80 rounded-lg bg-white shadow-lg border-l-4"
          style={{ borderLeftColor: '#EF6C00' }}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full" style={{ backgroundColor: '#FFF3E0' }}>
                <Icon className="w-5 h-5" style={{ color: '#EF6C00' }} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{event.description}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              {choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => {
                    setVisible(false)
                    onRespond(choice)
                  }}
                  className="flex-1 px-3 py-2 text-xs font-medium rounded-md text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#1B5E20' }}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>

          <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
            <div
              className="h-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%`, backgroundColor: '#EF6C00' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
