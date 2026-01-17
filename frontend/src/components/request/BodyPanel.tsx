import { Textarea } from '@mantine/core'

interface BodyPanelProps {
  body: string
  onChange: (body: string) => void
}

export function BodyPanel({ body, onChange }: BodyPanelProps) {
  return (
    <Textarea
      placeholder="Request body (JSON)"
      value={body}
      onChange={(e) => onChange(e.currentTarget.value)}
      minRows={12}
      maxRows={20}
      styles={{ input: { fontFamily: 'monospace' } }}
    />
  )
}
