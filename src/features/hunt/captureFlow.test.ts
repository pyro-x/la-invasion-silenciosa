import {
  captureFlowReducer,
  initialCaptureFlowState,
  isStepComplete,
  type CaptureFlowAction,
  type CaptureFlowState,
  type CapturePhoto,
  type CapturePosition,
} from './captureFlow'

const PHOTO: CapturePhoto = {
  blob: new Blob(['jpeg-bytes'], { type: 'image/jpeg' }),
  previewUrl: 'blob:test-preview',
}

// Inside the La Latina submit bbox (Cava Baja).
const POSITION: CapturePosition = { lat: 40.4118, lng: -3.7105, accuracyM: 12, source: 'gps' }

// Well outside the neighborhood (Sol direction).
const OUTSIDE_POSITION: CapturePosition = {
  lat: 40.4169,
  lng: -3.7035,
  accuracyM: null,
  source: 'manual',
}

function run(actions: CaptureFlowAction[], from: CaptureFlowState = initialCaptureFlowState) {
  return actions.reduce(captureFlowReducer, from)
}

const TO_REVIEW: CaptureFlowAction[] = [
  { type: 'PHOTO_READY', photo: PHOTO },
  { type: 'NEXT' },
  { type: 'SPECIES_SELECTED', speciesId: 'candadin' },
  { type: 'NEXT' },
  { type: 'POSITION_CHANGED', position: POSITION },
  { type: 'NEXT' },
]

describe('captureFlowReducer', () => {
  it('starts at the photo step with the privacy toggle on and nothing collected', () => {
    expect(initialCaptureFlowState.step).toBe(0)
    expect(initialCaptureFlowState.photo).toBeNull()
    expect(initialCaptureFlowState.speciesId).toBeNull()
    expect(initialCaptureFlowState.position).toBeNull()
    expect(initialCaptureFlowState.approxOnly).toBe(true)
    expect(initialCaptureFlowState.submitError).toBeNull()
  })

  it('does not advance past the photo step without a processed photo', () => {
    expect(run([{ type: 'NEXT' }]).step).toBe(0)
    expect(run([{ type: 'PHOTO_READY', photo: PHOTO }, { type: 'NEXT' }]).step).toBe(1)
  })

  it('clearing the photo marks the step incomplete again', () => {
    const state = run([{ type: 'PHOTO_READY', photo: PHOTO }, { type: 'PHOTO_CLEARED' }])
    expect(state.photo).toBeNull()
    expect(isStepComplete(state, 0)).toBe(false)
  })

  it('does not advance past the species step without a selection', () => {
    const atSpecies = run([{ type: 'PHOTO_READY', photo: PHOTO }, { type: 'NEXT' }])
    expect(run([{ type: 'NEXT' }], atSpecies).step).toBe(1)
    const selected = run([{ type: 'SPECIES_SELECTED', speciesId: 'candadin' }], atSpecies)
    expect(run([{ type: 'NEXT' }], selected).step).toBe(2)
  })

  it('does not advance past the location step without a position', () => {
    const atLocation = run(TO_REVIEW.slice(0, 4))
    expect(atLocation.step).toBe(2)
    expect(run([{ type: 'NEXT' }], atLocation).step).toBe(2)
  })

  it('does not advance with a position outside La Latina (server would reject it)', () => {
    const atLocation = run(TO_REVIEW.slice(0, 4))
    const outside = run([{ type: 'POSITION_CHANGED', position: OUTSIDE_POSITION }], atLocation)
    expect(isStepComplete(outside, 2)).toBe(false)
    expect(run([{ type: 'NEXT' }], outside).step).toBe(2)
    const backInside = run([{ type: 'POSITION_CHANGED', position: POSITION }], outside)
    expect(run([{ type: 'NEXT' }], backInside).step).toBe(3)
  })

  it('toggles the approximate-location switch only on the location step', () => {
    expect(run([{ type: 'APPROX_TOGGLED' }]).approxOnly).toBe(true)
    const atLocation = run(TO_REVIEW.slice(0, 4))
    expect(run([{ type: 'APPROX_TOGGLED' }], atLocation).approxOnly).toBe(false)
    expect(
      run([{ type: 'APPROX_TOGGLED' }, { type: 'APPROX_TOGGLED' }], atLocation).approxOnly,
    ).toBe(true)
  })

  it('going back to a previous step keeps the collected data', () => {
    const atReview = run(TO_REVIEW)
    expect(atReview.step).toBe(3)
    const back = run([{ type: 'STEP_SELECTED', step: 1 }], atReview)
    expect(back.step).toBe(1)
    expect(back.photo).toBe(PHOTO)
    expect(back.speciesId).toBe('candadin')
    expect(back.position).toBe(POSITION)
    expect(run([{ type: 'NEXT' }, { type: 'NEXT' }], back).step).toBe(3)
  })

  it('never jumps forward through the step indicator', () => {
    const state = run([
      { type: 'PHOTO_READY', photo: PHOTO },
      { type: 'STEP_SELECTED', step: 2 },
    ])
    expect(state.step).toBe(0)
  })

  it('submits only from the review step and completes once', () => {
    expect(run([{ type: 'SUBMIT_STARTED' }]).sending).toBe(false)
    const atReview = run(TO_REVIEW)
    const sending = run([{ type: 'SUBMIT_STARTED' }], atReview)
    expect(sending.sending).toBe(true)
    expect(run([{ type: 'SUBMIT_STARTED' }], sending)).toBe(sending)
    const done = run([{ type: 'SUBMIT_SUCCEEDED' }], sending)
    expect(done.done).toBe(true)
    expect(done.sending).toBe(false)
    expect(run([{ type: 'NEXT' }], done)).toBe(done)
  })

  it('a failed submit keeps every collected field and records the message', () => {
    const failed = run(
      [
        { type: 'SUBMIT_STARTED' },
        { type: 'SUBMIT_FAILED', message: 'Has llegado al límite de hoy' },
      ],
      run(TO_REVIEW),
    )
    expect(failed.sending).toBe(false)
    expect(failed.done).toBe(false)
    expect(failed.submitError).toBe('Has llegado al límite de hoy')
    expect(failed.photo).toBe(PHOTO)
    expect(failed.speciesId).toBe('candadin')
    expect(failed.position).toBe(POSITION)
    // Retry clears the error while it is in flight.
    expect(run([{ type: 'SUBMIT_STARTED' }], failed).submitError).toBeNull()
  })

  it('navigating away from the review step clears the error message', () => {
    const failed = run(
      [{ type: 'SUBMIT_STARTED' }, { type: 'SUBMIT_FAILED', message: 'fallo' }],
      run(TO_REVIEW),
    )
    expect(run([{ type: 'STEP_SELECTED', step: 0 }], failed).submitError).toBeNull()
  })

  it('resets to the initial state', () => {
    const done = run([{ type: 'SUBMIT_STARTED' }, { type: 'SUBMIT_SUCCEEDED' }], run(TO_REVIEW))
    expect(done.done).toBe(true)
    expect(run([{ type: 'RESET' }], done)).toEqual(initialCaptureFlowState)
  })
})
