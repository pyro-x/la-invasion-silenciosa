// State machine of the 4-step capture flow (prototype screens1.jsx HuntFlow):
// photo → species → location → review, plus the sending/done submit phase.
// Forward moves are validated per step; going back never loses data.
import type { SpeciesId } from '@/types/species'

export type CaptureStep = 0 | 1 | 2 | 3

export type CaptureFlowState = {
  step: CaptureStep
  photoTaken: boolean
  speciesId: SpeciesId | null
  /** Privacy toggle of the location step: store only an approximate location. */
  approxOnly: boolean
  sending: boolean
  done: boolean
}

export const initialCaptureFlowState: CaptureFlowState = {
  step: 0,
  photoTaken: false,
  speciesId: null,
  approxOnly: true,
  sending: false,
  done: false,
}

export type CaptureFlowAction =
  | { type: 'PHOTO_TAKEN' }
  | { type: 'PHOTO_RETAKEN' }
  | { type: 'SPECIES_SELECTED'; speciesId: SpeciesId }
  | { type: 'APPROX_TOGGLED' }
  | { type: 'NEXT' }
  | { type: 'STEP_SELECTED'; step: CaptureStep }
  | { type: 'SUBMIT_STARTED' }
  | { type: 'SUBMIT_SUCCEEDED' }
  | { type: 'RESET' }

export function isStepComplete(state: CaptureFlowState, step: CaptureStep): boolean {
  switch (step) {
    case 0:
      return state.photoTaken
    case 1:
      return state.speciesId !== null
    case 2:
      return true
    case 3:
      return state.done
  }
}

export function captureFlowReducer(
  state: CaptureFlowState,
  action: CaptureFlowAction,
): CaptureFlowState {
  switch (action.type) {
    case 'PHOTO_TAKEN':
      return state.step === 0 ? { ...state, photoTaken: true } : state
    case 'PHOTO_RETAKEN':
      return state.step === 0 ? { ...state, photoTaken: false } : state
    case 'SPECIES_SELECTED':
      return state.step === 1 ? { ...state, speciesId: action.speciesId } : state
    case 'APPROX_TOGGLED':
      return state.step === 2 ? { ...state, approxOnly: !state.approxOnly } : state
    case 'NEXT': {
      if (state.sending || state.done || state.step === 3) return state
      if (!isStepComplete(state, state.step)) return state
      return { ...state, step: (state.step + 1) as CaptureStep }
    }
    case 'STEP_SELECTED': {
      if (state.sending || state.done || action.step >= state.step) return state
      return { ...state, step: action.step }
    }
    case 'SUBMIT_STARTED':
      return state.step === 3 && !state.sending && !state.done ? { ...state, sending: true } : state
    case 'SUBMIT_SUCCEEDED':
      return state.sending ? { ...state, sending: false, done: true } : state
    case 'RESET':
      return initialCaptureFlowState
  }
}
