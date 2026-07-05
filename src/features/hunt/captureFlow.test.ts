import {
  captureFlowReducer,
  initialCaptureFlowState,
  isStepComplete,
  type CaptureFlowAction,
  type CaptureFlowState,
} from './captureFlow'

function run(actions: CaptureFlowAction[], from: CaptureFlowState = initialCaptureFlowState) {
  return actions.reduce(captureFlowReducer, from)
}

describe('captureFlowReducer', () => {
  it('starts at the photo step with the privacy toggle on', () => {
    expect(initialCaptureFlowState.step).toBe(0)
    expect(initialCaptureFlowState.photoTaken).toBe(false)
    expect(initialCaptureFlowState.speciesId).toBeNull()
    expect(initialCaptureFlowState.approxOnly).toBe(true)
  })

  it('does not advance past the photo step without a photo', () => {
    expect(run([{ type: 'NEXT' }]).step).toBe(0)
    expect(run([{ type: 'PHOTO_TAKEN' }, { type: 'NEXT' }]).step).toBe(1)
  })

  it('retaking the photo marks the step incomplete again', () => {
    const state = run([{ type: 'PHOTO_TAKEN' }, { type: 'PHOTO_RETAKEN' }])
    expect(state.photoTaken).toBe(false)
    expect(isStepComplete(state, 0)).toBe(false)
  })

  it('does not advance past the species step without a selection', () => {
    const atSpecies = run([{ type: 'PHOTO_TAKEN' }, { type: 'NEXT' }])
    expect(run([{ type: 'NEXT' }], atSpecies).step).toBe(1)
    const selected = run([{ type: 'SPECIES_SELECTED', speciesId: 'candadin' }], atSpecies)
    expect(run([{ type: 'NEXT' }], selected).step).toBe(2)
  })

  it('toggles the approximate-location switch only on the location step', () => {
    expect(run([{ type: 'APPROX_TOGGLED' }]).approxOnly).toBe(true)
    const atLocation = run([
      { type: 'PHOTO_TAKEN' },
      { type: 'NEXT' },
      { type: 'SPECIES_SELECTED', speciesId: 'keymon' },
      { type: 'NEXT' },
    ])
    expect(run([{ type: 'APPROX_TOGGLED' }], atLocation).approxOnly).toBe(false)
    expect(
      run([{ type: 'APPROX_TOGGLED' }, { type: 'APPROX_TOGGLED' }], atLocation).approxOnly,
    ).toBe(true)
  })

  it('going back to a previous step keeps the collected data', () => {
    const atReview = run([
      { type: 'PHOTO_TAKEN' },
      { type: 'NEXT' },
      { type: 'SPECIES_SELECTED', speciesId: 'turistox' },
      { type: 'NEXT' },
      { type: 'NEXT' },
    ])
    expect(atReview.step).toBe(3)
    const back = run([{ type: 'STEP_SELECTED', step: 1 }], atReview)
    expect(back.step).toBe(1)
    expect(back.photoTaken).toBe(true)
    expect(back.speciesId).toBe('turistox')
    expect(run([{ type: 'NEXT' }, { type: 'NEXT' }], back).step).toBe(3)
  })

  it('never jumps forward through the step indicator', () => {
    const state = run([{ type: 'PHOTO_TAKEN' }, { type: 'STEP_SELECTED', step: 2 }])
    expect(state.step).toBe(0)
  })

  it('submits only from the review step and completes once', () => {
    expect(run([{ type: 'SUBMIT_STARTED' }]).sending).toBe(false)
    const atReview = run([
      { type: 'PHOTO_TAKEN' },
      { type: 'NEXT' },
      { type: 'SPECIES_SELECTED', speciesId: 'checkinchu' },
      { type: 'NEXT' },
      { type: 'NEXT' },
    ])
    const sending = run([{ type: 'SUBMIT_STARTED' }], atReview)
    expect(sending.sending).toBe(true)
    expect(run([{ type: 'SUBMIT_STARTED' }], sending)).toBe(sending)
    const done = run([{ type: 'SUBMIT_SUCCEEDED' }], sending)
    expect(done.done).toBe(true)
    expect(done.sending).toBe(false)
    expect(run([{ type: 'NEXT' }], done)).toBe(done)
  })

  it('resets to the initial state', () => {
    const done = run([
      { type: 'PHOTO_TAKEN' },
      { type: 'NEXT' },
      { type: 'SPECIES_SELECTED', speciesId: 'candadin' },
      { type: 'NEXT' },
      { type: 'NEXT' },
      { type: 'SUBMIT_STARTED' },
      { type: 'SUBMIT_SUCCEEDED' },
    ])
    expect(done.done).toBe(true)
    expect(run([{ type: 'RESET' }], done)).toEqual(initialCaptureFlowState)
  })
})
