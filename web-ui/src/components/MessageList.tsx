import { motion } from 'framer-motion'
import type { Message } from '@/types'
import { MessageItem } from './MessageItem'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="flex flex-col gap-0.5 md:gap-1 py-2 md:py-4 px-2 md:px-4">
      {messages.map((message, index) => (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            delay: index === messages.length - 1 ? 0 : 0.05,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <MessageItem message={message} isLast={index === messages.length - 1} />
        </motion.div>
      ))}
    </div>
  )
}
