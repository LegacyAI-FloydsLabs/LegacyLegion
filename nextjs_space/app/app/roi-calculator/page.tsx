import { ROICalculator } from './_components/roi-calculator'

export const dynamic = 'force-static'

export default function ROICalculatorPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">ROI Calculator</h1>
        <p className="text-muted-foreground mt-1">Show prospects exactly how LegacyAI pays for itself — perfect for live demos.</p>
      </div>
      <ROICalculator />
    </div>
  )
}
