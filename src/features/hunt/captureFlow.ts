// State machine of the 4-step capture flow (LCHP-14, real backend):
// photo → species → location → review, plus the sending/failed/done submit
// phase. Forward moves are validated per step; going back never loses data;
// a failed submit keeps everything (retry is just pressing send again).
import { isWithinLaLatina } from '@/lib/geo'
import type { SpeciesId } from '@/types/species'

export type CaptureStep = 0 | 1 | 2 | 3

/** Processed, EXIF-free photo (src/lib/photo.ts) plus its preview URL. */
export type CapturePhoto = {
  blob: Blob
  previewUrl: string
}

/**
 * Exact position being submitted (always the picker map's center). The
 * server stores it privately and snaps the public one to the privacy grid;
 * the client never rounds (D-049).
 */
export type CapturePosition = {
  lat: number
  lng: number
  /** GPS accuracy in meters; null once the user adjusts the pin manually. */
  accuracyM: number | null
  source: 'gps' | 'manual'
}

export type CaptureFlowState = {
  step: CaptureStep
  photo: CapturePhoto | null
  speciesId: SpeciesId | null
  position: CapturePosition | null
  /** Informational privacy toggle of the location step. */
  approxOnly: boolean
  sending: boolean
  done: boolean
  /** Spanish message from a failed submit; cleared on retry or navigation. */
  submitError: string | null
}

export const initialCaptureFlowState: CaptureFlowState = {
  step: 0,
  photo: null,
  speciesId: null,
  position: null,
  approxOnly: true,
  sending: false,
  done: false,
  submitError: null,
}

export type CaptureFlowAction =
  | { type: 'PHOTO_READY'; photo: CapturePhoto }
  | { type: 'PHOTO_CLEARED' }
  | { type: 'SPECIES_SELECTED'; speciesId: SpeciesId }
  | { type: 'POSITION_CHANGED'; position: CapturePosition }
  | { type: 'APPROX_TOGGLED' }
  | { type: 'NEXT' }
  | { type: 'STEP_SELECTED'; step: CaptureStep }
  | { type: 'SUBMIT_STARTED' }
  | { type: 'SUBMIT_SUCCEEDED' }
  | { type: 'SUBMIT_FAILED'; message: string }
  | { type: 'RESET' }

export function isStepComplete(state: CaptureFlowState, step: CaptureStep): boolean {
  switch (step) {
    case 0:
      return state.photo !== null
    case 1:
      return state.speciesId !== null
    case 2:
      return state.position !== null && isWithinLaLatina(state.position.lat, state.position.lng)
    case 3:
      return state.done
  }
}

export function captureFlowReducer(
  state: CaptureFlowState,
  action: CaptureFlowAction,
): CaptureFlowState {
  switch (action.type) {
    case 'PHOTO_READY':
      return state.step === 0 ? { ...state, photo: action.photo } : state
    case 'PHOTO_CLEARED':
      return state.step === 0 ? { ...state, photo: null } : state
    case 'SPECIES_SELECTED':
      return state.step === 1 ? { ...state, speciesId: action.speciesId } : state
    case 'POSITION_CHANGED':
      return state.step === 2 ? { ...state, position: action.position } : state
    case 'APPROX_TOGGLED':
      return state.step === 2 ? { ...state, approxOnly: !state.approxOnly } : state
    case 'NEXT': {
      if (state.sending || state.done || state.step === 3) return state
      if (!isStepComplete(state, state.step)) return state
      return { ...state, step: (state.step + 1) as CaptureStep, submitError: null }
    }
    case 'STEP_SELECTED': {
      if (state.sending || state.done || action.step >= state.step) return state
      return { ...state, step: action.step, submitError: null }
    }
    case 'SUBMIT_STARTED':
      return state.step === 3 && !state.sending && !state.done
        ? { ...state, sending: true, submitError: null }
        : state
    case 'SUBMIT_SUCCEEDED':
      return state.sending ? { ...state, sending: false, done: true } : state
    case 'SUBMIT_FAILED':
      return state.sending ? { ...state, sending: false, submitError: action.message } : state
    case 'RESET':
      return initialCaptureFlowState
  }
}
