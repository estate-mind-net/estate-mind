import { useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'

interface Task {
  id: string
  label: string
  done: boolean
}

interface TasksPanelProps {
  initialTasks?: Task[]
  onTasksChange?: (tasks: Task[]) => void
}

export function TasksPanel({ initialTasks = [], onTasksChange }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  const toggle = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    setTasks(updated)
    onTasksChange?.(updated)
  }

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-display text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        Tasks
      </h3>
      {tasks.length === 0 ? (
        <p className="text-xs text-foreground/40 italic">No tasks yet.</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => toggle(task.id)}
              className="flex items-center gap-2.5 w-full py-1.5 text-left hover:bg-muted/50 rounded px-1 transition-colors"
            >
              <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                task.done ? 'bg-foreground border-foreground' : 'border-foreground/30'
              }`}>
                {task.done && <Check className="h-3 w-3 text-background" weight="bold" />}
              </span>
              <span className={`text-sm ${task.done ? 'line-through text-foreground/40' : 'text-foreground/80'}`}>
                {task.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
