import script from './agent-script.json'

export type Provider = 'gemini' | 'elevenlabs'

export type ScriptStep = {
  id: string
  prompt: string
  expectedAnswers: string[]
}

export type StepEvaluation = {
  accepted: boolean
  isComplete: boolean
  feedback: string
  nextStepIndex: number
  nextPrompt: string
}

const normalizedScript = script as ScriptStep[]

const normalizeAnswer = (value: string) => value.trim().toLowerCase()

const answerMatches = (expectedAnswers: string[], answer: string) => {
  if (expectedAnswers.length === 0) {
    return normalizeAnswer(answer).length > 0
  }

  const normalizedAnswer = normalizeAnswer(answer)
  return expectedAnswers.some((expectedAnswer) => normalizedAnswer.includes(normalizeAnswer(expectedAnswer)))
}

export const getScript = () => normalizedScript

export const evaluateStep = (currentStepIndex: number, answer: string): StepEvaluation => {
  const safeStepIndex = Math.min(Math.max(currentStepIndex, 0), normalizedScript.length - 1)
  const currentStep = normalizedScript[safeStepIndex]
  const accepted = answerMatches(currentStep.expectedAnswers, answer)

  if (!accepted) {
    return {
      accepted: false,
      isComplete: false,
      feedback: `Let's try that again. ${currentStep.prompt}`,
      nextStepIndex: safeStepIndex,
      nextPrompt: currentStep.prompt,
    }
  }

  const nextStepIndex = safeStepIndex + 1
  const nextStep = normalizedScript[nextStepIndex]

  if (!nextStep) {
    return {
      accepted: true,
      isComplete: true,
      feedback: 'Great work. You completed the scripted flow.',
      nextStepIndex: safeStepIndex,
      nextPrompt: '',
    }
  }

  return {
    accepted: true,
    isComplete: false,
    feedback: `Thanks. Let's move on. ${nextStep.prompt}`,
    nextStepIndex,
    nextPrompt: nextStep.prompt,
  }
}
