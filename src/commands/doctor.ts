import { runDoctor as doctorRunDoctor, printDoctorResults } from '../doctor.js'

export async function runDoctor(): Promise<void> {
  const results = await doctorRunDoctor()
  printDoctorResults(results)

  const hasError = results.some((r) => r.status === 'error')
  if (hasError) {
    process.exit(1)
  }
}
