import * as p from '@clack/prompts'

export async function selectProviders(allProviders: string[], detected: string[]): Promise<string[]> {
  const selected = await p.multiselect({
    message: 'Select AI tools to configure:',
    options: allProviders.map((id) => ({
      value: id,
      label: id,
      hint: detected.includes(id) ? 'detected' : undefined,
    })),
    required: true,
  })

  if (p.isCancel(selected)) {
    p.cancel('Cancelled')
    process.exit(0)
  }

  return selected
}

export async function confirmAction(message: string): Promise<boolean> {
  const result = await p.confirm({
    message,
    initialValue: false,
  })

  if (p.isCancel(result)) {
    p.cancel('Cancelled')
    process.exit(0)
  }

  return result
}

export async function confirmForce(): Promise<boolean> {
  return confirmAction('Conflicting files detected. Use --force to replace them?')
}

export async function confirmBackup(): Promise<boolean> {
  return confirmAction('Back up conflicting files before replacing?')
}

export async function intro(message: string): Promise<void> {
  p.intro(message)
}

export async function outro(message: string): Promise<void> {
  p.outro(message)
}
